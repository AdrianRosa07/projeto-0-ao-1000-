import { useQuery } from "@tanstack/react-query";
import { fetchQuotes } from "@/lib/api-b3";

export function useCotacoes(tickers: string[]) {
  // Limpa e deduplica os tickers
  const tickersUnicos = Array.from(
    new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))
  );

  return useQuery({
    queryKey: ["cotacoes", tickersUnicos],
    queryFn: async () => {
      if (tickersUnicos.length === 0) return {};
      
      try {
        const results = await fetchQuotes({ data: tickersUnicos });
        return results;
      } catch (error) {
        console.error("Falha ao buscar cotações pelo hook:", error);
        return {};
      }
    },
    // Buscar apenas se tiver pelo menos 1 ticker
    enabled: tickersUnicos.length > 0,
    // Atualiza a cada 2 minutos (120000 ms)
    refetchInterval: 120000,
    // Mantém no cache
    staleTime: 60000,
  });
}
