-- Limpeza (Opcional: caso tenha criado algo pela metade, limpa tudo para recriar perfeito)
drop table if exists public.transacoes;
drop table if exists public.proventos;
drop table if exists public.ativos;

-- Habilita a extensão UUID
create extension if not exists "uuid-ossp";

-- Tabela de Ativos
create table public.ativos (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    ticker text not null,
    nome text,
    setor text,
    classe text default 'Ação',
    quantidade numeric not null default 0,
    preco_medio numeric not null default 0,
    dy_ano numeric default 0,
    proventos_12m numeric default 0,
    nota_fundamentalista numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, ticker)
);

-- Tabela de Transações (AGORA COM TICKER EM VEZ DE ATIVO_ID)
create table public.transacoes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    ticker text not null,
    tipo text check (tipo in ('compra', 'venda')) not null,
    quantidade numeric not null,
    preco numeric not null,
    data date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Proventos (AGORA COM TICKER EM VEZ DE ATIVO_ID)
create table public.proventos (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    ticker text not null,
    tipo text not null,
    valor_total numeric not null,
    data_pagamento date not null,
    data_com date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) - Garante que usuários só vejam seus próprios dados
alter table public.ativos enable row level security;
alter table public.transacoes enable row level security;
alter table public.proventos enable row level security;

-- Políticas (Policies)
create policy "Usuários podem ver seus próprios ativos" on public.ativos for select using (auth.uid() = user_id);
create policy "Usuários podem inserir seus próprios ativos" on public.ativos for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar seus próprios ativos" on public.ativos for update using (auth.uid() = user_id);
create policy "Usuários podem deletar seus próprios ativos" on public.ativos for delete using (auth.uid() = user_id);

create policy "Usuários podem ver suas transações" on public.transacoes for select using (auth.uid() = user_id);
create policy "Usuários podem inserir transações" on public.transacoes for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar transações" on public.transacoes for update using (auth.uid() = user_id);
create policy "Usuários podem deletar transações" on public.transacoes for delete using (auth.uid() = user_id);

create policy "Usuários podem ver seus proventos" on public.proventos for select using (auth.uid() = user_id);
create policy "Usuários podem inserir proventos" on public.proventos for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar proventos" on public.proventos for update using (auth.uid() = user_id);
create policy "Usuários podem deletar proventos" on public.proventos for delete using (auth.uid() = user_id);
