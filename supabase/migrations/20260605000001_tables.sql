-- =============================================================
-- Migration 001: Criação de todas as tabelas
-- =============================================================

-- ===== PERFIS (1:1 com auth.users) =====
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table profiles is 'Perfil público de cada usuário (1:1 com auth.users)';

-- ===== ALLOWLIST DE E-MAILS =====
create table if not exists allowed_emails (
  email        text primary key,
  invited_by   uuid references profiles(id),
  used         boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table allowed_emails is 'E-mails autorizados a criar conta';

-- ===== TIMES / SELEÇÕES =====
create table if not exists teams (
  id           text primary key,
  name         text not null,
  flag_url     text,
  initial_tier int not null check (initial_tier between 1 and 5),
  current_tier int not null check (current_tier between 1 and 5),
  eliminated   boolean not null default false
);

comment on table teams is 'Seleções da Copa 2026 com tiers';

-- ===== HISTÓRICO DE TIERS =====
create table if not exists tier_history (
  id           uuid primary key default gen_random_uuid(),
  team_id      text references teams(id),
  from_tier    int,
  to_tier      int,
  reason       text check (reason in ('initial','group_rebalance','r16_rebalance','admin_manual')),
  changed_by   uuid references profiles(id),
  changed_at   timestamptz not null default now()
);

comment on table tier_history is 'Registro de todas as mudanças de tier';

-- ===== JOGOS =====
create table if not exists matches (
  id                   uuid primary key default gen_random_uuid(),
  external_id          text unique,
  home_team_id         text references teams(id),
  away_team_id         text references teams(id),
  phase                text not null check (phase in ('group','r32','r16','qf','sf','final')),
  group_name           text,
  round_number         int,
  kickoff_at           timestamptz not null,

  -- deadline = kickoff_at - 1h (coluna gerada — só funciona em CREATE TABLE, não em ALTER TABLE)
  -- Em produção, substituída por trigger via migration 20260628000000
  deadline_at          timestamptz generated always as (kickoff_at - interval '1 hour') stored,

  -- Placar nos 90 min (base para pontuação)
  home_score           int,
  away_score           int,

  -- Mata-mata: quem avançou (independente de prorrogação/pênaltis)
  advancing_team_id    text references teams(id),

  status               text not null default 'scheduled'
                         check (status in ('scheduled','live','finished','postponed','cancelled')),

  -- Tier registrado no kickoff (imutável após preenchido — base do cálculo)
  home_tier_at_kickoff int,
  away_tier_at_kickoff int,

  -- Controle de override admin
  manually_edited      boolean not null default false,
  last_synced_at       timestamptz
);

comment on table matches is 'Jogos da Copa 2026';
comment on column matches.deadline_at is 'kickoff_at - 1h: coluna gerada, nunca escrever diretamente';
comment on column matches.home_tier_at_kickoff is 'Tier registrado no kick-off — não mudar após preenchido';

-- ===== PALPITES =====
create table if not exists bets (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references profiles(id) on delete cascade,
  match_id                     uuid not null references matches(id) on delete cascade,
  predicted_home_score         int not null,
  predicted_away_score         int not null,
  predicted_advancing_team_id  text references teams(id),

  -- Cache de pontuação (preenchido por trigger após match.status='finished')
  base_points                  numeric(3,1),
  odd_multiplier               numeric(4,2),
  total_points                 numeric(6,2),

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  unique(user_id, match_id)
);

comment on table bets is 'Palpites dos jogadores';

-- ===== LOGS DE ADMIN =====
create table if not exists admin_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid references profiles(id),
  action        text not null,
  target_table  text,
  target_id     text,
  before        jsonb,
  after         jsonb,
  reason        text,
  created_at    timestamptz not null default now()
);

comment on table admin_logs is 'Auditoria de ações admin (retém indefinidamente)';

-- ===== CONFIG DO APP =====
create table if not exists app_config (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references profiles(id),
  updated_at  timestamptz not null default now()
);

comment on table app_config is 'Configurações globais do app (api_status, tournament_state, etc.)';

-- ===== INDEXES =====
create index if not exists idx_matches_external_id    on matches(external_id);
create index if not exists idx_matches_kickoff_at     on matches(kickoff_at);
create index if not exists idx_matches_status         on matches(status);
create index if not exists idx_matches_phase          on matches(phase);
create index if not exists idx_bets_user_id           on bets(user_id);
create index if not exists idx_bets_match_id          on bets(match_id);
create index if not exists idx_bets_user_match        on bets(user_id, match_id);
create index if not exists idx_tier_history_team      on tier_history(team_id);
