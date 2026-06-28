-- =============================================================
-- Migration: Definir bracket_slot dos 16-avos (R32)
-- Os jogos estavam com bracket_slot = NULL, o que quebrava:
--   1. a ordem/posição dos confrontos na chave do Bilhete Premiado
--   2. o cascade (vencedor de R32 nunca alimentava as oitavas,
--      pois r32.find(bracket_slot === slot) nunca casava com NULL)
--
-- Layout (igual ao simulador da Copa, chave de duas pontas):
--   Lado esquerdo (slots 0-7) e lado direito (slots 8-15).
-- A correspondência é feita pelo time mandante (home_team),
-- que é único em cada confronto de R32.
-- =============================================================

update matches m
set bracket_slot = v.slot
from (values
  -- LADO ESQUERDO
  ('Alemanha',         0),
  ('França',           1),
  ('África do Sul',    2),
  ('Holanda',          3),
  ('Portugal',         4),
  ('Espanha',          5),
  ('EUA',              6),
  ('Bélgica',          7),
  -- LADO DIREITO
  ('Brasil',           8),
  ('Costa do Marfim',  9),
  ('México',          10),
  ('Inglaterra',      11),
  ('Argentina',       12),
  ('Austrália',       13),
  ('Suíça',           14),
  ('Colômbia',        15)
) as v(home_name, slot)
where m.phase = 'r32'
  and m.home_team_id = (select id from teams t where t.name = v.home_name);
