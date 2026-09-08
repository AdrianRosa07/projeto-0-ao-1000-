-- Tabela de Cache de Cotações
create table public.cotacoes_cache (
    ticker text primary key,
    preco numeric not null,
    atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativa RLS, mas permite leitura para todos os usuários logados
alter table public.cotacoes_cache enable row level security;
create policy "Todos os usuários podem ler cotações" on public.cotacoes_cache for select using (auth.role() = 'authenticated');
