import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { z } from "zod";
import { useCotacoes } from "../hooks/useCotacoes";
import {
  ativos as initialAtivos,
  metaPorClasse as initialMetas,
  evolucaoPatrimonio as initialEvolucao,
  proventosMensais as initialProventosMensais,
  proventosRecebidos as initialProventosRecebidos,
  proximosProventos as initialProximosProventos,
  type Ativo,
  type Classe,
} from "./portfolio-data";

export type { Ativo, Classe };

export interface Transacao {
  id: string;
  data: string; // YYYY-MM-DD
  ticker: string;
  tipo: "compra" | "venda";
  quantidade: number;
  precoUnitario: number;
  taxas?: number | undefined;
  notas?: string | undefined;
}

export interface ProventoRegistro {
  id: string;
  data: string; // DD/MM/AAAA ou YYYY-MM-DD
  ticker: string;
  tipo: "Dividendo" | "JCP" | "Rendimento" | "Amortização";
  valor: number;
  status: "Recebido" | "Anunciado" | "Previsto";
}

export interface PosicaoEnriquecida extends Ativo {
  investido: number;
  atual: number;
  lucro: number;
  variacao: number;
  rendaAno: number;
  peso: number;
}

export interface AlocacaoClasse {
  classe: Classe;
  valor: number;
  peso: number;
}

export interface SugestaoAporte extends AlocacaoClasse {
  meta: number;
  falta: number;
  sugestao: number;
}

interface PortfolioState {
  ativos: Ativo[];
  transacoes: Transacao[];
  proventos: ProventoRegistro[];
  metas: Record<string, number>;
  modoPrivacidade: boolean;
  isHydrated: boolean;
}

export const ativoSchema = z.object({
  ticker: z.string(),
  nome: z.string(),
  classe: z.enum(["Ação", "FII", "Stock", "REIT", "Renda Fixa"] as const),
  setor: z.string(),
  quantidade: z.number().min(0),
  precoMedio: z.number().min(0),
  precoAtual: z.number().min(0),
  dyAno: z.number().min(0),
  proventos12m: z.number().min(0),
  notaFundamentalista: z.number().min(0).max(10),
});

export const transacaoSchema = z.object({
  id: z.string(),
  data: z.string(),
  ticker: z.string(),
  tipo: z.enum(["compra", "venda"]),
  quantidade: z.number().positive(),
  precoUnitario: z.number().positive(),
  taxas: z.number().optional(),
  notas: z.string().optional(),
});

export const proventoRegistroSchema = z.object({
  id: z.string(),
  data: z.string(),
  ticker: z.string(),
  tipo: z.enum(["Dividendo", "JCP", "Rendimento", "Amortização"]),
  valor: z.number().positive(),
  status: z.enum(["Recebido", "Anunciado", "Previsto"]),
});

export const metasSchema = z.record(z.string(), z.number());


interface PortfolioContextType extends PortfolioState {
  // Ações de Ativos
  addAtivo: (ativo: Ativo) => void;
  updateAtivo: (ticker: string, updates: Partial<Ativo>) => void;
  deleteAtivo: (ticker: string) => void;

  // Ações de Transações
  registrarTransacao: (transacao: Omit<Transacao, "id">) => void;
  deleteTransacao: (id: string) => void;

  // Ações de Proventos
  registrarProvento: (provento: Omit<ProventoRegistro, "id">) => void;
  deleteProvento: (id: string) => void;

  // Metas & Configurações
  updateMetas: (novasMetas: Record<string, number>) => void;
  togglePrivacidade: () => void;
  resetDemoData: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;

  // Métricas Calculadas
  posicoes: PosicaoEnriquecida[];
  patrimonio: number;
  totalInvestido: number;
  lucroTotal: number;
  rentabilidade: number;
  rendaAnual: number;
  rendaMensal: number;
  yieldOnCost: number;
  alocacaoPorClasse: AlocacaoClasse[];
  evolucaoPatrimonio: typeof initialEvolucao;
  proventosMensais: typeof initialProventosMensais;
  proventosRecebidos: ProventoRegistro[];
  proximosProventos: ProventoRegistro[];
  sugerirAporte: (valor: number) => SugestaoAporte[];
  formatBrl: (valor: number, options?: { forceShow?: boolean }) => string;
  isLoadingCotacoes: boolean;
}

const STORAGE_KEY = "rendaviva_portfolio_v1";

