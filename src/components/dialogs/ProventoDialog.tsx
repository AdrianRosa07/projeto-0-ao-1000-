import { useEffect } from "react";
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
import { usePortfolio, type ProventoRegistro } from "@/lib/portfolio-store";
import { toast } from "sonner";

const tiposProvento: ProventoRegistro["tipo"][] = [
  "Rendimento",
  "Dividendo",
  "JCP",
  "Amortização",
];

const statusOpcoes: ProventoRegistro["status"][] = ["Recebido", "Anunciado", "Previsto"];

const formSchema = z.object({
  ticker: z.string().min(1, "Ticker obrigatório").trim().toUpperCase(),
  tipo: z.enum(["Rendimento", "Dividendo", "JCP", "Amortização"]),
  status: z.enum(["Recebido", "Anunciado", "Previsto"]),
  data: z.string().min(1, "Data obrigatória"),
  porCota: z.coerce.number().min(0).optional(),
  valorTotal: z.coerce.number({ invalid_type_error: "Obrigatório" }).min(0.01, "Maior que zero"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickerInicial?: string;
}

export function ProventoDialog({ open, onOpenChange, tickerInicial }: ProventoDialogProps) {
  const { ativos, registrarProvento } = usePortfolio();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: tickerInicial || "",
      tipo: "Rendimento",
      status: "Recebido",
      data: new Date().toISOString().split("T")[0],
      porCota: undefined,
      valorTotal: undefined as unknown as number,
    },
  });

  useEffect(() => {
    if (open) {
      if (tickerInicial) {
        form.setValue("ticker", tickerInicial);
      } else {
        form.reset({
          ticker: "",
          tipo: "Rendimento",
          status: "Recebido",
          data: new Date().toISOString().split("T")[0],
          porCota: undefined,
          valorTotal: undefined as unknown as number,
        });
      }
    }
  }, [open, tickerInicial, form]);

  const porCotaValue = useWatch({ control: form.control, name: "porCota" });
  const tickerValue = useWatch({ control: form.control, name: "ticker" });

  // Auto-preencher valor total se o usuário digitar "porCota"
  useEffect(() => {
    if (porCotaValue && porCotaValue > 0 && tickerValue) {
      const ativo = ativos.find((a) => a.ticker.toUpperCase() === tickerValue.toUpperCase());
      if (ativo && ativo.quantidade > 0) {
        form.setValue("valorTotal", Number((porCotaValue * ativo.quantidade).toFixed(2)));
      }
    }
  }, [porCotaValue, tickerValue, ativos, form]);

  const onSubmit = (data: FormValues) => {
    const cleanTicker = data.ticker;
    const valorNum = data.valorTotal;

    // Formatar data para exibição (se for AAAA-MM-DD -> DD/MM/AAAA)
    let dataFormatada = data.data;
    if (data.data.includes("-")) {
      const parts = data.data.split("-");
      if (parts.length === 3) {
        dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    registrarProvento({
      ticker: cleanTicker,
      tipo: data.tipo,
      status: data.status,
      data: dataFormatada,
      valor: valorNum,
    });

    toast.success(
      `${data.tipo} de R$ ${valorNum.toFixed(2)} registrado para ${cleanTicker}!`,
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Provento</DialogTitle>
          <DialogDescription>
            Registre dividendos, JCP ou rendimentos de fundos imobiliários recebidos ou previstos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ativo</FormLabel>
                    {ativos.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o ativo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ativos.map((a) => (
                            <SelectItem key={a.ticker} value={a.ticker}>
                              {a.ticker} ({a.classe})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          placeholder="Ex: MXRF11"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposProvento.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOpcoes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="porCota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor por cota (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Ex: 0.10"
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
                name="valorTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total Recebido (R$)</FormLabel>
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
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Provento</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
