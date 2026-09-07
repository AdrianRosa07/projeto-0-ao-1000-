import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LineChart,
  Coins,
  Target,
  Wallet,
  TrendingUp,
  Plus,
  ArrowUpDown,
  Eye,
  EyeOff,
  Database,
} from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-store";
import { Button } from "@/components/ui/button";
import { AtivoDialog } from "@/components/dialogs/AtivoDialog";
import { TransacaoDialog } from "@/components/dialogs/TransacaoDialog";
import { BackupDialog } from "@/components/dialogs/BackupDialog";

const nav = [
  { to: "/", label: "Carteira", icon: Wallet },
  { to: "/proventos", label: "Proventos", icon: Coins },
  { to: "/aportes", label: "Aportes", icon: Target },
  { to: "/analise", label: "Análise", icon: LineChart },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { modoPrivacidade, togglePrivacidade } = usePortfolio();
  const [openAtivo, setOpenAtivo] = useState(false);
  const [openTransacao, setOpenTransacao] = useState(false);
  const [openBackup, setOpenBackup] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <TrendingUp className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Renda<span className="text-primary">Viva</span>
            </span>
          </Link>

          {/* Navegação principal */}
          <nav className="ml-2 hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
                activeProps={{ className: "bg-elevated text-foreground font-medium" }}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Ações Rápidas no Header */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacidade}
              title={modoPrivacidade ? "Exibir valores" : "Ocultar valores (privacidade)"}
              className="size-9 rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground"
            >
              {modoPrivacidade ? <EyeOff className="size-4 text-warning" /> : <Eye className="size-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenBackup(true)}
              title="Backup e Dados"
              className="size-9 rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground"
            >
              <Database className="size-4" />
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenTransacao(true)}
                className="gap-1.5 rounded-lg border-border/70 text-xs"
              >
                <ArrowUpDown className="size-3.5" />
                Lançar Operação
              </Button>

              <Button
                size="sm"
                onClick={() => setOpenAtivo(true)}
                className="gap-1.5 rounded-lg text-xs shadow-sm"
              >
                <Plus className="size-3.5" />
                Novo Ativo
              </Button>
            </div>
          </div>
        </div>

        {/* Navegação Mobile inferior/secundária */}
        <div className="flex md:hidden border-t border-border/40 px-3 py-1.5 justify-around bg-surface/50">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary font-medium" }}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        RendaViva · Gestão inteligente de carteira e proventos. Todos os dados são salvos localmente.
      </footer>

      {/* Modais Globais */}
      <AtivoDialog open={openAtivo} onOpenChange={setOpenAtivo} />
      <TransacaoDialog open={openTransacao} onOpenChange={setOpenTransacao} />
      <BackupDialog open={openBackup} onOpenChange={setOpenBackup} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-positive" : tone === "down" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card transition-all hover:border-border/80">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
