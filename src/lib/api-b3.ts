import { createServerFn } from '@tanstack/react-start'

export const fetchQuotes = createServerFn({ method: 'GET' })
  .validator((tickers: string[]) => tickers)
  .handler(async ({ data: tickers }) => {
    if (!tickers || tickers.length === 0) return {};

    const results: Record<string, number> = {};

    try {
      const queryTickers = tickers.map((t) => t.toUpperCase()).join(',');
      const token = import.meta.env.VITE_BRAPI_TOKEN;
      
      const url = `https://brapi.dev/api/quote/${queryTickers}${token ? `?token=${token}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Brapi retornou status ${response.status}`);
      }

      const json = await response.json();

      if (json.results) {
        json.results.forEach((item: any) => {
          if (item.symbol) {
            results[item.symbol] = item.regularMarketPrice;
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar cotações na Brapi:', error);
    }

    return results;
  });
