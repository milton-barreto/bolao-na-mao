-- =============================================================
-- Migration: corrige pontuação base do mata-mata (§5.5)
-- =============================================================
-- Problema: calculate_base_points só implementava a regra da fase de
-- grupos (acertar o RESULTADO 1x2 nos 90 min vale 1pt). No mata-mata,
-- o 1pt base é por acertar QUEM AVANÇA na chave — independente de o
-- jogo ter sido decidido nos 90 min, na prorrogação ou nos pênaltis.
-- Resultado: jogos de mata-mata decididos em empate (90') + pênaltis
-- zeravam todos os palpites, mesmo de quem acertou quem avançou.
--
-- Correção:
--  1. calculate_base_points passa a aplicar a regra do mata-mata.
--  2. recalc_match_bets mantém o palpite PENDENTE (total_points null)
--     quando o jogo de mata-mata terminou empatado nos 90' e o time
--     que avançou ainda não foi registrado (advancing_team_id null),
--     para que o recálculo o resolva assim que o admin registrar.
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
  v_bet              bets%rowtype;
  v_match            matches%rowtype;
  v_pred_result      text;
  v_real_result      text;
  v_actual_advancing text;
begin
  select * into v_bet   from bets    where id = p_bet_id;
  select * into v_match from matches where id = p_match_id;

  if v_match.home_score is null or v_match.away_score is null then
    return null;
  end if;

  -- Placar exato nos 90 min → 2 pts (vale para grupos e mata-mata)
  if v_bet.predicted_home_score = v_match.home_score
     and v_bet.predicted_away_score = v_match.away_score
  then
    return 2.0;
  end if;

  -- =========================================================
  -- MATA-MATA (§5.5): 1 pt base se acertou QUEM AVANÇA
  -- =========================================================
  if v_match.phase <> 'group' then
    v_actual_advancing := v_match.advancing_team_id;

    -- Sem advancing registrado: se o jogo foi decidido nos 90 min,
    -- o vencedor avança. Empate nos 90' sem advancing definido ⇒
    -- indeterminado (prorrogação/pênaltis ainda não registrados).
    if v_actual_advancing is null then
      if v_match.home_score > v_match.away_score then
        v_actual_advancing := v_match.home_team_id;
      elsif v_match.away_score > v_match.home_score then
        v_actual_advancing := v_match.away_team_id;
      else
        return null;  -- mantém pendente até o admin registrar quem avançou
      end if;
    end if;

    if v_bet.predicted_advancing_team_id is not null
       and v_bet.predicted_advancing_team_id = v_actual_advancing
    then
      return 1.0;
    end if;

    return 0.0;
  end if;

  -- =========================================================
  -- FASE DE GRUPOS (§5.1): 1 pt base se acertou o resultado 1x2
  -- =========================================================
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
-- recalc_match_bets: não finalizar palpites de mata-mata cujo
-- time que avançou ainda é indeterminado (mantém total_points null
-- para o recálculo/cron resolver quando o avanço for registrado).
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

    if v_base is null then
      -- Mata-mata decidido em prorrogação/pênaltis sem o time que avançou
      -- ainda registrado: mantém pendente para resolver no próximo recálculo.
      update bets
      set base_points    = null,
          odd_multiplier = null,
          total_points   = null,
          updated_at     = now()
      where id = v_bet.id;
    else
      update bets
      set base_points    = v_base,
          odd_multiplier = v_odd,
          total_points   = v_base * v_odd,
          updated_at     = now()
      where id = v_bet.id;
    end if;
  end loop;
end;
$$;

-- =============================================================
-- Backfill: reprocessa jogos de mata-mata já finalizados.
-- Os palpites afetados pelo bug têm total_points = 0 (não null),
-- então o cron recalc_finished_bets (que só pega total_points null)
-- NÃO os corrigiria. Este passo único aplica a nova regra a todos.
-- =============================================================
do $$
declare
  v_match_id uuid;
begin
  for v_match_id in
    select id from matches
    where phase <> 'group' and status = 'finished'
  loop
    perform recalc_match_bets(v_match_id);
  end loop;
end;
$$;
