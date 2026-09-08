import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { z } from "zod";
import { useCotacoes } from "../hooks/useCotacoes";
import { supabase } from "./supabase";
import { useAuth } from "./auth-store";
import { metaPorClasse as initialMetas, type Ativo, type Classe } from "./portfolio-data";

function getLast12Months() {
  const mesesNome = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const result = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mes = mesesNome[d.getMonth()];
    const ano = String(d.getFullYear()).slice(-2);
    result.push(`${mes}/${ano}`);
  }
  return result;
}

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
  dpaProjetado: number;
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
  dpaProjetado: z.number().min(0),
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
  addAtivo: (ativo: Ativo) => Promise<void>;
  updateAtivo: (ticker: string, updates: Partial<Ativo>) => Promise<void>;
  deleteAtivo: (ticker: string) => Promise<void>;

  // Ações de Transações
  registrarTransacao: (transacao: Omit<Transacao, "id">) => Promise<void>;
  deleteTransacao: (id: string) => Promise<void>;

  // Ações de Proventos
  registrarProvento: (provento: Omit<ProventoRegistro, "id">) => Promise<void>;
  deleteProvento: (id: string) => Promise<void>;

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
  evolucaoPatrimonio: { mes: string; patrimonio: number; aportado: number }[];
  proventosMensais: { mes: string; valor: number }[];
  proventosRecebidos: ProventoRegistro[];
  proximosProventos: ProventoRegistro[];
  sugerirAporte: (valor: number) => SugestaoAporte[];
  formatBrl: (valor: number, options?: { forceShow?: boolean }) => string;
  isLoadingCotacoes: boolean;
}

