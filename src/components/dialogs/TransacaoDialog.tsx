import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { usePortfolio } from "@/lib/portfolio-store";
import { fetchQuotes } from "@/lib/api-b3";
import { toast } from "sonner";

const formSchema = z.object({
  tipo: z.enum(["compra", "venda"]),
  ticker: z.string().min(1, "Ticker obrigatório").trim().toUpperCase(),
  data: z.string().min(1, "Data obrigatória"),
  quantidade: z.coerce.number({ invalid_type_error: "Obrigatório" }).positive("Maior que zero"),
  precoUnitario: z.coerce.number({ invalid_type_error: "Obrigatório" }).positive("Maior que zero"),
  taxas: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickerInicial?: string | undefined;
  tipoInicial?: "compra" | "venda" | undefined;
}

export function TransacaoDialog({
  open,
  onOpenChange,
  tickerInicial,
  tipoInicial = "compra",
}: TransacaoDialogProps) {
  const { ativos, registrarTransacao } = usePortfolio();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: tipoInicial || "compra",
      ticker: tickerInicial || "",
      data: new Date().toISOString().split("T")[0],
      quantidade: "" as unknown as number,
      precoUnitario: "" as unknown as number,
      taxas: undefined,
      notas: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (tipoInicial) form.setValue("tipo", tipoInicial);
      if (tickerInicial) {
        form.setValue("ticker", tickerInicial);
        const ativo = ativos.find((a) => a.ticker.toUpperCase() === tickerInicial.toUpperCase());
        if (ativo) {
          form.setValue("precoUnitario", ativo.precoAtual || ativo.precoMedio);
        }
      } else {
        form.reset({
          tipo: tipoInicial,
          ticker: "",
          data: new Date().toISOString().split("T")[0],
          quantidade: undefined as unknown as number,
          precoUnitario: undefined as unknown as number,
          taxas: undefined,
          notas: "",
        });
      }
    }
  }, [open, tickerInicial, tipoInicial, ativos, form]);

  const watchedTicker = useWatch({ control: form.control, name: "ticker" });
  const [debouncedTicker, setDebouncedTicker] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTicker(watchedTicker || ""), 800);
    return () => clearTimeout(timer);
  }, [watchedTicker]);

  useEffect(() => {
    if (debouncedTicker.length >= 4) {
      // Se não tem no portfólio ainda (para não sobrescrever o preço médio/atual que a pessoa tem na aba)
      const ativo = ativos.find((a) => a.ticker.toUpperCase() === debouncedTicker.toUpperCase());
      if (!ativo && !form.getValues("precoUnitario")) {
        fetchQuotes({ data: [debouncedTicker] }).then((res) => {
          if (res[debouncedTicker]) {
            form.setValue("precoUnitario", res[debouncedTicker]);
          }
        }).catch(() => {});
      }
    }
  }, [debouncedTicker, ativos, form]);

  const watchedTipo = useWatch({ control: form.control, name: "tipo" });
  const watchedQtd = useWatch({ control: form.control, name: "quantidade" });
  const watchedPreco = useWatch({ control: form.control, name: "precoUnitario" });
  const watchedTaxas = useWatch({ control: form.control, name: "taxas" });

  const qtdNum = Number(watchedQtd) || 0;
  const precoNum = Number(watchedPreco) || 0;
  const taxasNum = Number(watchedTaxas) || 0;
  const totalEstimado = qtdNum * precoNum + (watchedTipo === "compra" ? taxasNum : -taxasNum);

  const handleTickerChange = (novoTicker: string, fieldChange: (value: string) => void) => {
    fieldChange(novoTicker);
    const ativo = ativos.find((a) => a.ticker.toUpperCase() === novoTicker.toUpperCase());
    if (ativo) {
      form.setValue("precoUnitario", ativo.precoAtual || ativo.precoMedio);
    }
  };

  const onSubmit = (data: FormValues) => {
    const cleanTicker = data.ticker;

    // Se for venda, validar se o usuário possui essa quantidade
    if (data.tipo === "venda") {
      const ativo = ativos.find((a) => a.ticker.toUpperCase() === cleanTicker);
      if (!ativo || ativo.quantidade < data.quantidade) {
        toast.error(`Quantidade insuficiente para venda (Possui: ${ativo?.quantidade || 0}).`);
        return;
      }
    }

    registrarTransacao({
      ticker: cleanTicker,
      tipo: data.tipo,
      data: data.data,
      quantidade: data.quantidade,
      precoUnitario: data.precoUnitario,
      taxas: data.taxas || 0,
      notas: data.notas?.trim() || undefined,
    });

    toast.success(
      `${data.tipo === "compra" ? "Compra" : "Venda"} de ${data.quantidade} cotas de ${cleanTicker} registrada com sucesso!`,
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Operação / Aporte</DialogTitle>
          <DialogDescription>
            Lançamento de compra ou venda. O preço médio e o saldo da carteira serão recalculados.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Alternador Compra / Venda */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-elevated p-1">
              <button
                type="button"
                onClick={() => form.setValue("tipo", "compra")}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  watchedTipo === "compra"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Compra (Aporte)
              </button>
              <button
                type="button"
                onClick={() => form.setValue("tipo", "venda")}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  watchedTipo === "venda"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Venda (Desinvestimento)
              </button>
            </div>
            
            {/* Campo oculto para o tipo (para validação do form) */}
            <input type="hidden" {...form.register("tipo")} />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ativo</FormLabel>
                    {ativos.length > 0 ? (
                      <Select
                        onValueChange={(val) => handleTickerChange(val, field.onChange)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o ativo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ativos.map((a) => (
                            <SelectItem key={a.ticker} value={a.ticker}>
                              {a.ticker} - {a.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          placeholder="Ex: PETR4"
                          {...field}
                          onChange={(e) => handleTickerChange(e.target.value.toUpperCase(), field.onChange)}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="Ex: 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precoUnitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="taxas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxas (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: NuInvest" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resumo do total financeiro */}
            <div className="rounded-xl border border-border/60 bg-elevated/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volume total da operação:</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {totalEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {watchedTipo === "compra" ? "Confirmar Compra" : "Confirmar Venda"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
