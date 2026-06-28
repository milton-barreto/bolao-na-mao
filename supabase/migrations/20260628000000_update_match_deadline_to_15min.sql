-- =============================================================
-- Migration: Alterar deadline de aposta de 1 hora para 10 minutos
-- =============================================================

-- Remover coluna gerada antiga
alter table matches drop column deadline_at;

-- Criar coluna gerada nova com 10 minutos
alter table matches
add column deadline_at timestamptz generated always as (kickoff_at - interval '10 minutes') stored;

-- Atualizar comentário
comment on column matches.deadline_at is 'kickoff_at - 10 min: coluna gerada, nunca escrever diretamente';
