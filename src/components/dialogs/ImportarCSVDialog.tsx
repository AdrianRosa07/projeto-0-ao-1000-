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

interface CsvRow {
  Ticker: string;
  Quantidade: string;
  "Preço Médio": string;
}

export function ImportarCSVDialog({ open, onOpenChange }: ImportarCSVDialogProps) {
  const { registrarTransacao } = usePortfolio();
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Filtra linhas vazias ou sem Ticker
        const validRows = results.data.filter((row) => row.Ticker && row.Ticker.trim() !== "");
        
        if (validRows.length === 0) {
          toast.error("O arquivo CSV parece estar vazio ou no formato incorreto.");
          return;
        }

        // Verifica se tem as colunas corretas baseando na primeira linha válida
        const firstRow = validRows[0];
        if (!firstRow || !("Ticker" in firstRow) || !("Quantidade" in firstRow) || !("Preço Médio" in firstRow)) {
          toast.error("Colunas inválidas. Certifique-se de usar: Ticker, Quantidade, Preço Médio");
          return;
        }

        setParsedData(validRows);
      },
      error: (error) => {
        toast.error("Erro ao ler o arquivo CSV: " + error.message);
      },
    });
  };

  const confirmarImportacao = () => {
    setIsProcessing(true);
    let importados = 0;
    
    setTimeout(() => {
      try {
        parsedData.forEach((row) => {
          const ticker = row.Ticker.trim().toUpperCase();
          const quantidade = parseFloat(row.Quantidade.toString().replace(",", "."));
          const precoMedio = parseFloat(row["Preço Médio"].toString().replace(",", "."));

          if (ticker && !isNaN(quantidade) && !isNaN(precoMedio) && quantidade > 0) {
            registrarTransacao({
              ticker,
              tipo: "compra", // Tratando como aporte inicial
              quantidade,
              precoUnitario: precoMedio,
              data: new Date().toISOString().split("T")[0] || "", // Data de hoje
              taxas: 0,
              notas: "Importação via CSV",
            });
            importados++;
          }
        });

        toast.success(`${importados} ativos importados com sucesso!`);
        resetAndClose();
      } catch (error) {
        toast.error("Ocorreu um erro durante a importação.");
      } finally {
        setIsProcessing(false);
      }
    }, 500); // delay pequeno para feedback visual
  };

  const resetAndClose = () => {
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetAndClose();
      else onOpenChange(val);
    }}>
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
              <p>Baixe o modelo abaixo e preencha com seus dados, ou exporte de sua corretora mantendo exatamente estas 3 colunas (com cabeçalho):</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                <li><strong>Ticker</strong>: Código do ativo (ex: PETR4)</li>
                <li><strong>Quantidade</strong>: Total de cotas</li>
                <li><strong>Preço Médio</strong>: Seu custo médio por cota</li>
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
              <Button onClick={() => fileInputRef.current?.click()}>
                Procurar Arquivo
              </Button>
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
                <p className="font-semibold text-primary">{parsedData.length} ativos lidos com sucesso!</p>
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
                        <td className="p-2 font-mono text-xs">{row.Ticker}</td>
                        <td className="p-2 text-right">{row.Quantidade}</td>
                        <td className="p-2 text-right">{row["Preço Médio"]}</td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan={3} className="p-2 text-center text-xs text-muted-foreground italic">
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
