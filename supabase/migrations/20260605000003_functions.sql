-- =============================================================
-- Migration 003: Funções de cálculo, triggers e pg_cron
-- =============================================================

-- =============================================================
-- Trigger: criar perfil automaticamente ao criar usuário
-- =============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    false
  );
  return new;
end;
$$;

create or replace trigger trg_create_profile
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================
-- Trigger: atualizar updated_at em bets
-- =============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_bets_updated_at
  before update on bets
  for each row execute function set_updated_at();

-- =============================================================
-- ODDS_TABLE implementada em SQL
-- Deve ser IDÊNTICA a lib/odds.ts — sync manual obrigatório.
--
-- p_result: 'home_win' | 'away_win' | 'draw'
-- Retorna a odd do confronto.
-- =============================================================
create or replace function calculate_odd(
  p_home_tier int,
  p_away_tier int,
  p_result    text
)
returns numeric(4,2)
language plpgsql
immutable
as $$
declare
  v_lo       int;
  v_hi       int;
  v_better   numeric(4,2);
  v_draw     numeric(4,2);
  v_worse    numeric(4,2);
begin
  -- normaliza par (menor, maior)
  v_lo := least(p_home_tier, p_away_tier);
  v_hi := greatest(p_home_tier, p_away_tier);

  -- tabela de odds (§4.2 do briefing)
  case
    when v_lo = 1 and v_hi = 1 then v_better := 1.50; v_draw := 1.40; v_worse := 1.50;
    when v_lo = 1 and v_hi = 2 then v_better := 1.20; v_draw := 1.70; v_worse := 1.80;
    when v_lo = 1 and v_hi = 3 then v_better := 1.10; v_draw := 2.10; v_worse := 2.30;
    when v_lo = 1 and v_hi = 4 then v_better := 1.05; v_draw := 2.50; v_worse := 2.80;
    when v_lo = 1 and v_hi = 5 then v_better := 1.00; v_draw := 3.00; v_worse := 3.50;
    when v_lo = 2 and v_hi = 2 then v_better := 1.50; v_draw := 1.40; v_worse := 1.50;
    when v_lo = 2 and v_hi = 3 then v_better := 1.20; v_draw := 1.70; v_worse := 1.80;
    when v_lo = 2 and v_hi = 4 then v_better := 1.10; v_draw := 2.10; v_worse := 2.30;
    when v_lo = 2 and v_hi = 5 then v_better := 1.05; v_draw := 2.50; v_worse := 2.80;
    when v_lo = 3 and v_hi = 3 then v_better := 1.50; v_draw := 1.40; v_worse := 1.50;
    when v_lo = 3 and v_hi = 4 then v_better := 1.20; v_draw := 1.70; v_worse := 1.80;
    when v_lo = 3 and v_hi = 5 then v_better := 1.10; v_draw := 2.10; v_worse := 2.30;
    when v_lo = 4 and v_hi = 4 then v_better := 1.50; v_draw := 1.40; v_worse := 1.50;
    when v_lo = 4 and v_hi = 5 then v_better := 1.20; v_draw := 1.70; v_worse := 1.80;
    when v_lo = 5 and v_hi = 5 then v_better := 1.50; v_draw := 1.40; v_worse := 1.50;
    else return 1.00;
  end case;

  if p_result = 'draw' then
    return v_draw;
  end if;

  -- time com tier numérico MENOR é o "better" (tier 1 > tier 5)
  if p_result = 'home_win' then
    if p_home_tier <= p_away_tier then
      return v_better;  -- favorito ganhou
    else
      return v_worse;   -- zebra ganhou
    end if;
  end if;

  -- away_win
  if p_away_tier <= p_home_tier then
    return v_better;    -- favorito ganhou (visitante)
  else
    return v_worse;     -- zebra ganhou (visitante)
  end if;
end;
$$;

-- =============================================================
-- calculate_base_points
-- Avalia o palpite de um usuário contra o placar real.
-- 2 pts: placar exato; 1 pt: resultado correto; 0: errou tudo.
-- =============================================================
create or replace function calculate_base_points(
  p_bet_id   uuid,
  p_match_id uuid
)
returns numeric(3,1)
language plpgsql
stable
as $$
declare
  v_bet   bets%rowtype;
  v_match matches%rowtype;
  v_pred_result text;
  v_real_result text;
begin
  select * into v_bet   from bets    where id = p_bet_id;
  select * into v_match from matches where id = p_match_id;

  if v_match.home_score is null or v_match.away_score is null then
    return null;
  end if;

  -- placar exato (nos 90 min)?
  if v_bet.predicted_home_score = v_match.home_score
     and v_bet.predicted_away_score = v_match.away_score
  then
    return 2.0;
  end if;

  -- resultado correto?
  v_pred_result := case
    when v_bet.predicted_home_score > v_bet.predicted_away_score then 'home_win'
    when v_bet.predicted_home_score < v_bet.predicted_away_score then 'away_win'
    else 'draw'
  end;

  v_real_result := case
    when v_match.home_score > v_match.away_score then 'home_win'
    when v_match.home_score < v_match.away_score then 'away_win'
    else 'draw'
  end;

  if v_pred_result = v_real_result then
    return 1.0;
  end if;

  return 0.0;
