-- =============================================================
-- Migration 002: Row Level Security (§4.1 do briefing)
-- =============================================================

-- Habilitar RLS em todas as tabelas
alter table profiles       enable row level security;
alter table allowed_emails enable row level security;
alter table teams          enable row level security;
alter table tier_history   enable row level security;
alter table matches        enable row level security;
alter table bets           enable row level security;
alter table admin_logs     enable row level security;
alter table app_config     enable row level security;

-- =============================================================
-- Helper: verifica se o usuário logado é admin
-- =============================================================
create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  )
$$;

-- =============================================================
-- PROFILES
-- Qualquer autenticado pode ver perfis.
-- Só o dono pode atualizar o próprio perfil (ou admin).
-- Insert só via trigger (trg_create_profile).
-- =============================================================
create policy "profiles: select autenticado"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: update owner ou admin"
  on profiles for update
  to authenticated
  using (auth.uid() = id or is_admin());

-- =============================================================
-- ALLOWED_EMAILS
-- Só admin pode ler e escrever.
-- =============================================================
create policy "allowed_emails: admin"
  on allowed_emails for all
  to authenticated
  using (is_admin());

-- =============================================================
-- TEAMS
-- Qualquer autenticado pode ler.
-- Só admin pode escrever.
-- =============================================================
create policy "teams: select autenticado"
  on teams for select
  to authenticated
  using (true);

create policy "teams: write admin"
  on teams for all
  to authenticated
  using (is_admin());

-- =============================================================
-- TIER_HISTORY
-- Qualquer autenticado pode ler.
-- Só admin pode escrever.
-- =============================================================
create policy "tier_history: select autenticado"
  on tier_history for select
  to authenticated
  using (true);

create policy "tier_history: write admin"
  on tier_history for all
  to authenticated
  using (is_admin());

-- =============================================================
-- MATCHES
-- Qualquer autenticado pode ler.
-- Só admin pode escrever.
-- =============================================================
create policy "matches: select autenticado"
  on matches for select
  to authenticated
  using (true);

create policy "matches: write admin"
  on matches for all
  to authenticated
  using (is_admin());

-- =============================================================
-- BETS
-- SELECT próprio: sempre.
-- SELECT alheio: só após deadline_at < now().
-- INSERT/UPDATE: só owner, e só se deadline ainda não passou.
-- DELETE: só owner antes do deadline, ou admin.
-- Admin pode tudo.
-- =============================================================
create policy "bets: select próprio"
  on bets for select
  to authenticated
  using (user_id = auth.uid());

create policy "bets: select alheio após deadline"
  on bets for select
  to authenticated
  using (
    user_id != auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id
        and m.deadline_at < now()
    )
  );

create policy "bets: insert owner antes do deadline"
  on bets for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id
        and m.deadline_at > now()
        and m.status not in ('cancelled')
    )
  );

create policy "bets: update owner antes do deadline"
  on bets for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id
        and m.deadline_at > now()
    )
  );

create policy "bets: delete owner antes do deadline"
  on bets for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id
        and m.deadline_at > now()
    )
  );

create policy "bets: admin pode tudo"
  on bets for all
  to authenticated
  using (is_admin());

-- =============================================================
-- ADMIN_LOGS
-- Só admin pode ler e escrever.
-- =============================================================
create policy "admin_logs: admin"
  on admin_logs for all
  to authenticated
  using (is_admin());

-- =============================================================
-- APP_CONFIG
-- Só admin pode ler e escrever.
-- =============================================================
create policy "app_config: admin"
  on app_config for all
  to authenticated
  using (is_admin());
