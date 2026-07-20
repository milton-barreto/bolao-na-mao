-- =============================================================
-- Migration: corrige calculate_golden_ticket_points (fase 'final')
-- =============================================================
-- Causa-raiz: a sincronização (supabase/functions/sync-matches) mapeia
-- tanto o estágio FINAL quanto o THIRD_PLACE (disputa de 3º lugar) da
-- football-data.org para o mesmo phase='final', pois o schema de matches
-- não tem uma fase própria para o 3º lugar (fora de escopo do briefing).
--
-- Isso deixa DUAS linhas com phase='final' quando ambos os jogos
-- terminam: a disputa de 3º lugar e a final de verdade. A consulta
-- original de calculate_golden_ticket_points buscava o vencedor da
-- final com "limit 1" sem "order by", então o resultado era
-- não-determinístico — podia pegar o vencedor do jogo de 3º lugar
-- em vez do campeão real, quebrando os 5+10 pts de final/campeão.
--
-- Correção: a disputa de 3º lugar sempre acontece ANTES da final
-- (regra de todo mata-mata de Copa do Mundo). Ordenar por kickoff_at
-- desc e pegar a primeira linha garante pegar sempre o jogo real da
-- final, não a disputa de 3º lugar.
-- =============================================================

create or replace function calculate_golden_ticket_points(p_user_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_predictions    jsonb;
  v_points         numeric := 0;
  v_match          record;
  v_champion_pred  text;
  v_final_winner   text;
begin
  select predictions into v_predictions
  from golden_tickets
  where user_id = p_user_id;

  if not found or v_predictions is null then
    return 0;
  end if;

  -- R32: 1pt por acerto (predictions keyed by match UUID)
  for v_match in (
    select id::text as match_id, advancing_team_id
    from matches
    where phase = 'r32'
      and status = 'finished'
      and advancing_team_id is not null
  ) loop
    if (v_predictions->'r32'->>v_match.match_id) = v_match.advancing_team_id then
      v_points := v_points + 1;
    end if;
  end loop;

  -- R16: 2pts por acerto (predictions = valores do objeto r16)
  for v_match in (
    select advancing_team_id
    from matches
    where phase = 'r16'
      and status = 'finished'
      and advancing_team_id is not null
  ) loop
    if exists (
      select 1 from jsonb_each_text(v_predictions->'r16') jt
      where jt.value = v_match.advancing_team_id
    ) then
      v_points := v_points + 2;
    end if;
  end loop;

  -- QF: 5pts por acerto
  for v_match in (
    select advancing_team_id
    from matches
    where phase = 'qf'
      and status = 'finished'
      and advancing_team_id is not null
  ) loop
    if exists (
      select 1 from jsonb_each_text(v_predictions->'qf') jt
      where jt.value = v_match.advancing_team_id
    ) then
      v_points := v_points + 5;
    end if;
  end loop;

  -- SF: 5pts por acerto (os dois finalistas que avançam das semis)
  for v_match in (
    select advancing_team_id
    from matches
    where phase = 'sf'
      and status = 'finished'
      and advancing_team_id is not null
  ) loop
    if exists (
      select 1 from jsonb_each_text(v_predictions->'sf') jt
      where jt.value = v_match.advancing_team_id
    ) then
      v_points := v_points + 5;
    end if;
  end loop;

  -- Final: 5pts (confronto final) + 10pts (campeão) se acertou.
  -- phase='final' pode conter também a disputa de 3º lugar (ver comentário
  -- da migration) — pega sempre o jogo com o kickoff mais recente, que é
  -- sempre a final de verdade (3º lugar é sempre jogado antes).
  select advancing_team_id into v_final_winner
  from matches
  where phase = 'final'
    and status = 'finished'
    and advancing_team_id is not null
  order by kickoff_at desc
  limit 1;

  if v_final_winner is not null then
    v_champion_pred := v_predictions->>'champion';
    if v_champion_pred = v_final_winner then
      v_points := v_points + 5 + 10;
    end if;
  end if;

  return v_points;
end;
$$;
