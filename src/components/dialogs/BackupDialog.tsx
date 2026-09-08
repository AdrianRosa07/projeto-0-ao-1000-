import { useState, useRef } from "react";
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
import { Download, Upload, RotateCcw, AlertTriangle } from "lucide-react";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const { exportData, importData, resetDemoData, ativos, proventos } = usePortfolio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `rendaviva-carteira-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso!");
    } catch (e) {
      toast.error("Erro ao exportar arquivo de backup.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = importData(text);
        if (success) {
          toast.success("Dados importados com sucesso!");
          onOpenChange(false);
        } else {
          toast.error("Formato de arquivo inválido. Verifique o JSON.");
        }
      } catch (err) {
        toast.error("Falha ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    resetDemoData();
    setConfirmReset(false);
    toast.success("Dados de demonstração restaurados!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backup e Gerenciamento de Dados</DialogTitle>
          <DialogDescription>
            Exporte uma cópia de segurança dos seus investimentos ou restaure dados a qualquer
            momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card de Exportação */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-elevated/40 p-4">
            <div>
              <p className="text-sm font-semibold">Exportar Backup (.json)</p>
              <p className="text-xs text-muted-foreground">
                {ativos.length} ativos · {proventos.length} proventos registrados
              </p>
            </div>
            <Button size="sm" onClick={handleExport} className="gap-2">
              <Download className="size-4" />
              Baixar
            </Button>
          </div>

          {/* Card de Importação */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-elevated/40 p-4">
            <div>
              <p className="text-sm font-semibold">Importar Backup</p>
              <p className="text-xs text-muted-foreground">
                Restaure uma carteira salva anteriormente em seu computador.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="size-4" />
                Carregar
              </Button>
            </div>
          </div>

          {/* Card de Reset Demo */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            {!confirmReset ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    Restaurar Carteira de Demonstração
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Substitui seus dados pelos ativos e proventos padrão de exemplo.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmReset(true)}
                  className="gap-1.5"
                >
                  <RotateCcw className="size-4" />
                  Restaurar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="size-5" />
                  <span className="font-semibold">Tem certeza que deseja resetar?</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Essa ação apagará lançamentos manuais não exportados e recarregará a base demo.
                </p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleReset}>
                    Sim, restaurar demo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
