import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePortfolio, type Ativo } from "@/lib/portfolio-store";
import { brl } from "@/lib/portfolio-data";
import { AtivoDialog } from "@/components/dialogs/AtivoDialog";
import { Button } from "@/components/ui/button";
import { Edit2, ShieldAlert, Sparkles, PieChart as PieIcon } from "lucide-react";

export const Route = createFileRoute("/analise")({
  head: () => ({
    meta: [
      { title: "Análise da carteira | RendaViva" },
      {
        name: "description",
        content:
          "Nota fundamentalista, concentração por ativo e relação entre dividend yield e qualidade dos seus investimentos.",
      },
      { property: "og:title", content: "Análise da carteira | RendaViva" },
      {
        property: "og:description",
        content: "Qualidade, concentração e dividend yield dos ativos da sua carteira.",
      },
    ],
  }),
  component: Analise,
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

function Analise() {
  const { posicoes, patrimonio, formatBrl, modoPrivacidade } = usePortfolio();
  const [ativoParaEditar, setAtivoParaEditar] = useState<Ativo | null>(null);
  const [openAtivoDialog, setOpenAtivoDialog] = useState(false);

  const ordenados = useMemo(() => {
    return [...posicoes].sort((a, b) => b.atual - a.atual);
  }, [posicoes]);

  const notaMedia = useMemo(() => {
    if (patrimonio <= 0 || posicoes.length === 0) return 0;
    return posicoes.reduce((s, p) => s + p.notaFundamentalista * p.atual, 0) / patrimonio;
  }, [posicoes, patrimonio]);

  const dyMedio = useMemo(() => {
    if (patrimonio <= 0 || posicoes.length === 0) return 0;
    return posicoes.reduce((s, p) => s + p.dyAno * p.atual, 0) / patrimonio;
  }, [posicoes, patrimonio]);

  const maiorPeso = ordenados[0] || null;

  const scatter = useMemo(() => {
    return posicoes.map((p) => ({
      x: p.notaFundamentalista,
      y: p.dyAno,
      z: p.atual,
      ticker: p.ticker,
    }));
  }, [posicoes]);

  const handleEditar = (ativo: Ativo) => {
    setAtivoParaEditar(ativo);
    setOpenAtivoDialog(true);
  };

  return (
    <AppShell
      title="Análise da carteira"
      subtitle="Qualidade, concentração e eficiência dos seus dividendos."
    >
      {/* Cards de Métricas de Análise */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Nota média ponderada"
          value={notaMedia > 0 ? notaMedia.toFixed(1) : "-"}
          hint="Escala fundamentalista de 0 a 10"
        />
        <StatCard
          label="DY médio da carteira"
          value={`${dyMedio.toFixed(2)}%`}
          hint="Rendimento ponderado em 12m"
          tone="up"
        />
        <StatCard
          label="Maior concentração"
          value={maiorPeso ? maiorPeso.ticker : "-"}
          hint={
            maiorPeso
              ? `${((maiorPeso.atual / (patrimonio || 1)) * 100).toFixed(1)}% da carteira · ${formatBrl(maiorPeso.atual)}`
              : "Sem posições"
          }
        />
      </div>

      {posicoes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-surface p-12 text-center shadow-card">
          <PieIcon className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 text-lg font-semibold">Nenhum ativo cadastrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre seus investimentos para visualizar o radar fundamentalista e a análise de
            dispersão.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Gráfico de Dispersão Qualidade x Dividend Yield */}
            <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Qualidade x Dividend Yield</h2>
                  <p className="text-xs text-muted-foreground">
                    Ideal: quadrante superior direito (nota alta e proventos atrativos).
                  </p>
                </div>
                <Sparkles className="size-4 text-primary" />
              </div>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" dataKey="x" domain={[5, 10]} name="Nota" {...axis} />
                    <YAxis type="number" dataKey="y" name="DY" unit="%" {...axis} />
                    <ZAxis type="number" dataKey="z" range={[60, 500]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(v: number, n: string) => [
                        n === "z" ? (modoPrivacidade ? "••••••" : brl(v)) : v,
                        n === "x" ? "Nota" : n === "y" ? "DY %" : "Posição",
                      ]}
                    />
                    <Scatter data={scatter} fill="var(--color-primary)" fillOpacity={0.75} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Concentração por Ativo */}
            <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Concentração por Ativo</h2>
                <span className="text-xs text-muted-foreground">Participação no patrimônio</span>
              </div>
              <ul className="mt-4 space-y-3">
                {ordenados.slice(0, 8).map((p) => {
                  const peso = patrimonio > 0 ? (p.atual / patrimonio) * 100 : 0;
                  return (
                    <li key={p.ticker}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{p.ticker}</span>
                          <span className="text-xs text-muted-foreground">({p.classe})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {formatBrl(p.atual)}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {peso.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-elevated">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            peso > 20 ? "bg-warning" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(peso * 3.5, 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* Radar Fundamentalista */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Radar Fundamentalista</h2>
                <p className="text-xs text-muted-foreground">
                  Diagnóstico rápido de governança, saúde financeira e risco de concentração.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right [&>th:first-child]:text-left">
                    <th>Ativo</th>
                    <th>Setor</th>
                    <th>Nota</th>
                    <th>DY 12m</th>
                    <th>Peso</th>
                    <th>Posição</th>
                    <th>Diagnóstico</th>
                    <th className="w-10 text-center">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((p) => {
                    const peso = patrimonio > 0 ? (p.atual / patrimonio) * 100 : 0;
                    const alerta =
                      peso > 20
                        ? "Concentrado"
                        : p.notaFundamentalista < 7.5
                          ? "Monitorar"
                          : "Saudável";
                    const tone =
                      alerta === "Saudável"
                        ? "text-positive"
                        : alerta === "Concentrado"
                          ? "text-negative"
                          : "text-warning";

                    return (
                      <tr
                        key={p.ticker}
                        className="border-t border-border/50 transition-colors hover:bg-elevated/30 [&>td]:px-4 [&>td]:py-3 [&>td]:text-right [&>td:first-child]:text-left"
                      >
                        <td className="font-semibold text-foreground">
                          {p.ticker}
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            · {p.nome}
                          </span>
                        </td>
                        <td className="text-muted-foreground">{p.setor}</td>
                        <td className="tabular-nums font-semibold text-foreground">
                          {p.notaFundamentalista.toFixed(1)}
                        </td>
                        <td className="tabular-nums font-medium">{p.dyAno.toFixed(1)}%</td>
                        <td className="tabular-nums font-medium">{peso.toFixed(1)}%</td>
                        <td className="tabular-nums font-medium">{formatBrl(p.atual)}</td>
                        <td className={`font-semibold ${tone}`}>{alerta}</td>
                        <td className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditar(p)}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title="Editar nota fundamentalista"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <AtivoDialog
        open={openAtivoDialog}
        onOpenChange={setOpenAtivoDialog}
        ativoParaEditar={ativoParaEditar}
      />
    </AppShell>
  );
}
