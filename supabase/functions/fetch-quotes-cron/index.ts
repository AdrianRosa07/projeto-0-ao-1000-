import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface BrapiResult {
  symbol: string;
  regularMarketPrice: number;
}

interface BrapiResponse {
  results?: BrapiResult[];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Pegar tickers únicos dos ativos
    const { data: ativos, error: ativosError } = await supabase
      .from("ativos")
      .select("ticker");

    if (ativosError) throw ativosError;

    const uniqueTickers = Array.from(
      new Set(ativos.map((a) => a.ticker.trim().toUpperCase()).filter(Boolean))
    );

    if (uniqueTickers.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum ticker para atualizar" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Chamar a Brapi um por um (Plano Gratuito só permite 1 ticker por chamada)
    const upsertData: { ticker: string; preco: number }[] = [];

    for (const ticker of uniqueTickers) {
      try {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`;
        const brapiRes = await fetch(url);
        
        if (!brapiRes.ok) {
          console.error(`Erro ao buscar ${ticker}: Status ${brapiRes.status}`);
          continue;
        }

        const json = (await brapiRes.json()) as BrapiResponse;
        
        if (json.results && json.results[0] && json.results[0].regularMarketPrice != null) {
          upsertData.push({
            ticker: json.results[0].symbol || ticker,
            preco: json.results[0].regularMarketPrice,
          });
        }
        
        // Pequeno delay para evitar Rate Limit (rajada) da API
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.error(`Erro na requisição do ticker ${ticker}:`, err);
      }
    }

    if (upsertData.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma cotação retornada pela API" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Fazer upsert na tabela cotacoes_cache
    const { error: upsertError } = await supabase
      .from("cotacoes_cache")
      .upsert(upsertData, { onConflict: "ticker" });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        message: "Cotações atualizadas com sucesso",
        count: upsertData.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
