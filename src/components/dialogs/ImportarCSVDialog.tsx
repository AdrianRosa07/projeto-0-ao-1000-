import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/lib/portfolio-store";
import { toast } from "sonner";
import { Download, Upload, AlertCircle } from "lucide-react";

interface ImportarCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de possíveis nomes de colunas (normalizado para lowercase)
const COLUNAS_TICKER = ["ticker", "codigo", "código", "ativo", "symbol", "simbolo", "símbolo", "codigo de negociacao"];
const COLUNAS_QTD = ["quantidade", "qtd", "qty", "qtde"];
const COLUNAS_PM = ["preço médio", "preco medio", "preço medio", "preco médio", "pm", "preco_medio", "preço_medio", "custo medio", "custo médio", "preco medio unitario", "preço médio unitário", "preço", "preco"];
const COLUNAS_DATA = ["data", "data do negocio", "data do negócio", "data da operação"];
const COLUNAS_TIPO = ["tipo", "tipo de movimentação", "tipo de movimentacao", "operação", "operacao", "c/v"];

interface CsvRowRaw {
  [key: string]: string;
}

interface CsvRowNormalized {
  ticker: string;
  quantidade: string;
  precoMedio: string;
  data: string;
  tipo: string;
}

export function ImportarCSVDialog({ open, onOpenChange }: ImportarCSVDialogProps) {
  const { registrarTransacao } = usePortfolio();
  const [parsedData, setParsedData] = useState<CsvRowNormalized[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = "Ticker,Quantidade,Preço Médio\nPETR4,100,32.50\nMXRF11,50,10.20";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_carteira.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeHeaders = (headers: string[]): string[] => {
    return headers.map((h) =>
      h
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/\s+/g, " ")
    );
  };

  const findColumn = (headers: string[], possibleNames: string[]): string | null => {
    const normalizedHeaders = normalizeHeaders(headers);
    const normalizedNames = possibleNames.map((n) =>
      n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedNames.includes(normalizedHeaders[i])) {
        return headers[i]; // retorna o header original
      }
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CsvRowRaw>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows.length === 0) {
          toast.error("O arquivo CSV parece estar vazio.");
          return;
        }

        // Detecta automaticamente as colunas
        const headers = results.meta.fields || [];
        if (!headers.length) {
          toast.error("Não foi possível ler o cabeçalho do CSV.");
          return;
        }

        const tickerCol = findColumn(headers, COLUNAS_TICKER);
        const qtdCol = findColumn(headers, COLUNAS_QTD);
        const pmCol = findColumn(headers, COLUNAS_PM);
        const dataCol = findColumn(headers, COLUNAS_DATA);
        const tipoCol = findColumn(headers, COLUNAS_TIPO);

        if (!tickerCol || !qtdCol || !pmCol) {
          toast.error(
            `Colunas obrigatórias não encontradas. (Encontradas: ${headers.join(", ")})`
          );
          return;
        }

        const validRows: CsvRowNormalized[] = rows
          .filter((row) => row[tickerCol] && row[tickerCol].trim() !== "")
          .map((row) => ({
            ticker: row[tickerCol].trim(),
            quantidade: row[qtdCol]?.trim() || "0",
            precoMedio: row[pmCol]?.trim() || "0",
            data: dataCol && row[dataCol] ? row[dataCol].trim() : "",
            tipo: tipoCol && row[tipoCol] ? row[tipoCol].trim() : "compra",
          }))
          .filter((row) => row.ticker && parseFloat(row.quantidade.replace(",", ".")) > 0);

        if (validRows.length === 0) {
          toast.error("Nenhum ativo válido encontrado no CSV.");
          return;
        }

        setParsedData(validRows);
        toast.success(
          `${validRows.length} ativos lidos! Colunas detectadas: ${tickerCol}, ${qtdCol}, ${pmCol}`
        );
      },
      error: (error) => {
        toast.error("Erro ao ler o arquivo CSV: " + error.message);
      },
    });
  };

  const confirmarImportacao = async () => {
    setIsProcessing(true);
    let importados = 0;

    try {
      for (const row of parsedData) {
        const ticker = row.ticker.trim().toUpperCase();
        // Remove F (mercado fracionário) da B3 para agrupar corretamente
        const cleanTicker = ticker.endsWith("F") ? ticker.slice(0, -1) : ticker;
        const quantidade = parseFloat(row.quantidade.replace(",", "."));
        const precoMedio = parseFloat(row.precoMedio.replace(",", "."));
        
        // Parse da data padrão BR (DD/MM/YYYY) para ISO
        let dataIso = new Date().toISOString().split("T")[0];
        if (row.data) {
          const parts = row.data.split("/");
          if (parts.length === 3) {
            dataIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            // tenta fazer parse normal
            const d = new Date(row.data);
            if (!isNaN(d.getTime())) dataIso = d.toISOString().split("T")[0];
          }
        }

        let tipoOperacao: "compra" | "venda" = "compra";
        if (row.tipo.toLowerCase().includes("v") || row.tipo.toLowerCase().includes("venda")) {
          tipoOperacao = "venda";
        }

        if (cleanTicker && !isNaN(quantidade) && !isNaN(precoMedio) && quantidade > 0) {
          await registrarTransacao({
            ticker: cleanTicker,
            tipo: tipoOperacao,
            quantidade,
            precoUnitario: precoMedio,
            data: dataIso,
            taxas: 0,
            notas: "Importação B3/CSV",
          });
          importados++;
        }
      }

      if (importados > 0) {
        toast.success(`${importados} ativos importados com sucesso!`);
      } else {
        toast.error("Nenhum ativo válido foi encontrado para importação.");
      }
      resetAndClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetAndClose();
        else onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronização via CSV</DialogTitle>
          <DialogDescription>
            Importe múltiplos ativos de uma vez fazendo o upload de uma planilha CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="rounded-xl border border-border/60 bg-elevated p-4 text-sm text-muted-foreground flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="mb-2 text-foreground font-medium">Como formatar seu CSV:</p>
              <p>
                Baixe o modelo abaixo e preencha com seus dados, ou exporte de sua corretora.
                O sistema detecta automaticamente as colunas (aceita variações como:
                <strong> Ticker/Código/Ativo</strong>, <strong> Quantidade/Qtd</strong>,
                <strong> Preço Médio/PM/Custo Médio</strong>).
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                <li>
                  <strong>Ticker</strong>: Código do ativo (ex: PETR4). Reconhece <em>Código de Negociação</em> da B3. (Lotes fracionários como PETR4F serão convertidos para PETR4 automaticamente).
                </li>
                <li>
                  <strong>Quantidade</strong>: Total de cotas compradas/vendidas.
                </li>
                <li>
                  <strong>Preço Médio</strong>: Seu custo/preço por cota. Reconhece <em>Preço</em> da B3.
                </li>
                <li>
                  <strong>Data do Negócio</strong> (Opcional): Formato DD/MM/AAAA.
                </li>
                <li>
                  <strong>Tipo de Movimentação</strong> (Opcional): Compra ou Venda. Padrão: Compra.
                </li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={downloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo (Template)
              </Button>
            </div>
          </div>

          {!parsedData.length ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted/30">
              <Upload className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Selecione o seu arquivo CSV</p>
              <p className="text-xs text-muted-foreground mb-4">Apenas arquivos .csv</p>
              <Button onClick={() => fileInputRef.current?.click()}>Procurar Arquivo</Button>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="font-semibold text-primary">
                  {parsedData.length} ativos lidos com sucesso!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Revise e confirme para adicionar estes ativos (como aportes) à sua carteira atual.
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto rounded border border-border text-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 font-medium">Ticker</th>
                      <th className="p-2 font-medium text-right">Qtd</th>
                      <th className="p-2 font-medium text-right">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono text-xs">{row.ticker}</td>
                        <td className="p-2 text-right">{row.quantidade}</td>
                        <td className="p-2 text-right">{row.precoMedio}</td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-2 text-center text-xs text-muted-foreground italic"
                        >
                          ... e mais {parsedData.length - 5} ativos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={isProcessing}>
            Cancelar
          </Button>
          {parsedData.length > 0 && (
            <Button onClick={confirmarImportacao} disabled={isProcessing}>
              {isProcessing ? "Importando..." : "Confirmar Importação"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