end;
$$;

-- =============================================================
-- recalc_match_bets
-- Recalcula todos os palpites de um jogo específico.
-- Chamado pelo trigger trg_match_finished e pelo admin.
-- =============================================================
create or replace function recalc_match_bets(p_match_id uuid)
returns void
language plpgsql
as $$
declare
  v_match matches%rowtype;
  v_bet   bets%rowtype;
  v_base  numeric(3,1);
  v_odd   numeric(4,2);
  v_result text;
begin
  select * into v_match from matches where id = p_match_id;

  -- Só recalcula se jogo finalizado com placar definido
  if v_match.status != 'finished'
     or v_match.home_score is null
     or v_match.away_score is null
     or v_match.home_tier_at_kickoff is null
     or v_match.away_tier_at_kickoff is null
  then
    return;
  end if;

  v_result := case
    when v_match.home_score > v_match.away_score then 'home_win'
    when v_match.home_score < v_match.away_score then 'away_win'
    else 'draw'
  end;

  v_odd := calculate_odd(
    v_match.home_tier_at_kickoff,
    v_match.away_tier_at_kickoff,
    v_result
  );

  for v_bet in select * from bets where match_id = p_match_id loop
    v_base := calculate_base_points(v_bet.id, p_match_id);

    update bets
    set
      base_points    = v_base,
      odd_multiplier = v_odd,
      total_points   = coalesce(v_base, 0) * v_odd,
      updated_at     = now()
    where id = v_bet.id;
  end loop;
end;
$$;

-- =============================================================
-- recalc_finished_bets
-- Iteração por todos os jogos finalizados com palpites pendentes.
-- Usado pelo pg_cron como fallback/safety net.
-- =============================================================
create or replace function recalc_finished_bets()
returns void
language plpgsql
as $$
declare
  v_match_id uuid;
begin
  for v_match_id in
    select distinct m.id
    from matches m
    inner join bets b on b.match_id = m.id
    where m.status = 'finished'
      and m.home_score is not null
      and m.away_score is not null
      and m.home_tier_at_kickoff is not null
      and b.total_points is null
  loop
    perform recalc_match_bets(v_match_id);
  end loop;
end;
$$;

-- =============================================================
-- sync_matches_from_api (STUB — implementar na Parte 3)
-- Sincroniza jogos com a football-data.org.
-- =============================================================
create or replace function sync_matches_from_api()
returns void
language plpgsql
as $$
begin
  -- TODO (Parte 3): implementar chamada à football-data.org via http extension
  -- Endpoint: https://api.football-data.org/v4/competitions/WC/matches
  -- Auth header: X-Auth-Token
  -- Respeitar limite 10 req/min
  -- NÃO sobrescrever matches com manually_edited = true
  raise notice 'sync_matches_from_api: stub — implementar na Parte 3';
end;
$$;

-- =============================================================
-- Trigger: recalcular palpites imediatamente após jogo finalizar
-- =============================================================
create or replace function trigger_recalc_on_finish()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    perform recalc_match_bets(new.id);
  end if;
  return new;
end;
$$;

create or replace trigger trg_match_finished
  after update on matches
  for each row execute function trigger_recalc_on_finish();

-- =============================================================
-- Trigger: registrar tier_at_kickoff quando jogo vai ao ar
-- =============================================================
create or replace function set_tier_at_kickoff()
returns trigger
language plpgsql
as $$
begin
  -- Preenche tier_at_kickoff quando status muda para 'live' ou 'finished'
  -- e ainda não foi preenchido (não sobrescreve se já definido)
  if new.status in ('live', 'finished')
     and old.status not in ('live', 'finished')
     and (new.home_tier_at_kickoff is null or new.away_tier_at_kickoff is null)
  then
    new.home_tier_at_kickoff := (select current_tier from teams where id = new.home_team_id);
    new.away_tier_at_kickoff := (select current_tier from teams where id = new.away_team_id);
  end if;
  return new;
end;
$$;

create or replace trigger trg_set_tier_at_kickoff
  before update on matches
  for each row execute function set_tier_at_kickoff();

-- =============================================================
-- pg_cron: recálculo fallback a cada 15 min
-- Executado condicionalmente: só roda se pg_cron estiver habilitado.
-- Para ativar: Dashboard → Database → Extensions → pg_cron → Enable.
-- =============================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'recalc_bets',
      '*/15 * * * *',
      $inner$ select recalc_finished_bets(); $inner$
    );
  end if;
end;
$$;
