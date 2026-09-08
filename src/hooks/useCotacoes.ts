import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useCotacoes(tickers: string[]) {
  // Limpa e deduplica os tickers
  const tickersUnicos = Array.from(
    new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
  );

  return useQuery({
    queryKey: ["cotacoes", tickersUnicos],
    queryFn: async () => {
      if (tickersUnicos.length === 0) return {};

      try {
        const { data, error } = await supabase
          .from("cotacoes_cache")
          .select("ticker, preco")
          .in("ticker", tickersUnicos);

        if (error) {
          throw error;
        }

        const results: Record<string, number> = {};
        if (data) {
          data.forEach((row) => {
            results[row.ticker] = Number(row.preco);
          });
        }
        return results;
      } catch (error) {
        console.error("Falha ao buscar cotações pelo hook:", error);
        return {};
      }
    },
    // Buscar apenas se tiver pelo menos 1 ticker
    enabled: tickersUnicos.length > 0,
    // Busca menos agressiva (a cada 15 min - 900000ms), 
    // já que o cache será atualizado por cron
    refetchInterval: 900000,
    // Mantém no cache por 10 min
    staleTime: 600000,
  });
}
