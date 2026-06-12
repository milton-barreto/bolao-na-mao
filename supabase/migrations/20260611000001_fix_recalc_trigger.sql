-- =============================================================
-- Migration: Corrigir trigger de recálculo ao finalizar jogo
--
-- Problema: trigger só disparava quando status mudava para
-- 'finished'. Se o placar chegasse depois (ex: force-finish
-- manual sem placar + sync posterior), o recálculo não ocorria.
-- =============================================================

-- Atualiza trigger para disparar também quando placar muda
-- em jogo que já está com status 'finished'.
create or replace function trigger_recalc_on_finish()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished' and (
    old.status is distinct from 'finished'
    or new.home_score is distinct from old.home_score
    or new.away_score is distinct from old.away_score
  ) then
    perform recalc_match_bets(new.id);
  end if;
  return new;
end;
$$;

-- Libera jogos com status 'finished' sem placar que foram
-- marcados como manually_edited (impedindo o sync de preencher
-- o placar). O trigger atualizado fará o recálculo assim que
-- o sync ou o admin informar os placares.
update matches
set manually_edited = false
where status = 'finished'
  and home_score is null
  and manually_edited = true;
