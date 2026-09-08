import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Formatar mes_ano atual, ex: "09/2026"
    const now = new Date();
    const mes_ano = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    // 1. Pegar cotações em cache
    const { data: cotacoes, error: cotacoesError } = await supabase
      .from("cotacoes_cache")
      .select("ticker, preco");

    if (cotacoesError) throw cotacoesError;
    const cotacaoMap = new Map(cotacoes.map((c) => [c.ticker, c.preco]));

    // 2. Pegar todos os ativos de todos os usuários
    const { data: ativos, error: ativosError } = await supabase
      .from("ativos")
      .select("id, user_id, ticker, quantidade");

    if (ativosError) throw ativosError;

    // 3. Pegar todas as transações para calcular o valor aportado total
    const { data: transacoes, error: transacoesError } = await supabase
      .from("transacoes")
      .select("user_id, tipo, quantidade, preco");

    if (transacoesError) throw transacoesError;

    // Agrupar por usuário
    const usersMap = new Map<string, { patrimonio: number; aportado: number }>();

    // Calcular patrimônio
    for (const ativo of ativos) {
      const p = cotacaoMap.get(ativo.ticker) || 0;
      const valor = ativo.quantidade * p;

      if (!usersMap.has(ativo.user_id)) {
        usersMap.set(ativo.user_id, { patrimonio: 0, aportado: 0 });
      }
      usersMap.get(ativo.user_id)!.patrimonio += valor;
    }

    // Calcular aportado
    for (const tx of transacoes) {
      const valorTx = tx.quantidade * tx.preco;
      
      if (!usersMap.has(tx.user_id)) {
        usersMap.set(tx.user_id, { patrimonio: 0, aportado: 0 });
      }
      
      if (tx.tipo === "compra") {
        usersMap.get(tx.user_id)!.aportado += valorTx;
      } else {
        usersMap.get(tx.user_id)!.aportado -= valorTx;
      }
    }

    // 4. Preparar upsert no historico_patrimonio
    const upsertData = Array.from(usersMap.entries()).map(([user_id, totais]) => ({
      user_id,
      mes_ano,
      valor_patrimonio: totais.patrimonio,
      valor_aportado: totais.aportado,
    }));

    if (upsertData.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum dado para salvar" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { error: upsertError } = await supabase
      .from("historico_patrimonio")
      .upsert(upsertData, { onConflict: "user_id, mes_ano" });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        message: "Snapshots mensais criados com sucesso",
        count: upsertData.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na Edge Function de Snapshot:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
