import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePortfolio } from "@/lib/portfolio-store";
import { brl } from "@/lib/portfolio-data";
import { Button } from "@/components/ui/button";
import { ProventoDialog } from "@/components/dialogs/ProventoDialog";
import { Plus, Trash2, Calendar, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/proventos")({
  head: () => ({
    meta: [
      { title: "Proventos e dividendos | RendaViva" },
      {
        name: "description",
        content:
          "Histórico de dividendos, JCP e rendimentos de FIIs, com calendário dos próximos pagamentos da sua carteira.",
      },
      { property: "og:title", content: "Proventos e dividendos | RendaViva" },
      {
        property: "og:description",
        content: "Histórico e calendário de dividendos, JCP e rendimentos de FIIs.",
      },
    ],
  }),
  component: Proventos,
});

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
};

function Proventos() {
  const {
    rendaAnual,
    rendaMensal,
    yieldOnCost,
    proventosMensais,
    proventosRecebidos,
    proximosProventos,
    deleteProvento,
    formatBrl,
    modoPrivacidade,
  } = usePortfolio();

  const [openProventoDialog, setOpenProventoDialog] = useState(false);
  const [filtroTicker, setFiltroTicker] = useState<string>("TODOS");

  const melhorMes = useMemo(() => {
    if (!proventosMensais || proventosMensais.length === 0) return { mes: "-", valor: 0 };
    return proventosMensais.reduce((a, b) => (b.valor > a.valor ? b : a), proventosMensais[0]!);
  }, [proventosMensais]);

  const acumulado = useMemo(() => {
    return proventosMensais.reduce<{ mes: string; total: number }[]>((acc, m, i) => {
      acc.push({ mes: m.mes, total: (acc[i - 1]?.total ?? 0) + m.valor });
      return acc;
    }, []);
  }, [proventosMensais]);

  // Lista de tickers disponíveis para filtro
  const tickersDisponiveis = useMemo(() => {
    const set = new Set<string>();
    proventosRecebidos.forEach((p) => set.add(p.ticker));
    proximosProventos.forEach((p) => set.add(p.ticker));
    return Array.from(set).sort();
  }, [proventosRecebidos, proximosProventos]);

  const recebidosFiltrados = useMemo(() => {
    if (filtroTicker === "TODOS") return proventosRecebidos;
    return proventosRecebidos.filter((p) => p.ticker === filtroTicker);
  }, [proventosRecebidos, filtroTicker]);

  const proximosFiltrados = useMemo(() => {
    if (filtroTicker === "TODOS") return proximosProventos;
    return proximosProventos.filter((p) => p.ticker === filtroTicker);
  }, [proximosProventos, filtroTicker]);

  const handleDelete = (id: string, ticker: string, valor: number) => {
    deleteProvento(id);
    toast.success(`Lançamento de ${ticker} (R$ ${valor.toFixed(2)}) excluído.`);
  };

  return (
    <AppShell
      title="Proventos"
      subtitle="Dividendos, JCP e rendimentos que caem na sua conta."
      actions={
        <Button onClick={() => setOpenProventoDialog(true)} className="gap-1.5 shadow-sm">
          <Plus className="size-4" />
          Lançar Provento
        </Button>
      }
    >
      {/* Cards de Métricas de Proventos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recebido em 12 meses"
          value={formatBrl(rendaAnual)}
          hint="Projeção anual da carteira"
          tone="up"
        />
        <StatCard
          label="Média mensal"
          value={formatBrl(rendaMensal)}
          hint="Baseado nas posições atuais"
        />
        <StatCard
          label="Melhor mês histórico"
          value={formatBrl(melhorMes.valor)}
          hint={melhorMes.mes}
        />
        <StatCard
          label="Yield on cost"
          value={`${yieldOnCost.toFixed(2)}%`}
          hint="Retorno em proventos s/ custo"
        />
      </div>

      {/* Gráficos de Proventos */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recebimentos mensais</h2>
            <span className="text-xs text-muted-foreground">Distribuição histórica</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proventosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" {...axis} />
                <YAxis {...axis} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: "var(--color-elevated)" }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [modoPrivacidade ? "••••••" : brl(v), "Recebido"]}
                />
                <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Acumulado no período</h2>
            <span className="text-xs text-muted-foreground">Evolução do fluxo de caixa</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" {...axis} />
                <YAxis {...axis} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [modoPrivacidade ? "••••••" : brl(v), "Acumulado"]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Barra de Filtro de Ativo */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtrar por Ativo:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroTicker("TODOS")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filtroTicker === "TODOS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {tickersDisponiveis.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTicker(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filtroTicker === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Listas de Proventos Recentes e Próximos Pagamentos */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Últimos recebimentos</h2>
            <span className="text-xs text-muted-foreground">{recebidosFiltrados.length} lançamentos</span>
          </div>

          {recebidosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum provento recebido com este filtro.
            </div>
          ) : (
            <ul>
              {recebidosFiltrados.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 border-b border-border/40 px-5 py-3 text-sm transition-colors hover:bg-elevated/30 last:border-0"
                >
                  <span className="font-semibold text-foreground">{p.ticker}</span>
                  <span className="rounded-md bg-elevated px-2 py-0.5 text-xs text-muted-foreground">
                    {p.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.data}</span>
                  <span className="ml-auto tabular-nums font-medium text-positive">
                    {formatBrl(p.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.ticker, p.valor)}
                    className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    title="Excluir lançamento"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="text-sm font-semibold">Calendário dos próximos pagamentos</h2>
            <span className="text-xs text-muted-foreground">{proximosFiltrados.length} agendados</span>
          </div>

          {proximosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum provento futuro anunciado para este filtro.
            </div>
          ) : (
            <ul>
              {proximosFiltrados.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 border-b border-border/40 px-5 py-3 text-sm transition-colors hover:bg-elevated/30 last:border-0"
                >
                  <span className="font-semibold text-foreground">{p.ticker}</span>
                  <span className="rounded-md bg-elevated px-2 py-0.5 text-xs text-muted-foreground">
                    {p.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.data} · {p.status}
                  </span>
                  <span className="ml-auto tabular-nums font-medium text-foreground">
                    {formatBrl(p.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.ticker, p.valor)}
                    className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    title="Excluir agendamento"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ProventoDialog open={openProventoDialog} onOpenChange={setOpenProventoDialog} />
    </AppShell>
  );
}
