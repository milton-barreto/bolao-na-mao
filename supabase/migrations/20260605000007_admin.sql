-- =============================================================
-- Migration 007: Ranking + Admin — índices, políticas, funções SQL
-- =============================================================

-- =============================================================
-- Índices para ranking e paginação de logs
-- =============================================================
create index if not exists idx_bets_total_points
  on bets (total_points desc);

create index if not exists idx_admin_logs_created_at
  on admin_logs (created_at desc);

-- =============================================================
-- RLS: permitir autenticados lerem APENAS o global_banner
-- (app_config é admin-only por padrão — esta policy abre só essa chave)
-- =============================================================
create policy "app_config: select banner autenticado"
  on app_config for select
  to authenticated
  using (key = 'global_banner');

-- =============================================================
-- Inicializar entradas base no app_config (se não existirem)
-- =============================================================
insert into app_config (key, value)
  values ('global_banner', 'null')
  on conflict (key) do nothing;

insert into app_config (key, value)
  values ('api_status', '{"available": true}')
  on conflict (key) do nothing;

-- =============================================================
-- Função atômica: atualizar tier de um time + registrar histórico
-- =============================================================
create or replace function admin_update_team_tier(
  p_team_id   text,
  p_new_tier  int,
  p_admin_id  uuid,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_tier int;
begin
  select current_tier into v_from_tier
  from teams where id = p_team_id;

  if not found then
    raise exception 'Time não encontrado: %', p_team_id;
  end if;

  if p_new_tier < 1 or p_new_tier > 5 then
    raise exception 'Tier inválido: %. Deve ser entre 1 e 5.', p_new_tier;
  end if;

  update teams
  set current_tier = p_new_tier
  where id = p_team_id;

  insert into tier_history (team_id, from_tier, to_tier, changed_by, reason, changed_at)
  values (p_team_id, v_from_tier, p_new_tier, p_admin_id, 'admin_manual', now());
end;
$$;

-- =============================================================
-- Função atômica: cancelar jogo + zerar palpites + registrar log
-- =============================================================
create or replace function admin_cancel_match(
  p_match_id  uuid,
  p_admin_id  uuid,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before json;
begin
  select row_to_json(m) into v_before
  from matches m where id = p_match_id;

  if not found then
    raise exception 'Jogo não encontrado: %', p_match_id;
  end if;

  update matches
  set status = 'cancelled', manually_edited = true
  where id = p_match_id;

  -- Zera todos os palpites desse jogo (§5.10)
  update bets
  set total_points = 0, base_points = 0
  where match_id = p_match_id;

  insert into admin_logs (action, admin_id, target_table, target_id, before, after, reason)
  values (
    'cancel_match',
    p_admin_id,
    'matches',
    p_match_id::text,
    v_before,
    json_build_object('status', 'cancelled', 'manually_edited', true),
    p_reason
  );
end;
$$;
