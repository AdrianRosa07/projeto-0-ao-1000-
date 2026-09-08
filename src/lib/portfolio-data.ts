export type Classe = "Ação" | "FII" | "Stock" | "REIT" | "Renda Fixa";

export type Ativo = {
  ticker: string;
  nome: string;
  classe: Classe;
  setor: string;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  dyAno: number; // dividend yield 12m em %
  dpaProjetado?: number; // dividendo por ação projetado
  proventos12m: number; // por cota/ação
  notaFundamentalista: number; // 0-10
};

export const ativos: Ativo[] = [
  {
    ticker: "ITSA4",
    nome: "Itaúsa",
    classe: "Ação",
    setor: "Financeiro",
    quantidade: 1200,
    precoMedio: 8.42,
    precoAtual: 11.16,
    dyAno: 7.8,
    proventos12m: 0.87,
    notaFundamentalista: 8.6,
  },
  {
    ticker: "BBAS3",
    nome: "Banco do Brasil",
    classe: "Ação",
    setor: "Financeiro",
    quantidade: 480,
    precoMedio: 24.9,
    precoAtual: 27.85,
    dyAno: 9.4,
    proventos12m: 2.62,
    notaFundamentalista: 8.2,
  },
  {
    ticker: "TAEE11",
    nome: "Taesa",
    classe: "Ação",
    setor: "Energia",
    quantidade: 300,
    precoMedio: 33.1,
    precoAtual: 35.4,
    dyAno: 8.9,
    proventos12m: 3.15,
    notaFundamentalista: 7.9,
  },
  {
    ticker: "EGIE3",
    nome: "Engie Brasil",
    classe: "Ação",
    setor: "Energia",
    quantidade: 210,
    precoMedio: 41.2,
    precoAtual: 44.7,
    dyAno: 6.1,
    proventos12m: 2.73,
    notaFundamentalista: 8.4,
  },
  {
    ticker: "MXRF11",
    nome: "Maxi Renda",
    classe: "FII",
    setor: "Papel",
    quantidade: 2400,
    precoMedio: 9.85,
    precoAtual: 10.32,
    dyAno: 11.7,
    proventos12m: 1.21,
    notaFundamentalista: 7.1,
  },
  {
    ticker: "HGLG11",
    nome: "CSHG Logística",
    classe: "FII",
    setor: "Logística",
    quantidade: 95,
    precoMedio: 152.4,
    precoAtual: 165.8,
    dyAno: 8.6,
    proventos12m: 14.26,
    notaFundamentalista: 8.8,
  },
  {
    ticker: "KNRI11",
    nome: "Kinea Renda",
    classe: "FII",
    setor: "Híbrido",
    quantidade: 60,
    precoMedio: 148.9,
    precoAtual: 156.2,
    dyAno: 8.1,
    proventos12m: 12.65,
    notaFundamentalista: 8.3,
  },
  {
    ticker: "O",
    nome: "Realty Income",
    classe: "REIT",
    setor: "Varejo EUA",
    quantidade: 40,
    precoMedio: 291.5,
    precoAtual: 316.4,
    dyAno: 5.4,
    proventos12m: 17.08,
    notaFundamentalista: 8.0,
  },
  {
    ticker: "JNJ",
    nome: "Johnson & Johnson",
    classe: "Stock",
    setor: "Saúde EUA",
    quantidade: 18,
    precoMedio: 812.3,
    precoAtual: 905.7,
    dyAno: 3.1,
    proventos12m: 28.07,
    notaFundamentalista: 9.0,
  },
  {
    ticker: "TESOURO IPCA+ 2035",
    nome: "Tesouro IPCA+",
    classe: "Renda Fixa",
    setor: "Governo",
    quantidade: 12,
    precoMedio: 3120.0,
    precoAtual: 3388.5,
    dyAno: 6.3,
    proventos12m: 196.3,
    notaFundamentalista: 9.5,
  },
];

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

export const posicoes = ativos.map((a) => {
  const investido = a.quantidade * a.precoMedio;
  const atual = a.quantidade * a.precoAtual;
  return {
    ...a,
    investido,
    atual,
    lucro: atual - investido,
    variacao: ((atual - investido) / investido) * 100,
    rendaAno: a.quantidade * a.proventos12m,
  };
});

export const totalInvestido = posicoes.reduce((s, p) => s + p.investido, 0);
export const patrimonio = posicoes.reduce((s, p) => s + p.atual, 0);
export const lucroTotal = patrimonio - totalInvestido;
export const rentabilidade = (lucroTotal / totalInvestido) * 100;
export const rendaAnual = posicoes.reduce((s, p) => s + p.rendaAno, 0);
export const rendaMensal = rendaAnual / 12;
export const yieldOnCost = (rendaAnual / totalInvestido) * 100;