const STORAGE_KEY = "rendaviva_portfolio_v1";

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [proventos, setProventos] = useState<ProventoRegistro[]>([]);
  const [historicoPatrimonio, setHistoricoPatrimonio] = useState<any[]>([]);
  const [metas, setMetas] = useState<Record<string, number>>(initialMetas);
  const [modoPrivacidade, setModoPrivacidade] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hook para buscar cotações em tempo real
  const { data: cotacoes, isFetching: isLoadingCotacoes } = useCotacoes(
    ativos.map((a) => a.ticker),
  );

  // Carregar do Supabase e configs locais
  useEffect(() => {
    // 1. Carregar configurações locais
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.metas) setMetas(parsed.metas);
        if (typeof parsed.modoPrivacidade === "boolean") setModoPrivacidade(parsed.modoPrivacidade);
      }
    } catch (e) {
      console.warn("Falha ao ler config local:", e);
    }

    // 2. Carregar dados do banco se logado
    if (!user) {
      setAtivos([]);
      setTransacoes([]);
      setProventos([]);
      setIsHydrated(true);
      return;
    }

    const fetchSupabase = async () => {
      try {
        const [resAtivos, resTx, resProv, resHist] = await Promise.all([
          supabase.from("ativos").select("*").eq("user_id", user.id),
          supabase.from("transacoes").select("*").eq("user_id", user.id),
          supabase.from("proventos").select("*").eq("user_id", user.id),
          supabase.from("historico_patrimonio").select("*").eq("user_id", user.id),
        ]);

        if (resAtivos.data) {
          setAtivos(
            resAtivos.data.map((a) => ({
              ticker: a.ticker,
              nome: a.nome || a.ticker,
              classe: (a.classe as Classe) || "Ação",
              setor: a.setor || "Geral",
              quantidade: Number(a.quantidade),
              precoMedio: Number(a.preco_medio),
              precoAtual: Number(a.preco_medio),
              dyAno: a.dy_ano ? Number(a.dy_ano) : 0,
              dpaProjetado: a.dpa_projetado ? Number(a.dpa_projetado) : 0,
              proventos12m: a.proventos_12m ? Number(a.proventos_12m) : 0,
              notaFundamentalista: a.nota_fundamentalista ? Number(a.nota_fundamentalista) : 0,
            })),
          );
        }

        if (resTx.data) {
          setTransacoes(
            resTx.data.map((t) => ({
              id: t.id,
              data: t.data,
              ticker: t.ticker,
              tipo: t.tipo as "compra" | "venda",
              quantidade: Number(t.quantidade),
              precoUnitario: Number(t.preco),
            })),
          );
        }

        if (resProv.data) {
          setProventos(
            resProv.data.map((p) => ({
              id: p.id,
              data: p.data_pagamento,
              ticker: p.ticker,
              tipo: p.tipo as ProventoRegistro["tipo"],
              valor: Number(p.valor_total),
              status: p.status as "Pendente" | "Recebido",
            })),
          );
        }

        if (resHist.data) {
          setHistoricoPatrimonio(resHist.data);
        }

        setIsHydrated(true);
      } catch (e) {
        console.error("Erro ao carregar dados remotos:", e);
      } finally {
        setIsHydrated(true);
      }
    };

    fetchSupabase();
  }, [user]);

  // Salvar no LocalStorage somente as configurações locais
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const payload = { metas, modoPrivacidade };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Erro ao salvar no LocalStorage:", e);
    }
  }, [metas, modoPrivacidade, isHydrated]);

  // Ações de Ativos
  const addAtivo = async (novo: Ativo) => {
    if (!user) return;
    const formattedTicker = novo.ticker.toUpperCase().trim();

    const { error } = await supabase.from("ativos").upsert(
      {
        user_id: user.id,
        ticker: formattedTicker,
        nome: novo.nome,
        classe: novo.classe,
        setor: novo.setor,
        quantidade: novo.quantidade,
        preco_medio: novo.precoMedio,
        dy_ano: novo.dyAno,
        dpa_projetado: novo.dpaProjetado,
        proventos_12m: novo.proventos12m,
        nota_fundamentalista: novo.notaFundamentalista,
      },
      { onConflict: "user_id,ticker" },
    );

    if (error) {
      throw new Error(error.message);
    }
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

  const updateAtivo = async (ticker: string, updates: Partial<Ativo>) => {
    if (!user) return;
    const searchTicker = ticker.toUpperCase();

    const payload: Record<string, unknown> = {};
    if (updates["quantidade"] !== undefined) payload["quantidade"] = updates["quantidade"];
    if (updates["precoMedio"] !== undefined) payload["preco_medio"] = updates["precoMedio"];
    if (updates["classe"] !== undefined) payload["classe"] = updates["classe"];
    if (updates["dyAno"] !== undefined) payload["dy_ano"] = updates["dyAno"];
    if (updates["dpaProjetado"] !== undefined) payload["dpa_projetado"] = updates["dpaProjetado"];
    if (updates["proventos12m"] !== undefined) payload["proventos_12m"] = updates["proventos12m"];
    if (updates["notaFundamentalista"] !== undefined)
      payload["nota_fundamentalista"] = updates["notaFundamentalista"];
    if (updates["nome"] !== undefined) payload["nome"] = updates["nome"];
    if (updates["setor"] !== undefined) payload["setor"] = updates["setor"];

    if (Object.keys(payload).length > 0) {
      await supabase
        .from("ativos")
        .update(payload)
        .eq("user_id", user.id)
        .eq("ticker", searchTicker);
    }

    setAtivos((prev) =>
      prev.map((a) => (a.ticker.toUpperCase() === searchTicker ? { ...a, ...updates } : a)),
    );
  };

  const deleteAtivo = async (ticker: string) => {
    if (!user) return;
    const searchTicker = ticker.toUpperCase();
    await supabase.from("ativos").delete().eq("user_id", user.id).eq("ticker", searchTicker);
    setAtivos((prev) => prev.filter((a) => a.ticker.toUpperCase() !== searchTicker));
  };

  // Ações de Transações com recálculo automático de preço médio
  const registrarTransacao = async (tx: Omit<Transacao, "id">) => {
    if (!user) return;
    const formattedTicker = tx.ticker.toUpperCase().trim();

    const { data, error } = await supabase
      .from("transacoes")
      .insert([
        {
          user_id: user.id,
          ticker: formattedTicker,
          tipo: tx.tipo,
          quantidade: tx.quantidade,
          preco: tx.precoUnitario,
          data: tx.data,
        },
      ])
      .select();

    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      throw new Error("Transação não retornou dados após inserção");
    }

    const newTx: Transacao = { ...tx, id: data[0].id, ticker: formattedTicker };
    setTransacoes((prev) => [newTx, ...prev]);

    // Recalcular posição do ativo
    setAtivos((prev) => {
      const index = prev.findIndex((a) => a.ticker.toUpperCase() === newTx.ticker);
      if (index === -1) {
        if (newTx.tipo === "compra") {
          const novoAtivo = {
            ticker: newTx.ticker,
            nome: newTx.ticker,
            classe: "Ação" as Classe,
            setor: "Geral",
            quantidade: newTx.quantidade,
            precoMedio: newTx.precoUnitario,
            precoAtual: newTx.precoUnitario,
            dyAno: 0,
            dpaProjetado: 0,
            proventos12m: 0,
            notaFundamentalista: 0,
          };

          supabase
            .from("ativos")
            .insert([
              {
                user_id: user.id,
                ticker: newTx.ticker,
                nome: newTx.ticker,
                setor: "Geral",
                quantidade: newTx.quantidade,
                preco_medio: newTx.precoUnitario,
              },
            ])
            .then();

          return [...prev, novoAtivo];
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
      }

      const copy = [...prev];
      copy[index] = {
        ...atual,
        quantidade: novaQtd,
        precoMedio: Number(novoPM.toFixed(2)),
        precoAtual: newTx.precoUnitario || atual.precoAtual,
      };

      supabase
        .from("ativos")
        .update({ quantidade: novaQtd, preco_medio: Number(novoPM.toFixed(2)) })
        .eq("user_id", user.id)
        .eq("ticker", atual.ticker)
        .then();

      return copy;
    });
  };

  const deleteTransacao = async (id: string) => {
    if (!user) return;
    await supabase.from("transacoes").delete().eq("user_id", user.id).eq("id", id);
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  };

  // Ações de Proventos
  const registrarProvento = async (prov: Omit<ProventoRegistro, "id">) => {
    if (!user) return;
    const formattedTicker = prov.ticker.toUpperCase().trim();

    const { data, error } = await supabase
      .from("proventos")
      .insert([
        {
          user_id: user.id,
          ticker: formattedTicker,
          tipo: prov.tipo,
          valor_total: prov.valor,
          data_pagamento: prov.data,
        },
      ])
      .select();

    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      throw new Error("Provento não retornou dados após inserção");
    }

    const novo: ProventoRegistro = { ...prov, id: data[0].id, ticker: formattedTicker };
    setProventos((prev) => [novo, ...prev]);
  };

  const deleteProvento = async (id: string) => {
    if (!user) return;
    await supabase.from("proventos").delete().eq("user_id", user.id).eq("id", id);
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
    setAtivos([]);
    setTransacoes([]);
    setProventos([]);
    setMetas(initialMetas);
    setModoPrivacidade(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to remove localStorage:", e);
    }
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
    const agregados: Record<string, number> = {};
    for (const p of proventos) {
      if (p.status !== "Recebido") continue;
      let chaveMes = "";
      if (p.data.includes("-")) {
        const parts = p.data.split("-");
        if (parts.length === 3) {
          const mesNum = parts[1] || "";
          const anoCurto = parts[0]?.slice(-2) || "";
          const mesesNome = [
            "jan",
            "fev",
            "mar",
            "abr",
            "mai",
            "jun",
            "jul",
            "ago",
            "set",
            "out",
            "nov",
            "dez",
          ];
          const idx = parseInt(mesNum, 10) - 1;
          if (idx >= 0 && idx < 12) {
            chaveMes = `${mesesNome[idx]}/${anoCurto}`;
          }
        }
      }
      if (chaveMes) agregados[chaveMes] = (agregados[chaveMes] ?? 0) + p.valor;
    }

    return getLast12Months().map((mes) => ({
      mes,
      valor: agregados[mes] || 0,
    }));
  }, [proventos]);

  // Evolução do patrimônio e aportes baseada no histórico de transações e snapshots
  const evolucaoPatrimonio = useMemo(() => {
    const months = getLast12Months();

    const parseMesAnoToDate = (mesAno: string) => {
      const [mesStr, anoStr] = mesAno.split("/");
      const mesesNome = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const monthIdx = mesStr ? mesesNome.indexOf(mesStr) : -1;
      const year = anoStr ? 2000 + parseInt(anoStr, 10) : 2000;
      if (monthIdx < 0 || monthIdx >= 12) return new Date(); // fallback
      // Dia zero = último dia do mês atual
      return new Date(year, monthIdx + 1, 0, 23, 59, 59);
    };

    return months.map((mes, idx) => {
      const endOfMonthDate = parseMesAnoToDate(mes);
      const isCurrentMonth = idx === months.length - 1;

      // Calcular o total aportado acumulado até este mês
      let aportadoAteMes = 0;
      for (const tx of transacoes) {
        const txDate = new Date(tx.data);
        if (txDate <= endOfMonthDate) {
          const valorTx = tx.quantidade * tx.precoUnitario;
          aportadoAteMes += tx.tipo === "compra" ? valorTx : -valorTx;
        }
      }
      aportadoAteMes = Math.max(0, aportadoAteMes); // Evita valores negativos

      // Buscar snapshot para o mês específico
      // O formato do historicoPatrimonio.mes_ano é "MM/YYYY" (ex: "09/2026")
      const mesNum = (endOfMonthDate.getMonth() + 1).toString().padStart(2, "0");
      const anoCompleto = endOfMonthDate.getFullYear();
      const dbMesAno = `${mesNum}/${anoCompleto}`;
      
      const snapshot = historicoPatrimonio.find(h => h.mes_ano === dbMesAno);

      // Se for o mês atual, a gente sempre usa o cálculo online de patrimônio.
      // Se tiver snapshot no passado, a gente usa o valor dele.
      // Se não tiver snapshot no passado (antigos), a gente usa aportadoAteMes como fallback
      let patrimonioNoMes = aportadoAteMes;
      
      if (isCurrentMonth) {
         patrimonioNoMes = Math.max(patrimonio, aportadoAteMes);
      } else if (snapshot) {
         patrimonioNoMes = snapshot.valor_patrimonio;
         // Podemos usar o aportado do snapshot também, se houver:
         // aportadoAteMes = snapshot.valor_aportado; 
      }

      return {
        mes,
        aportado: aportadoAteMes,
        patrimonio: patrimonioNoMes,
      };
    });
  }, [transacoes, patrimonio, historicoPatrimonio]);

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
        evolucaoPatrimonio,
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