const initialProventosNormalized: ProventoRegistro[] = [
  ...initialProventosRecebidos.map((p, idx) => ({
    id: `rec-${idx}-${p.ticker}`,
    data: p.data,
    ticker: p.ticker,
    tipo: p.tipo as ProventoRegistro["tipo"],
    valor: p.valor,
    status: "Recebido" as const,
  })),
  ...initialProximosProventos.map((p, idx) => ({
    id: `prox-${idx}-${p.ticker}`,
    data: p.data,
    ticker: p.ticker,
    tipo: p.tipo as ProventoRegistro["tipo"],
    valor: p.valor,
    status: p.status as ProventoRegistro["status"],
  })),
];

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [ativos, setAtivos] = useState<Ativo[]>(initialAtivos);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [proventos, setProventos] = useState<ProventoRegistro[]>(initialProventosNormalized);
  const [metas, setMetas] = useState<Record<string, number>>(initialMetas);
  const [modoPrivacidade, setModoPrivacidade] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hook para buscar cotações em tempo real
  const { data: cotacoes, isFetching: isLoadingCotacoes } = useCotacoes(ativos.map(a => a.ticker));

  // Carregar do LocalStorage na montagem (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        
        const ativosParsed = z.array(ativoSchema).safeParse(parsed.ativos);
        if (ativosParsed.success) setAtivos(ativosParsed.data);
        else console.warn("Ativos no localStorage falharam na validação.", ativosParsed.error);
        
        const transacoesParsed = z.array(transacaoSchema).safeParse(parsed.transacoes);
        if (transacoesParsed.success) setTransacoes(transacoesParsed.data);
        else console.warn("Transações no localStorage falharam na validação.", transacoesParsed.error);
        
        const proventosParsed = z.array(proventoRegistroSchema).safeParse(parsed.proventos);
        if (proventosParsed.success) setProventos(proventosParsed.data);
        else console.warn("Proventos no localStorage falharam na validação.", proventosParsed.error);
        
        const metasParsed = metasSchema.safeParse(parsed.metas);
        if (metasParsed.success) setMetas(metasParsed.data);
        else console.warn("Metas no localStorage falharam na validação.", metasParsed.error);
        
        if (typeof parsed.modoPrivacidade === "boolean") setModoPrivacidade(parsed.modoPrivacidade);
      }
    } catch (e) {
      console.warn("Falha ao ler dados salvos no LocalStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Salvar no LocalStorage sempre que houver mudanças após a hidratação
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const payload = {
        ativos,
        transacoes,
        proventos,
        metas,
        modoPrivacidade,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Erro ao salvar no LocalStorage:", e);
    }
  }, [ativos, transacoes, proventos, metas, modoPrivacidade, isHydrated]);

  // Ações de Ativos
  const addAtivo = (novo: Ativo) => {
    const formattedTicker = novo.ticker.toUpperCase().trim();
    setAtivos((prev) => {
      const index = prev.findIndex((a) => a.ticker.toUpperCase() === formattedTicker);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { ...novo, ticker: formattedTicker };
        return copy;
      }
      return [...prev, { ...novo, ticker: formattedTicker }];
    });
  };

  const updateAtivo = (ticker: string, updates: Partial<Ativo>) => {
    const searchTicker = ticker.toUpperCase();
    setAtivos((prev) =>
      prev.map((a) => (a.ticker.toUpperCase() === searchTicker ? { ...a, ...updates } : a)),
    );
  };

  const deleteAtivo = (ticker: string) => {
    const searchTicker = ticker.toUpperCase();
    setAtivos((prev) => prev.filter((a) => a.ticker.toUpperCase() !== searchTicker));
  };

  // Ações de Transações com recálculo automático de preço médio
  const registrarTransacao = (tx: Omit<Transacao, "id">) => {
    const id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newTx: Transacao = { ...tx, id, ticker: tx.ticker.toUpperCase().trim() };

    setTransacoes((prev) => [newTx, ...prev]);

    // Recalcular posição do ativo
    setAtivos((prev) => {
      const index = prev.findIndex((a) => a.ticker.toUpperCase() === newTx.ticker);
      if (index === -1) {
        // Se for compra de um ativo ainda não cadastrado, cria automaticamente
        if (newTx.tipo === "compra") {
          return [
            ...prev,
            {
              ticker: newTx.ticker,
              nome: newTx.ticker,
              classe: "Ação",
              setor: "Geral",
              quantidade: newTx.quantidade,
              precoMedio: newTx.precoUnitario,
              precoAtual: newTx.precoUnitario,
              dyAno: 6.0,
              proventos12m: newTx.precoUnitario * 0.06,
              notaFundamentalista: 8.0,
            },
          ];
        }
        return prev;
      }

      const atual = prev[index]!;
      let novaQtd = atual.quantidade;
      let novoPM = atual.precoMedio;

      if (newTx.tipo === "compra") {
        const totalInvestidoAnterior = atual.quantidade * atual.precoMedio;
        const totalNovaCompra = newTx.quantidade * newTx.precoUnitario;
        novaQtd = atual.quantidade + newTx.quantidade;
        novoPM = novaQtd > 0 ? (totalInvestidoAnterior + totalNovaCompra) / novaQtd : 0;
      } else if (newTx.tipo === "venda") {
        novaQtd = Math.max(0, atual.quantidade - newTx.quantidade);
        // Na venda, o preço médio histórico de aquisição se mantém
      }

      const copy = [...prev];
      copy[index] = {
        ...atual,
        quantidade: novaQtd,
        precoMedio: Number(novoPM.toFixed(2)),
        // Se a transação tem cotação recente, atualiza preço atual
        precoAtual: newTx.precoUnitario || atual.precoAtual,
      };
      return copy;
    });
  };

  const deleteTransacao = (id: string) => {
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  };

  // Ações de Proventos
  const registrarProvento = (prov: Omit<ProventoRegistro, "id">) => {
    const id = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const novo: ProventoRegistro = { ...prov, id, ticker: prov.ticker.toUpperCase().trim() };
    setProventos((prev) => [novo, ...prev]);
  };

  const deleteProvento = (id: string) => {
    setProventos((prev) => prev.filter((p) => p.id !== id));
  };

  // Metas e Preferências
  const updateMetas = (novasMetas: Record<string, number>) => {
    setMetas(novasMetas);
  };

  const togglePrivacidade = () => {
    setModoPrivacidade((prev) => !prev);
  };

  const resetDemoData = () => {
    setAtivos(initialAtivos);
    setTransacoes([]);
    setProventos(initialProventosNormalized);
    setMetas(initialMetas);
    setModoPrivacidade(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const exportData = () => {
    const payload = {
      version: 1,
      exportDate: new Date().toISOString(),
      ativos,
      transacoes,
      proventos,
      metas,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      
      const ativosParsed = z.array(ativoSchema).safeParse(parsed.ativos);
      if (ativosParsed.success) setAtivos(ativosParsed.data);
      else throw new Error("Ativos inválidos no JSON importado");
      
      const transacoesParsed = z.array(transacaoSchema).safeParse(parsed.transacoes);
      if (transacoesParsed.success) setTransacoes(transacoesParsed.data);
      else throw new Error("Transações inválidas no JSON importado");
      
      const proventosParsed = z.array(proventoRegistroSchema).safeParse(parsed.proventos);
      if (proventosParsed.success) setProventos(proventosParsed.data);
      else throw new Error("Proventos inválidos no JSON importado");
      
      const metasParsed = metasSchema.safeParse(parsed.metas);
      if (metasParsed.success) setMetas(metasParsed.data);
      else throw new Error("Metas inválidas no JSON importado");
      
      return true;
    } catch (e) {
      console.error("Erro ao importar JSON:", e);
      return false;
    }
  };

  // Cálculos Derivados
  const totalInvestido = useMemo(() => {
    return ativos.reduce((s, a) => s + a.quantidade * a.precoMedio, 0);
  }, [ativos]);

  const patrimonio = useMemo(() => {
    return ativos.reduce((s, a) => {
      const preco = cotacoes?.[a.ticker] ?? a.precoAtual;
      return s + a.quantidade * preco;
    }, 0);
  }, [ativos, cotacoes]);

  const lucroTotal = patrimonio - totalInvestido;
  const rentabilidade = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;

  const rendaAnual = useMemo(() => {
    return ativos.reduce((s, a) => s + a.quantidade * a.proventos12m, 0);
  }, [ativos]);

  const rendaMensal = rendaAnual / 12;
  const yieldOnCost = totalInvestido > 0 ? (rendaAnual / totalInvestido) * 100 : 0;

  const posicoes: PosicaoEnriquecida[] = useMemo(() => {
    return ativos.map((a) => {
      const precoReal = cotacoes?.[a.ticker] ?? a.precoAtual;
      const investido = a.quantidade * a.precoMedio;
      const atual = a.quantidade * precoReal;
      const lucro = atual - investido;
      const variacao = investido > 0 ? (lucro / investido) * 100 : 0;
      const rendaAno = a.quantidade * a.proventos12m;
      const peso = patrimonio > 0 ? (atual / patrimonio) * 100 : 0;
      return {
        ...a,
        precoAtual: precoReal,
        investido,
        atual,
        lucro,
        variacao,
        rendaAno,
        peso,
      };
    });
  }, [ativos, cotacoes, patrimonio]);

  const alocacaoPorClasse: AlocacaoClasse[] = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const p of posicoes) {
      mapa[p.classe] = (mapa[p.classe] ?? 0) + p.atual;
    }
    return Object.entries(mapa).map(([classe, valor]) => ({
      classe: classe as Classe,
      valor,
      peso: patrimonio > 0 ? (valor / patrimonio) * 100 : 0,
    }));
  }, [posicoes, patrimonio]);

  const sugerirAporte = (valor: number): SugestaoAporte[] => {
    const classes: Classe[] = ["Ação", "FII", "Renda Fixa", "Stock", "REIT"];
    const patrimonioFuturo = patrimonio + valor;

    const linhas = classes.map((classe) => {
      const atualValor = posicoes
        .filter((p) => p.classe === classe)
        .reduce((s, p) => s + p.atual, 0);
      const pesoAtual = patrimonio > 0 ? (atualValor / patrimonio) * 100 : 0;
      const meta = metas[classe] ?? 0;
      const alvo = (meta / 100) * patrimonioFuturo;
      const falta = Math.max(alvo - atualValor, 0);

      return {
        classe,
        valor: atualValor,
        peso: pesoAtual,
        meta,
        falta,
        sugestao: 0,
      };
    });

    const totalFalta = linhas.reduce((s, l) => s + l.falta, 0) || 1;
    return linhas
      .map((l) => ({
        ...l,
        sugestao: (l.falta / totalFalta) * valor,
      }))
      .sort((a, b) => b.falta - a.falta);
  };

  // Histórico de proventos mensais agrupados por data
  const proventosMensais = useMemo(() => {
    // Agrupar proventos recebidos por mês
    const agregados: Record<string, number> = {};
    for (const p of proventos) {
      if (p.status !== "Recebido") continue;
      // Tratar data DD/MM/AAAA ou AAAA-MM-DD
      let chaveMes = "";
      if (p.data.includes("/")) {
        const parts = p.data.split("/");
        if (parts.length === 3) {
          const mesNum = parts[1];
          const anoCurto = parts[2]!.slice(-2);
          const mesesNome = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
          const idx = parseInt(mesNum!, 10) - 1;
          if (idx >= 0 && idx < 12) {
            chaveMes = `${mesesNome[idx]}/${anoCurto}`;
          }
        }
      } else if (p.data.includes("-")) {
        const parts = p.data.split("-");
        if (parts.length === 3) {
          const mesNum = parts[1];
          const anoCurto = parts[0]!.slice(-2);
          const mesesNome = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
          const idx = parseInt(mesNum!, 10) - 1;
          if (idx >= 0 && idx < 12) {
            chaveMes = `${mesesNome[idx]}/${anoCurto}`;
          }
        }
      }

      if (chaveMes) {
        agregados[chaveMes] = (agregados[chaveMes] ?? 0) + p.valor;
      }
    }

    // Se temos dados agregados dinâmicos, usamos eles ou mesclamos com o padrão
    if (Object.keys(agregados).length > 0) {
      return initialProventosMensais.map((item) => ({
        mes: item.mes,
        valor: agregados[item.mes] !== undefined ? agregados[item.mes]! : item.valor,
      }));
    }
    return initialProventosMensais;
  }, [proventos]);

  const proventosRecebidos = useMemo(() => {
    return proventos.filter((p) => p.status === "Recebido");
  }, [proventos]);

  const proximosProventos = useMemo(() => {
    return proventos.filter((p) => p.status !== "Recebido");
  }, [proventos]);

  // Formatação segura de moeda com modo de privacidade
  const formatBrl = (valor: number, options?: { forceShow?: boolean }): string => {
    if (modoPrivacidade && !options?.forceShow) {
      return "••••••";
    }
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    });
  };

  return (
    <PortfolioContext.Provider
      value={{
        ativos,
        transacoes,
        proventos,
        metas,
        modoPrivacidade,
        isHydrated,
        addAtivo,
        updateAtivo,
        deleteAtivo,
        registrarTransacao,
        deleteTransacao,
        registrarProvento,
        deleteProvento,
        updateMetas,
        togglePrivacidade,
        resetDemoData,
        exportData,
        importData,
        posicoes,
        patrimonio,
        totalInvestido,
        lucroTotal,
        rentabilidade,
        rendaAnual,
        rendaMensal,
        yieldOnCost,
        alocacaoPorClasse,
        evolucaoPatrimonio: initialEvolucao,
        proventosMensais,
        proventosRecebidos,
        proximosProventos,
        sugerirAporte,
        formatBrl,
        isLoadingCotacoes,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio deve ser usado dentro de um <PortfolioProvider>");
  }
  return ctx;
}
