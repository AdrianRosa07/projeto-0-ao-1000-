import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatCard } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { usePortfolio, type Classe } from "@/lib/portfolio-store";
import { MetasDialog } from "@/components/dialogs/MetasDialog";
import { TransacaoDialog } from "@/components/dialogs/TransacaoDialog";
import { Target, Settings2, ArrowRight, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/aportes")({
  head: () => ({
    meta: [
      { title: "Simulador de aportes | RendaViva" },
      {
        name: "description",
        content:
          "Descubra onde aportar para reequilibrar a carteira e simule quanto tempo falta para viver de renda passiva.",
      },
      { property: "og:title", content: "Simulador de aportes | RendaViva" },
      {
        property: "og:description",
        content: "Sugestão de aporte por classe e projeção de independência financeira.",
      },
    ],
  }),
  component: Aportes,
});

function Aportes() {
  const { posicoes, patrimonio, rendaMensal, metas, sugerirAporte, formatBrl, ativos } =
    usePortfolio();

  const [valor, setValor] = useState(3000);
  const [metaRenda, setMetaRenda] = useState(8000);
  const [taxaMensalPct, setTaxaMensalPct] = useState(0.75); // 0.75% a.m.
  const [openMetasDialog, setOpenMetasDialog] = useState(false);
  const [openTransacaoDialog, setOpenTransacaoDialog] = useState(false);
  const [tickerSelecionado, setTickerSelecionado] = useState<string | undefined>();

  const sugestoes = useMemo(() => {
    return sugerirAporte(valor || 0);
  }, [sugerirAporte, valor]);

  // Projeção dinâmica de independência financeira
  const { anos, restoMeses, mesesTotal, patrimonioNecessario } = useMemo(() => {
    const taxaDecimal = (taxaMensalPct || 0.75) / 100;
    const patNecessario = taxaDecimal > 0 ? (metaRenda || 0) / taxaDecimal : 0;

    let saldo = patrimonio;
    let meses = 0;
    const aporte = valor || 0;

    while (saldo * taxaDecimal < (metaRenda || 0) && meses < 600) {
      saldo = saldo * (1 + taxaDecimal) + aporte;
      meses++;
    }

    return {
      anos: Math.floor(meses / 12),
      restoMeses: meses % 12,
      mesesTotal: meses,
      patrimonioNecessario: patNecessario,
    };
  }, [patrimonio, metaRenda, valor, taxaMensalPct]);

  const handleAportarClasse = (classe: Classe) => {
    // Escolhe o primeiro ativo dessa classe ou o que tiver menor peso
    const ativoDaClasse = ativos.find((a) => a.classe === classe);
    setTickerSelecionado(ativoDaClasse?.ticker);
    setOpenTransacaoDialog(true);
  };

  return (
    <AppShell
      title="Aportes e rebalanceamento"
      subtitle="Onde colocar o próximo dinheiro para equilibrar a carteira e acelerar sua independência financeira."
      actions={
        <Button
          variant="outline"
          onClick={() => setOpenMetasDialog(true)}
          className="gap-1.5 rounded-lg border-border/80"
        >
          <Settings2 className="size-4" />
          Ajustar Metas (%)
        </Button>
      }
    >
      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Renda passiva atual"
          value={formatBrl(rendaMensal)}
          hint="Média mensal estimada"
          tone="up"
        />
        <StatCard
          label="Meta de renda"
          value={formatBrl(metaRenda)}
          hint={`Patrimônio alvo: ${formatBrl(patrimonioNecessario)}`}
        />
        <StatCard
          label="Tempo estimado"
          value={mesesTotal >= 600 ? "+50 anos" : `${anos}a ${restoMeses}m`}
          hint={`Aportando ${formatBrl(valor || 0)}/mês a ${taxaMensalPct}% a.m.`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Simulador Interativo */}
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Simulador de Aportes & Liberdade Financeira</h2>
            <Target className="size-4 text-primary" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Aporte mensal (R$)</span>
              <Input
                type="number"
                min={0}
                step={100}
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="mt-1"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Meta de renda (R$/mês)</span>
              <Input
                type="number"
                min={0}
                step={500}
                value={metaRenda}
                onChange={(e) => setMetaRenda(Number(e.target.value))}
                className="mt-1"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Retorno mensal (% a.m.)</span>
              <Input
                type="number"
                min={0.1}
                max={3.0}
                step={0.05}
                value={taxaMensalPct}
                onChange={(e) => setTaxaMensalPct(Number(e.target.value))}
                className="mt-1"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-elevated/40 p-4 text-sm leading-relaxed text-muted-foreground">
            Com aporte mensal de{" "}
            <strong className="text-foreground">{formatBrl(valor || 0)}</strong> e reinvestimento
            total dos proventos a uma taxa conservadora de{" "}
            <strong className="text-foreground">{taxaMensalPct}% ao mês</strong>, você alcançará sua
            renda de <strong className="text-foreground">{formatBrl(metaRenda)}/mês</strong> em{" "}
            <strong className="text-primary">
              {mesesTotal >= 600 ? "mais de 50 anos" : `${anos} anos e ${restoMeses} meses`}
            </strong>
            .
          </div>
        </section>

        {/* Sugestão Inteligente de Rebalanceamento */}
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Sugestão do Próximo Aporte</h2>
              <p className="text-xs text-muted-foreground">
                Direcionado para a classe mais abaixo da sua meta percentual.
              </p>
            </div>
            <span className="text-xs font-semibold tabular-nums text-primary">
              Total: {formatBrl(valor || 0)}
            </span>
          </div>

          <ul className="mt-4 space-y-4">
            {sugestoes.map((s) => (
              <li key={s.classe} className="rounded-xl border border-border/40 bg-elevated/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{s.classe}</span>
                    <span className="text-xs text-muted-foreground">
                      atual {s.peso.toFixed(1)}% · meta {s.meta}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatBrl(s.sugestao)}
                    </span>
                    {s.sugestao > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAportarClasse(s.classe)}
                        className="size-7 p-0 text-muted-foreground hover:text-primary"
                        title={`Lançar aporte em ${s.classe}`}
                      >
                        <ArrowRight className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Progress
                  value={s.meta > 0 ? Math.min((s.peso / s.meta) * 100, 100) : 100}
                  className="mt-2 h-2"
                />

                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {s.meta > 0 ? `${((s.peso / s.meta) * 100).toFixed(0)}% da meta atingida` : "-"}
                  </span>
                  <span>{s.falta > 0 ? `faltam ${formatBrl(s.falta)}` : "alinhado à meta"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Visão Consolidada das Metas por Classe */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Suas Metas por Classe</h2>
            <p className="text-xs text-muted-foreground">
              Comparativo atual vs objetivo estipulado
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenMetasDialog(true)}
            className="text-xs"
          >
            Editar Metas
          </Button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(metas).map(([classe, meta]) => {
            const atual =
              patrimonio > 0
                ? (posicoes.filter((p) => p.classe === classe).reduce((s, p) => s + p.atual, 0) /
                    patrimonio) *
                  100
                : 0;
            const diff = atual - meta;

            return (
              <div key={classe} className="rounded-xl border border-border/50 bg-elevated/40 p-4">
                <p className="text-sm font-medium">{classe}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {atual.toFixed(1)}%
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>meta {meta}%</span>
                  <span className={diff >= 0 ? "text-positive" : "text-warning"}>
                    {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modais da página */}
      <MetasDialog open={openMetasDialog} onOpenChange={setOpenMetasDialog} />
      <TransacaoDialog
        open={openTransacaoDialog}
        onOpenChange={setOpenTransacaoDialog}
        tickerInicial={tickerSelecionado}
      />
    </AppShell>
  );
}
