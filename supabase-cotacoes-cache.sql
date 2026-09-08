-- Tabela de Cache de Cotações
create table public.cotacoes_cache (
    ticker text primary key,
    preco numeric not null,
    atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativa RLS, mas permite leitura para todos os usuários logados
alter table public.cotacoes_cache enable row level security;
create policy "Todos os usuários podem ler cotações" on public.cotacoes_cache for select using (auth.role() = 'authenticated');

-- Configuração do Cron Job (Executar via SQL Editor no painel do Supabase)
-- NOTA: Habilite as extensões 'pg_net' e 'pg_cron' no seu painel antes de rodar.
/*
select cron.schedule(
  'atualizar-cotacoes',
  '0 * * * *', -- a cada hora (1x por hora para poupar o limite da Brapi)
  $$ select net.http_post(
       url:='https://SEU_PROJETO.supabase.co/functions/v1/fetch-quotes-cron',
       headers:='{"Authorization": "Bearer SEU_SERVICE_ROLE_KEY"}'::jsonb
     ) $$
);
*/
