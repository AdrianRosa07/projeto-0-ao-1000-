import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePortfolio } from "@/lib/portfolio-store";
import { calcularIR } from "@/lib/ir-calculator";
import { Info, Receipt } from "lucide-react";

export const Route = createFileRoute("/ir")({
  head: () => ({
    meta: [
      { title: "Imposto de Renda | RendaViva" },
      { name: "description", content: "Apuração mensal de resultados e DARF." },
    ],
  }),
  component: IR,
});

function IR() {
  const { transacoes, ativos, formatBrl } = usePortfolio();

  const relatorioIR = useMemo(() => {
    // A API do ir-calculator pede uma lista com campos específicos
    // Vamos garantir que a classe está preenchida corretamente
    const txsMapeadas = transacoes.map(t => {
      const ativoRef = ativos.find(a => a.ticker === t.ticker);
      const classe = ativoRef?.classe || "Ação"; 
      return {
        id: t.id,
        data: t.data,
        ticker: t.ticker,
        tipo: t.tipo,
        quantidade: t.quantidade,
        precoUnitario: t.precoUnitario,
        classe: classe as "Ação" | "FII" | "BDR" | "ETF"
      };
    });
    return calcularIR(txsMapeadas);
  }, [transacoes]);

  return (
    <AppShell
      title="Imposto de Renda"
      subtitle="Apuração mensal, lucros isentos e DARF a pagar."
    >
      <div className="mb-6 rounded-2xl border border-border/60 bg-surface/50 p-4 flex gap-3 text-sm text-muted-foreground">
        <Info className="size-5 text-primary shrink-0" />
        <p>
          Este é um cálculo estimado baseado nas suas transações de swing trade.
          Vendas de Ações até R$ 20.000 no mês são isentas. FIIs e ETFs não possuem isenção. 
          Consulte sempre seu contador para a declaração oficial.
        </p>
      </div>

      {relatorioIR.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-surface p-12 text-center shadow-card">
          <Receipt className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 text-lg font-semibold">Nenhuma transação encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre compras e vendas para visualizar sua apuração de IR.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {relatorioIR.map((mes) => {
            const hasDarf = mes.darfTotal > 0;
            const hasLucroIsento = mes.isentoAcoes && mes.lucroAcoes > 0;

            return (
              <section key={mes.mesAno} className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between border-b border-border/10 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-foreground">Mês {mes.mesAno}</h2>
                  {hasDarf && (
                    <span className="rounded-full bg-negative/10 px-3 py-1 text-xs font-semibold text-negative">
                      DARF a Pagar: {formatBrl(mes.darfTotal)}
                    </span>
                  )}
                  {!hasDarf && hasLucroIsento && (
                    <span className="rounded-full bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">
                      Lucro Isento
                    </span>
                  )}
                  {!hasDarf && !hasLucroIsento && (
                    <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted-foreground">
                      Sem DARF
                    </span>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  {/* Bloco Ações */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações (Vendas no Mês)</p>
                    <p className="text-lg font-semibold">{formatBrl(mes.totalVendasAcoes)}</p>
                    {mes.isentoAcoes ? (
                      <p className="text-xs text-positive">Dentro do limite de 20k (Isento)</p>
                    ) : (
                      <p className="text-xs text-negative">Acima do limite de 20k (Tributável)</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado Ações</p>
                    <p className={`text-lg font-semibold ${mes.lucroAcoes > 0 ? "text-positive" : mes.lucroAcoes < 0 ? "text-negative" : ""}`}>
                      {formatBrl(mes.lucroAcoes)}
                    </p>
                    <p className="text-xs text-muted-foreground">Prejuízo acum.: {formatBrl(mes.prejuizoAcumuladoAcoes)}</p>
                  </div>

                  {/* Bloco FIIs */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado FIIs</p>
                    <p className={`text-lg font-semibold ${mes.lucroFIIs > 0 ? "text-positive" : mes.lucroFIIs < 0 ? "text-negative" : ""}`}>
                      {formatBrl(mes.lucroFIIs)}
                    </p>
                    <p className="text-xs text-muted-foreground">Prejuízo acum.: {formatBrl(mes.prejuizoAcumuladoFIIs)}</p>
                  </div>

                  {/* Bloco BDR/ETF */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado BDR/ETF</p>
                    <p className={`text-lg font-semibold ${mes.lucroBdrEtf > 0 ? "text-positive" : mes.lucroBdrEtf < 0 ? "text-negative" : ""}`}>
                      {formatBrl(mes.lucroBdrEtf)}
                    </p>
                    <p className="text-xs text-muted-foreground">Prejuízo acum.: {formatBrl(mes.prejuizoAcumuladoBdrEtf)}</p>
                  </div>

                  <div className="space-y-1 rounded-xl bg-elevated/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Imposto Devido</p>
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Ações:</span>
                      <span className="font-medium">{formatBrl(mes.impostoAcoes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FIIs:</span>
                      <span className="font-medium">{formatBrl(mes.impostoFIIs)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BDR/ETF:</span>
                      <span className="font-medium">{formatBrl(mes.impostoBdrEtf)}</span>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
