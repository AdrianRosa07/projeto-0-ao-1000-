-- Adiciona colunas extras necessárias para salvar os metadados dos ativos que antes ficavam no frontend
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS classe text DEFAULT 'Ação';
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS dy_ano numeric DEFAULT 0;
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS proventos_12m numeric DEFAULT 0;
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS nota_fundamentalista numeric DEFAULT 0;
