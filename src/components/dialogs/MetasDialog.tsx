import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { usePortfolio, type Classe } from "@/lib/portfolio-store";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface MetasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const classes: Classe[] = ["Ação", "FII", "Renda Fixa", "Stock", "REIT"];

const presets: { nome: string; metas: Record<string, number> }[] = [
  {
    nome: "Foco em Dividendos",
    metas: { Ação: 35, FII: 40, "Renda Fixa": 15, Stock: 5, REIT: 5 },
  },
  {
    nome: "Balanceado",
    metas: { Ação: 40, FII: 30, "Renda Fixa": 15, Stock: 10, REIT: 5 },
  },
  {
    nome: "Crescimento & Global",
    metas: { Ação: 45, FII: 20, "Renda Fixa": 10, Stock: 20, REIT: 5 },
  },
  {
    nome: "Conservador",
    metas: { Ação: 25, FII: 30, "Renda Fixa": 35, Stock: 5, REIT: 5 },
  },
];

export function MetasDialog({ open, onOpenChange }: MetasDialogProps) {
  const { metas, updateMetas } = usePortfolio();
  const [valores, setValores] = useState<Record<string, number>>({});

  useEffect(() => {
    setValores({ ...metas });
  }, [metas, open]);

  const handleChange = (classe: string, val: number) => {
    setValores((prev) => ({
      ...prev,
      [classe]: Math.max(0, Math.min(100, val)),
    }));
  };

  const total = Object.values(valores).reduce((s, v) => s + (Number(v) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error(`A soma das metas deve ser exatamente 100% (atualmente está em ${total.toFixed(0)}%).`);
      return;
    }
    updateMetas(valores);
    toast.success("Metas de alocação salvas com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Metas de Alocação por Classe</DialogTitle>
          <DialogDescription>
            Defina o percentual ideal de cada classe. O algoritmo de sugestão de aportes usará essas metas para rebalancear sua carteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Presets rápidos */}
          <div>
            <Label className="text-xs text-muted-foreground">Modelos prontos:</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => setValores({ ...p.metas })}
                  className="rounded-lg border border-border/60 bg-elevated px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {p.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs por classe */}
          <div className="space-y-3">
            {classes.map((classe) => (
              <div key={classe} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">{classe}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-24 text-right tabular-nums"
                    value={valores[classe] ?? 0}
                    onChange={(e) => handleChange(classe, Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Indicador de Total */}
          <div
            className={`flex items-center justify-between rounded-xl border p-3 ${
              isValid
                ? "border-positive/30 bg-positive/10 text-positive"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {isValid ? (
                <CheckCircle2 className="size-4 text-positive" />
              ) : (
                <AlertCircle className="size-4 text-warning" />
              )}
              <span>Soma total:</span>
            </div>
            <span className="text-base font-semibold tabular-nums">
              {total.toFixed(0)}% / 100%
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              Salvar Metas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
