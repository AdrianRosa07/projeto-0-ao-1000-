-- Adiciona a coluna para Dividendo por Ação Projetado
alter table public.ativos 
add column dpa_projetado numeric default 0;
