-- Tabela de Histórico de Patrimônio (Snapshots mensais)
create table public.historico_patrimonio (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    mes_ano text not null, -- Ex: "09/2026"
    valor_patrimonio numeric not null default 0,
    valor_aportado numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, mes_ano) -- Apenas 1 snapshot por mês por usuário
);

-- Ativa RLS
alter table public.historico_patrimonio enable row level security;

-- Políticas
create policy "Usuários podem ver seu próprio histórico" on public.historico_patrimonio for select using (auth.uid() = user_id);
create policy "Usuários podem inserir seu próprio histórico" on public.historico_patrimonio for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar seu próprio histórico" on public.historico_patrimonio for update using (auth.uid() = user_id);
create policy "Usuários podem deletar seu próprio histórico" on public.historico_patrimonio for delete using (auth.uid() = user_id);

-- Configuração do Cron Job para Snapshot Mensal (Executar via SQL Editor)
/*
select cron.schedule(
  'snapshot-patrimonio',
  '55 23 28-31 * *', -- Executa próximo do fim do mês
  $$ select net.http_post(
       url:='https://SEU_PROJETO.supabase.co/functions/v1/snapshot-patrimonio-cron',
       headers:='{"Authorization": "Bearer SEU_SERVICE_ROLE_KEY"}'::jsonb
     ) $$
);
*/
