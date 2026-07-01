-- =============================================================
-- Migration: "só avanço" no mata-mata passa a valer 1 × odd
-- (ajuste da regra §5.5 confirmado com o admin em 2026-07-01)
-- =============================================================
-- Correção da regra anterior (20260701120000), que pagava o acerto
-- de "só quem avança" como 1 ponto FIXO. O dono confirmou que o
-- prêmio de avanço, quando o placar está ERRADO, usa a odd do
-- confronto (mesma mecânica de resultado da fase de grupos).
--
-- Regra final de pontos do mata-mata (§5.5):
--   - Placar dos 90' ✓  E  quem avança ✓  → 1 (fixo) + 2×odd
--   - Placar ✗           E  quem avança ✓  → 1 × odd
--   - Placar ✓           E  quem avança ✗  → 0
--   - Errou tudo                            → 0
--
-- base_points segue como indicador de status (2 / 1 / 0). A única
-- mudança está no mapeamento de total_points para base = 1.
-- calculate_base_points permanece inalterada.
-- A fase de grupos permanece inalterada (§5.1).
-- =============================================================

create or replace function recalc_match_bets(p_match_id uuid)
returns void
language plpgsql
as $$
declare
  v_match       matches%rowtype;
  v_bet         bets%rowtype;
  v_base        numeric(3,1);
  v_odd         numeric(4,2);
  v_result      text;
  v_total       numeric(6,2);
  v_is_knockout boolean;
begin
  select * into v_match from matches where id = p_match_id;

  -- Só recalcula se jogo finalizado com placar e tiers definidos
  if v_match.status != 'finished'
     or v_match.home_score is null
     or v_match.away_score is null
     or v_match.home_tier_at_kickoff is null
     or v_match.away_tier_at_kickoff is null
  then
    return;
  end if;

  v_is_knockout := (v_match.phase <> 'group');

  -- odd sempre a partir do resultado 1x2 do placar dos 90'
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
      -- Mata-mata empatado nos 90' sem avanço registrado: mantém pendente
      -- para o próximo recálculo resolver quando o avanço for definido.
      update bets
      set base_points    = null,
          odd_multiplier = null,
          total_points   = null,
          updated_at     = now()
      where id = v_bet.id;
    else
      if v_is_knockout then
        v_total := case
          when v_base = 2 then 1.0 + 2.0 * v_odd  -- placar + avanço: 1 fixo + 2×odd
          when v_base = 1 then v_odd              -- só o avanço: 1 × odd
          else 0.0
        end;
      else
        v_total := v_base * v_odd;
      end if;

      update bets
      set base_points    = v_base,
          odd_multiplier = v_odd,
          total_points   = v_total,
          updated_at     = now()
      where id = v_bet.id;
    end if;
  end loop;
end;
$$;

-- =============================================================
-- Backfill: reaplica o modelo a TODOS os jogos de mata-mata já
-- finalizados (corrige os "só avanço" que ficaram em 1 fixo).
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