export const alocacaoPorClasse = Object.entries(
  posicoes.reduce<Record<string, number>>((acc, p) => {
    acc[p.classe] = (acc[p.classe] ?? 0) + p.atual;
    return acc;
  }, {}),
).map(([classe, valor]) => ({ classe, valor, peso: (valor / patrimonio) * 100 }));

export const metaPorClasse: Record<string, number> = {
  Ação: 40,
  FII: 30,
  "Renda Fixa": 15,
  Stock: 10,
  REIT: 5,
};

export const evolucaoPatrimonio = [
  { mes: "set/25", aportado: 168000, patrimonio: 172400 },
  { mes: "out/25", aportado: 174000, patrimonio: 179900 },
  { mes: "nov/25", aportado: 180000, patrimonio: 184200 },
  { mes: "dez/25", aportado: 186500, patrimonio: 195800 },
  { mes: "jan/26", aportado: 192500, patrimonio: 201300 },
  { mes: "fev/26", aportado: 198000, patrimonio: 199100 },
  { mes: "mar/26", aportado: 204500, patrimonio: 212600 },
  { mes: "abr/26", aportado: 210000, patrimonio: 221400 },
  { mes: "mai/26", aportado: 216500, patrimonio: 226900 },
  { mes: "jun/26", aportado: 222000, patrimonio: 238500 },
  { mes: "jul/26", aportado: 228500, patrimonio: 244100 },
  { mes: "ago/26", aportado: 234000, patrimonio: 256300 },
];

export const proventosMensais = [
  { mes: "set/25", valor: 1180 },
  { mes: "out/25", valor: 1245 },
  { mes: "nov/25", valor: 1390 },
  { mes: "dez/25", valor: 2160 },
  { mes: "jan/26", valor: 1310 },
  { mes: "fev/26", valor: 1425 },
  { mes: "mar/26", valor: 1688 },
  { mes: "abr/26", valor: 1520 },
  { mes: "mai/26", valor: 1747 },
  { mes: "jun/26", valor: 2290 },
  { mes: "jul/26", valor: 1832 },
  { mes: "ago/26", valor: 1961 },
];

export const proventosRecebidos = [
  { data: "05/08/2026", ticker: "MXRF11", tipo: "Rendimento", valor: 242.4 },
  { data: "07/08/2026", ticker: "HGLG11", tipo: "Rendimento", valor: 114.0 },
  { data: "12/08/2026", ticker: "KNRI11", tipo: "Rendimento", valor: 63.6 },
  { data: "15/08/2026", ticker: "BBAS3", tipo: "JCP", valor: 318.2 },
  { data: "20/08/2026", ticker: "ITSA4", tipo: "Dividendo", valor: 261.0 },
  { data: "22/08/2026", ticker: "TAEE11", tipo: "JCP", valor: 236.3 },
  { data: "28/08/2026", ticker: "O", tipo: "Dividendo", valor: 165.9 },
  { data: "31/08/2026", ticker: "EGIE3", tipo: "Dividendo", valor: 149.8 },
];

export const proximosProventos = [
  { data: "05/09/2026", ticker: "MXRF11", tipo: "Rendimento", valor: 249.6, status: "Anunciado" },
  { data: "08/09/2026", ticker: "HGLG11", tipo: "Rendimento", valor: 118.8, status: "Anunciado" },
  { data: "18/09/2026", ticker: "JNJ", tipo: "Dividendo", valor: 128.4, status: "Previsto" },
  { data: "25/09/2026", ticker: "TAEE11", tipo: "JCP", valor: 240.0, status: "Previsto" },
];

/** Sugestão de aporte: prioriza a classe mais distante da meta. */
export function sugerirAporte(valor: number) {
  const patrimonioFuturo = patrimonio + valor;
  const linhas = alocacaoPorClasse
    .map((a) => {
      const meta = metaPorClasse[a.classe] ?? 0;
      const alvo = (meta / 100) * patrimonioFuturo;
      return { ...a, meta, falta: Math.max(alvo - a.valor, 0) };
    })
    .sort((a, b) => b.falta - a.falta);

  const totalFalta = linhas.reduce((s, l) => s + l.falta, 0) || 1;
  return linhas.map((l) => ({
    ...l,
    sugestao: (l.falta / totalFalta) * valor,
  }));
}
