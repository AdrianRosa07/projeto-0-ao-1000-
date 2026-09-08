import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePortfolio, type Ativo, type Classe } from "@/lib/portfolio-store";
import { pct, brl } from "@/lib/portfolio-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AtivoDialog } from "@/components/dialogs/AtivoDialog";
import { TransacaoDialog } from "@/components/dialogs/TransacaoDialog";
import { ImportarCSVDialog } from "@/components/dialogs/ImportarCSVDialog";
import {
  Search,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  Wallet,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carteira e renda passiva | RendaViva" },
      {
        name: "description",
        content:
          "Acompanhe patrimônio, rentabilidade, dividendos e alocação da sua carteira de ações, FIIs e renda fixa em um só painel.",
      },
      { property: "og:title", content: "Carteira e renda passiva | RendaViva" },
      {
        property: "og:description",
        content: "Painel completo de investimentos: patrimônio, proventos e alocação por classe.",
      },
    ],
  }),
  component: Carteira,
});

const donutColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

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

const classeBadges: Record<Classe, { bg: string; text: string }> = {
  Ação: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  FII: { bg: "bg-sky-500/15 border-sky-500/30", text: "text-sky-400" },
  Stock: { bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
  REIT: { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  "Renda Fixa": { bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400" },
};

function Carteira() {
  const {
    posicoes,
    patrimonio,
    totalInvestido,
    lucroTotal,
    rentabilidade,
    rendaMensal,
    yieldOnCost,
    alocacaoPorClasse,
    alocacaoPorSetor,
    maioresPosicoes,
    evolucaoPatrimonio,
    proventosMensais,
    deleteAtivo,
    formatBrl,
    modoPrivacidade,
  } = usePortfolio();

  // Estados para filtros e busca
  const [busca, setBusca] = useState("");
  const [classeFiltro, setClasseFiltro] = useState<string>("Todas");
  const [ordenacao, setOrdenacao] = useState<"maior_posicao" | "lucro" | "dy" | "ticker">(
    "maior_posicao",
  );

  // Modais de ação rápida na tabela
  const [ativoParaEditar, setAtivoParaEditar] = useState<Ativo | null>(null);
  const [openAtivoDialog, setOpenAtivoDialog] = useState(false);
  const [tickerTransacao, setTickerTransacao] = useState<string | undefined>();
  const [openTransacaoDialog, setOpenTransacaoDialog] = useState(false);
  const [openImportarDialog, setOpenImportarDialog] = useState(false);

  // Filtragem e ordenação reativas
  const posicoesFiltradas = useMemo(() => {
    return posicoes
      .filter((p) => {
        const matchBusca =
          p.ticker.toLowerCase().includes(busca.toLowerCase()) ||
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.setor.toLowerCase().includes(busca.toLowerCase());
        const matchClasse = classeFiltro === "Todas" || p.classe === classeFiltro;
        return matchBusca && matchClasse;
      })
      .sort((a, b) => {
        if (ordenacao === "maior_posicao") return b.atual - a.atual;
        if (ordenacao === "lucro") return b.lucro - a.lucro;
        if (ordenacao === "dy") return b.dyAno - a.dyAno;
        return a.ticker.localeCompare(b.ticker);
      });
  }, [posicoes, busca, classeFiltro, ordenacao]);

  const handleDeleteAtivo = (ticker: string) => {
    if (window.confirm(`Tem certeza que deseja remover o ativo ${ticker} da sua carteira?`)) {
      deleteAtivo(ticker);
      toast.success(`Ativo ${ticker} removido com sucesso.`);
    }
  };

  const handleEditar = (ativo: Ativo) => {
    setAtivoParaEditar(ativo);
    setOpenAtivoDialog(true);
  };

  const handleNovaOperacao = (ticker: string) => {
    setTickerTransacao(ticker);
    setOpenTransacaoDialog(true);
  };

  return (
    <AppShell
      title="Minha carteira"
      subtitle="Visão consolidada e reativa de ações, FIIs, stocks e renda fixa."
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setAtivoParaEditar(null);
              setOpenAtivoDialog(true);
            }}
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Novo Ativo
          </Button>
          <Button onClick={() => setOpenImportarDialog(true)} className="gap-1.5">
            <Upload className="size-4" />
            Sincronizar (CSV)
          </Button>
        </div>
      }
    >
      {/* Alertas Estratégicos */}
      {maioresPosicoes.length > 0 && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-sm text-primary-foreground">
          <Info className="size-5 text-primary shrink-0" />
          <div className="text-foreground">
            <span className="font-semibold text-primary">Atenção ao risco de concentração:</span> Seus 3 maiores ativos ({maioresPosicoes.map(a => a.ticker).join(", ")}) representam 
            <strong className="ml-1">
              {(maioresPosicoes.reduce((acc, a) => acc + a.peso, 0)).toFixed(1)}%
            </strong> da sua carteira.
          </div>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patrimônio"
          value={formatBrl(patrimonio)}
          hint={`Investido ${formatBrl(totalInvestido)}`}
        />
        <StatCard
          label="Lucro / Prejuízo"
          value={formatBrl(lucroTotal)}
          hint={pct(rentabilidade)}
          tone={lucroTotal >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Renda passiva mensal"
          value={formatBrl(rendaMensal)}
          hint="Média dos últimos 12 meses"
          tone="up"
        />
        <StatCard
          label="Yield on cost"
          value={`${yieldOnCost.toFixed(2)}%`}
          hint="Relação proventos / valor investido"
        />
      </div>

      {/* Gráficos Principais */}
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Evolução do patrimônio x aportes</h2>
            <span className="text-xs text-muted-foreground">Histórico mensal</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoPatrimonio}>
                <defs>
                  <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="mes" {...axis} />
                <YAxis {...axis} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [
                    modoPrivacidade ? "••••••" : brl(v),
                    n === "patrimonio" ? "Patrimônio" : "Aportado",
                  ]}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="patrimonio"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#gPat)"
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="aportado"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Alocação por classe</h2>
            <span className="text-xs text-muted-foreground">
              {alocacaoPorClasse.length} classes
            </span>
          </div>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alocacaoPorClasse}
                  dataKey="valor"
                  nameKey="classe"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {alocacaoPorClasse.map((_, i) => (
                    <Cell key={i} fill={donutColors[i % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => (modoPrivacidade ? "••••••" : brl(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2">
            {alocacaoPorClasse.map((a, i) => (
              <li key={a.classe} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: donutColors[i % donutColors.length] }}
                />
                <span className="text-muted-foreground">{a.classe}</span>
                <span className="ml-auto tabular-nums">{a.peso.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Gráfico Alocação por Setor */}
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Alocação por setor</h2>
            <span className="text-xs text-muted-foreground">
              {alocacaoPorSetor.length} setores
            </span>
          </div>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alocacaoPorSetor}
                  dataKey="valor"
                  nameKey="setor"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {alocacaoPorSetor.map((_, i) => (
                    <Cell key={i} fill={donutColors[(i + 3) % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => (modoPrivacidade ? "••••••" : brl(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 flex-1 overflow-y-auto pr-1">
            {alocacaoPorSetor.map((a, i) => (
              <li key={a.setor} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ background: donutColors[(i + 3) % donutColors.length] }}
                />
                <span className="text-muted-foreground truncate">{a.setor}</span>
                <span className="ml-auto tabular-nums">{a.peso.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Gráfico de Proventos Mensais e Metas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Proventos recebidos por mês</h2>
            <span className="text-xs text-muted-foreground">Últimos 12 meses</span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proventosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" {...axis} />
                <YAxis {...axis} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: "var(--color-elevated)" }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [modoPrivacidade ? "••••••" : brl(v), "Proventos"]}
                />
                <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Projeção de Renda Passiva / Marcos */}
        <section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold">Liberdade Financeira</h2>
            <p className="text-xs text-muted-foreground mt-1">
              O que sua renda passiva mensal ({formatBrl(rendaMensal)}) já cobre hoje:
            </p>
          </div>
          
          <div className="mt-4 space-y-4">
            {[
              { titulo: "Streaming & Café", valor: 50, icon: "☕" },
              { titulo: "Luz e Internet", valor: 250, icon: "💡" },
              { titulo: "Mercado Básico", valor: 800, icon: "🛒" },
              { titulo: "Aluguel/Moradia", valor: 2500, icon: "🏠" },
            ].map((marco) => {
              const atingido = rendaMensal >= marco.valor;
              const pctCompleto = Math.min(100, (rendaMensal / marco.valor) * 100);
              
              return (
                <div key={marco.titulo} className={`relative flex items-center gap-3 p-3 rounded-lg border ${atingido ? 'border-primary/40 bg-primary/10' : 'border-border bg-elevated/50'}`}>
                  <span className="text-2xl">{marco.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${atingido ? 'text-primary' : 'text-muted-foreground'}`}>
                        {marco.titulo}
                      </span>
                      <span className="text-xs font-semibold tabular-nums">{formatBrl(marco.valor)}</span>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${atingido ? 'bg-primary' : 'bg-muted-foreground/30'}`} 
                        style={{ width: `${pctCompleto}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Seção da Tabela de Posições com Filtros e Ações */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
        <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Posições em Carteira</h2>
            <p className="text-xs text-muted-foreground">
              {posicoesFiltradas.length} de {posicoes.length} ativos exibidos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campo de Busca */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ticker, nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            {/* Filtro de Classe */}
            <div className="flex flex-wrap gap-1">
              {["Todas", "Ação", "FII", "Stock", "REIT", "Renda Fixa"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClasseFiltro(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    classeFiltro === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-elevated text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <select
              value={ordenacao}
              onChange={(e) =>
                setOrdenacao(e.target.value as "maior_posicao" | "lucro" | "dy" | "ticker")
              }
              aria-label="Ordenar posições da carteira"
              className="h-9 rounded-lg border border-border/70 bg-elevated px-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="maior_posicao">Maior Posição</option>
              <option value="lucro">Maior Lucro</option>
              <option value="dy">Maior Dividend Yield</option>
              <option value="ticker">Ticker (A-Z)</option>
            </select>
          </div>
        </div>

        {posicoesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">Nenhum ativo encontrado</p>
            <p className="text-xs text-muted-foreground">
              {posicoes.length === 0
                ? "Sua carteira está vazia. Comece cadastrando seu primeiro ativo!"
                : "Tente ajustar os filtros ou termos da pesquisa."}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setAtivoParaEditar(null);
                setOpenAtivoDialog(true);
              }}
              className="mt-4 gap-1.5"
            >
              <Plus className="size-4" />
              Novo Ativo
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-right [&>th:first-child]:text-left">
                  <th>Ativo</th>
                  <th>Classe</th>
                  <th>Qtd.</th>
                  <th>Preço Médio</th>
                  <th>Cotação</th>
                  <th>Posição</th>
                  <th>Resultado</th>
                  <th>DY 12m</th>
                  <th>Renda/ano</th>
                  <th className="w-10 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {posicoesFiltradas.map((p) => {
                  const badge = classeBadges[p.classe] || {
                    bg: "bg-elevated",
                    text: "text-foreground",
                  };
                  return (
                    <tr
                      key={p.ticker}
                      className="border-t border-border/50 transition-colors hover:bg-elevated/40 [&>td]:px-4 [&>td]:py-3 [&>td]:text-right [&>td:first-child]:text-left"
                    >
                      <td>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {p.ticker}
                          {p.dpaProjetado && p.dpaProjetado > 0 && p.precoAtual < (p.dpaProjetado / 0.06) && (
                            <span title={`Preço Teto: ${formatBrl(p.dpaProjetado / 0.06)}`} className="rounded bg-positive/15 px-1.5 py-0.5 text-[10px] font-bold text-positive uppercase tracking-wider">
                              Oportunidade
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {p.nome} · {p.setor}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          {p.classe}
                        </span>
                      </td>
                      <td className="tabular-nums font-medium">{p.quantidade}</td>
                      <td className="tabular-nums text-muted-foreground">
                        {formatBrl(p.precoMedio)}
                      </td>
                      <td className="tabular-nums font-medium">{formatBrl(p.precoAtual)}</td>
                      <td className="tabular-nums font-semibold text-foreground">
                        {formatBrl(p.atual)}
                      </td>
                      <td
                        className={`tabular-nums font-medium ${
                          p.lucro >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatBrl(p.lucro)}
                        <span className="ml-1 text-xs">({pct(p.variacao)})</span>
                      </td>
                      <td className="tabular-nums font-medium text-foreground">
                        {p.dyAno.toFixed(1)}%
                      </td>
                      <td className="tabular-nums text-positive font-medium">
                        {formatBrl(p.rendaAno)}
                      </td>
                      <td className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleNovaOperacao(p.ticker)}>
                              <ArrowUpDown className="mr-2 size-4 text-primary" />
                              Lançar Aporte / Venda
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditar(p)}>
                              <Edit2 className="mr-2 size-4 text-muted-foreground" />
                              Editar Ativo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteAtivo(p.ticker)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Excluir Ativo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modais Base */}
      <AtivoDialog
        open={openAtivoDialog}
        onOpenChange={setOpenAtivoDialog}
        ativoParaEditar={ativoParaEditar || undefined}
      />
      <TransacaoDialog
        open={openTransacaoDialog}
        onOpenChange={setOpenTransacaoDialog}
        tickerInicial={tickerTransacao}
      />
      <ImportarCSVDialog open={openImportarDialog} onOpenChange={setOpenImportarDialog} />
    </AppShell>
  );
}
