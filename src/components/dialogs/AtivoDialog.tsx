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
import { usePortfolio, type Ativo, type Classe } from "@/lib/portfolio-store";
import { fetchQuotes } from "@/lib/api-b3";
import { toast } from "sonner";

const classesDisponiveis: Classe[] = ["Ação", "FII", "Stock", "REIT", "Renda Fixa"];

const formSchema = z.object({
  ticker: z.string().min(1, "O ticker é obrigatório").trim().toUpperCase(),
  nome: z.string().optional(),
  classe: z.enum(["Ação", "FII", "Stock", "REIT", "Renda Fixa"]),
  setor: z.string().optional(),
  quantidade: z.coerce.number({ invalid_type_error: "Obrigatório" }).min(0, "Mín. 0"),
  precoMedio: z.coerce.number({ invalid_type_error: "Obrigatório" }).min(0, "Mín. 0"),
  precoAtual: z.coerce.number().min(0, "Mín. 0").optional(),
  dyAno: z.coerce.number().min(0, "Mín. 0").optional(),
  proventos12m: z.coerce.number().min(0, "Mín. 0").optional(),
  notaFundamentalista: z.coerce.number().min(0).max(10, "Máx. 10").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AtivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ativoParaEditar?: Ativo | null | undefined;
}

export function AtivoDialog({ open, onOpenChange, ativoParaEditar }: AtivoDialogProps) {
  const { addAtivo, updateAtivo } = usePortfolio();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      nome: "",
      classe: "Ação",
      setor: "",
      quantidade: 0,
      precoMedio: 0,
      precoAtual: undefined,
      dyAno: undefined,
      proventos12m: undefined,
      notaFundamentalista: 8.0,
    },
  });

  useEffect(() => {
    if (open) {
      if (ativoParaEditar) {
        form.reset({
          ticker: ativoParaEditar.ticker,
          nome: ativoParaEditar.nome,
          classe: ativoParaEditar.classe,
          setor: ativoParaEditar.setor,
          quantidade: ativoParaEditar.quantidade,
          precoMedio: ativoParaEditar.precoMedio,
          precoAtual: ativoParaEditar.precoAtual || undefined,
          dyAno: ativoParaEditar.dyAno || undefined,
          proventos12m: ativoParaEditar.proventos12m || undefined,
          notaFundamentalista: ativoParaEditar.notaFundamentalista || 8.0,
        });
      } else {
        form.reset({
          ticker: "",
          nome: "",
          classe: "Ação",
          setor: "",
          quantidade: "" as unknown as number,
          precoMedio: "" as unknown as number,
          precoAtual: undefined,
          dyAno: undefined,
          proventos12m: undefined,
          notaFundamentalista: 8.0,
        });
      }
    }
  }, [ativoParaEditar, open, form]);

  const watchedTicker = useWatch({ control: form.control, name: "ticker" });
  const [debouncedTicker, setDebouncedTicker] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTicker(watchedTicker || ""), 800);
    return () => clearTimeout(timer);
  }, [watchedTicker]);

  useEffect(() => {
    if (debouncedTicker.length >= 4 && !ativoParaEditar) {
      fetchQuotes({ data: [debouncedTicker] }).then((res) => {
        if (res[debouncedTicker]) {
           form.setValue("precoAtual", res[debouncedTicker]);
           // Se o preço médio ainda não foi preenchido, ajuda o usuário preenchendo
           if (!form.getValues("precoMedio")) {
              form.setValue("precoMedio", res[debouncedTicker]);
           }
        }
      }).catch(() => {
        // Ignora erro silenciosamente para não atrapalhar a digitação
      });
    }
  }, [debouncedTicker, ativoParaEditar, form]);

  const onSubmit = (data: FormValues) => {
    const cleanTicker = data.ticker;
    const paNum = data.precoAtual || data.precoMedio;
    const dyNum = data.dyAno || 0;
    const provNum = data.proventos12m || (paNum * dyNum) / 100 || 0;
    const notaNum = data.notaFundamentalista ?? 8.0;

    const payload: Ativo = {
      ticker: cleanTicker,
      nome: data.nome?.trim() || cleanTicker,
      classe: data.classe,
      setor: data.setor?.trim() || "Geral",
      quantidade: data.quantidade,
      precoMedio: data.precoMedio,
      precoAtual: paNum,
      dyAno: dyNum,
      proventos12m: provNum,
      notaFundamentalista: notaNum,
    };

    if (ativoParaEditar) {
      updateAtivo(ativoParaEditar.ticker, payload);
      toast.success(`Ativo ${cleanTicker} atualizado com sucesso!`);
    } else {
      addAtivo(payload);
      toast.success(`Ativo ${cleanTicker} adicionado à carteira!`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ativoParaEditar ? "Editar Ativo" : "Novo Ativo"}</DialogTitle>
          <DialogDescription>
            {ativoParaEditar
              ? "Modifique os dados da sua posição na carteira."
              : "Cadastre um novo ativo para acompanhar patrimônio e dividendos."}
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
                    <FormLabel>Ticker / Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: PETR4"
                        {...field}
                        disabled={!!ativoParaEditar}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classesDisponiveis.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa / Fundo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Petrobras" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Energia" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="precoMedio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Médio (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="precoAtual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Atual (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
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

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="dyAno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DY 12m (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: 8.5"
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
                name="proventos12m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>R$/cota ano</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: 1.20"
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
                name="notaFundamentalista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota (0-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="8.0"
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
              <Button type="submit">Salvar Ativo</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
