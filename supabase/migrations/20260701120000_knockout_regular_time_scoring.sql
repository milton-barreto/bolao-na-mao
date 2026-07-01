-- =============================================================
-- Migration: placar do mata-mata = TEMPO REGULAMENTAR (90')
-- e pontuação da casa (§5.5, ajustada com o admin em 2026-07-01)
-- =============================================================
-- Contexto do bug:
--   O sync gravava matches.home_score/away_score a partir de
--   score.fullTime da football-data.org, que INCLUI gols de
--   prorrogação e pênaltis. O placar (exibido e pontuado) deve ser
--   SEMPRE o do tempo regulamentar (90' + acréscimos). Quem avança
--   (advancing_team_id) continua vindo do vencedor real da eliminatória
--   (esse sim considera prorrogação/pênaltis).
--
-- Regra de pontos do mata-mata (confirmada com o admin):
--   - Acertar QUEM AVANÇA: +1 ponto FIXO (sem odd).
--   - Acertar o PLACAR EXATO dos 90': +2 × odd, e SÓ conta se
--     também acertou quem avança.
--   - Os dois SOMAM. Ex.: placar exato + avanço = 1 + 2×odd.
--   - Placar exato com avanço errado = 0.
--
--   base_points continua sendo o indicador de status:
--     2 = acertou placar, 1 = acertou (só) quem avança, 0 = errou.
--   O empilhamento fica somente em total_points.
--   A fase de grupos permanece inalterada (§5.1).
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
  v_advancer_hit     boolean;
  v_exact_hit        boolean;
begin
  select * into v_bet   from bets    where id = p_bet_id;
  select * into v_match from matches where id = p_match_id;

  if v_match.home_score is null or v_match.away_score is null then
    return null;
  end if;

  v_exact_hit := (v_bet.predicted_home_score = v_match.home_score
                  and v_bet.predicted_away_score = v_match.away_score);

  -- =========================================================
  -- MATA-MATA (§5.5): base = 2 (placar+avanço) / 1 (avanço) / 0
  -- O placar exato SÓ vale se também acertou quem avança.
  -- =========================================================
  if v_match.phase <> 'group' then
    v_actual_advancing := v_match.advancing_team_id;

    -- Sem advancing registrado: se o jogo foi decidido nos 90' o
    -- vencedor avança. Empate nos 90' sem avanço definido ⇒ indeterminado
    -- (prorrogação/pênaltis ainda não registrados) → mantém pendente.
    if v_actual_advancing is null then
      if v_match.home_score > v_match.away_score then
        v_actual_advancing := v_match.home_team_id;
      elsif v_match.away_score > v_match.home_score then
        v_actual_advancing := v_match.away_team_id;
      else
        return null;  -- pendente até o admin/sync registrar quem avançou
      end if;
    end if;

    v_advancer_hit := (v_bet.predicted_advancing_team_id is not null
                       and v_bet.predicted_advancing_team_id = v_actual_advancing);

    if v_exact_hit and v_advancer_hit then
      return 2.0;   -- acertou o placar dos 90' E quem avança
    elsif v_advancer_hit then
      return 1.0;   -- acertou (só) quem avança
    else
      return 0.0;   -- errou o avanço (placar exato sozinho não pontua)
    end if;
  end if;

  -- =========================================================
  -- FASE DE GRUPOS (§5.1): 2 (placar) / 1 (resultado) / 0 — inalterado
  -- =========================================================
  if v_exact_hit then
    return 2.0;
  end if;

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
-- recalc_match_bets: total_points depende da fase.
--   * Grupos:    total = base × odd (inalterado).
--   * Mata-mata: base 2 → 1 + 2×odd ; base 1 → 1 ; base 0 → 0.
--                (avanço = 1 fixo; placar exato = 2×odd; somam.)
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
          when v_base = 2 then 1.0 + 2.0 * v_odd  -- avanço (1) + placar exato (2×odd)
          when v_base = 1 then 1.0                -- só o avanço (fixo, sem odd)
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
-- Backfill: aplica o novo modelo a TODOS os jogos de mata-mata já
-- finalizados. Jogos decididos nos 90' já têm o placar correto e ficam
-- certos aqui. Jogos decididos em prorrogação/pênaltis ainda têm o placar
-- errado (fullTime) salvo até o admin rodar "Corrigir placares do
-- mata-mata" no painel (rebusca score.regularTime da API e re-recalcula).
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
