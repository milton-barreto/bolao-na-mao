-- =============================================================
-- Migration: Modo manutenção — chave app_config + RLS
-- =============================================================

-- Inserir chave maintenance_mode (se não existir)
insert into app_config (key, value, updated_at)
values ('maintenance_mode', 'false'::jsonb, now())
on conflict (key) do nothing;

-- RLS: qualquer usuário autenticado (e anon) pode ler maintenance_mode
-- O middleware usa a chave anon com sessão do usuário, então precisa de
-- policy para role authenticated. Usuários não logados são bloqueados pelo
-- middleware antes de chegar aqui, mas a chave anon também precisa ler.
create policy "app_config: select maintenance_mode"
  on app_config for select
  to authenticated, anon
  using (key = 'maintenance_mode');
