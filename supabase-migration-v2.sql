-- Migração V2 para alinhar o schema com a lógica do frontend

-- 1. Modificar a tabela transacoes para usar 'ticker' ao invés de 'ativo_id'
ALTER TABLE public.transacoes 
DROP COLUMN IF EXISTS ativo_id CASCADE;

ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS ticker text NOT NULL;

-- 2. Modificar a tabela proventos para usar 'ticker' ao invés de 'ativo_id'
ALTER TABLE public.proventos 
DROP COLUMN IF EXISTS ativo_id CASCADE;

ALTER TABLE public.proventos 
ADD COLUMN IF NOT EXISTS ticker text NOT NULL;

-- 3. Garantir que a tabela ativos tenha as colunas extras com os valores padrão corretos
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS classe text DEFAULT 'Ação';
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS dy_ano numeric DEFAULT 0;
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS proventos_12m numeric DEFAULT 0;
ALTER TABLE public.ativos ADD COLUMN IF NOT EXISTS nota_fundamentalista numeric DEFAULT 0;

-- 4. Criar restrição de unicidade para o upsert de ativos (user_id + ticker)
ALTER TABLE public.ativos 
DROP CONSTRAINT IF EXISTS unique_user_ticker;

ALTER TABLE public.ativos 
ADD CONSTRAINT unique_user_ticker UNIQUE (user_id, ticker);
