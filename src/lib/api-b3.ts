import { createServerFn } from '@tanstack/react-start'

export const fetchQuotes = createServerFn({ method: 'GET' })
  .validator((tickers: string[]) => tickers)
  .handler(async ({ data: tickers }) => {
    if (!tickers || tickers.length === 0) return {};

    const results: Record<string, number> = {};

    try {
      // Yahoo Finance supports multiple tickers if we use a different endpoint, 
      // but v8/finance/chart is per-symbol. Let's do a Promise.all for them.
      // Or we can use the v7/finance/quote?symbols=PETR4.SA,VALE3.SA
      const queryTickers = tickers.map((t) => `${t.toUpperCase()}.SA`).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${queryTickers}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance retornou status ${response.status}`);
      }

      const json = await response.json();

      if (json.quoteResponse && json.quoteResponse.result) {
        json.quoteResponse.result.forEach((item: any) => {
          if (item.symbol) {
            const tickerOriginal = item.symbol.replace('.SA', '');
            results[tickerOriginal] = item.regularMarketPrice;
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar cotações na B3:', error);
    }

    return results;
  });
