-- =============================================================
-- Migration 004: Seed — 48 seleções (§5.3 do briefing) + app_config
-- =============================================================

-- ===== 48 SELEÇÕES COM TIERS INICIAIS =====
insert into teams (id, name, flag_url, initial_tier, current_tier, eliminated) values

-- Tier 1: Favoritas (4 seleções)
('POR', 'Portugal',       null, 1, 1, false),
('FRA', 'França',         null, 1, 1, false),
('ESP', 'Espanha',        null, 1, 1, false),
('ENG', 'Inglaterra',     null, 1, 1, false),

-- Tier 2: Fortes (3 seleções)
('BRA', 'Brasil',         null, 2, 2, false),
('ARG', 'Argentina',      null, 2, 2, false),
('GER', 'Alemanha',       null, 2, 2, false),

-- Tier 3: Não vão ser fáceis (10 seleções)
('JPN', 'Japão',          null, 3, 3, false),
('COL', 'Colômbia',       null, 3, 3, false),
('SEN', 'Senegal',        null, 3, 3, false),
('URU', 'Uruguai',        null, 3, 3, false),
('MAR', 'Marrocos',       null, 3, 3, false),
('BEL', 'Bélgica',        null, 3, 3, false),
('NED', 'Holanda',        null, 3, 3, false),
('ECU', 'Equador',        null, 3, 3, false),
('NOR', 'Noruega',        null, 3, 3, false),
('CRO', 'Croácia',        null, 3, 3, false),

-- Tier 4: Sentido de campanha (18 seleções)
('SUI', 'Suíça',          null, 4, 4, false),
('MEX', 'México',         null, 4, 4, false),
('USA', 'EUA',            null, 4, 4, false),
('CAN', 'Canadá',         null, 4, 4, false),
('SCO', 'Escócia',        null, 4, 4, false),
('KOR', 'Coreia do Sul',  null, 4, 4, false),
('PAR', 'Paraguai',       null, 4, 4, false),
('TUR', 'Turquia',        null, 4, 4, false),
('SWE', 'Suécia',         null, 4, 4, false),
('TUN', 'Tunísia',        null, 4, 4, false),
('EGY', 'Egito',          null, 4, 4, false),
('IRN', 'Irã',            null, 4, 4, false),
('KSA', 'Arábia Saudita', null, 4, 4, false),
('AUS', 'Austrália',      null, 4, 4, false),
('AUT', 'Áustria',        null, 4, 4, false),
('CIV', 'Costa do Marfim',null, 4, 4, false),
('GHA', 'Gana',           null, 4, 4, false),
('CZE', 'Tchéquia',       null, 4, 4, false),

-- Tier 5: Vieram para apanhar (13 seleções)
('HAI', 'Haiti',                      null, 5, 5, false),
('CUW', 'Curaçao',                    null, 5, 5, false),
('COD', 'Rep. Dem. do Congo',         null, 5, 5, false),
('NZL', 'Nova Zelândia',              null, 5, 5, false),
('IRQ', 'Iraque',                     null, 5, 5, false),
('JOR', 'Jordânia',                   null, 5, 5, false),
('QAT', 'Catar',                      null, 5, 5, false),
('RSA', 'África do Sul',              null, 5, 5, false),
('UZB', 'Uzbequistão',                null, 5, 5, false),
('CPV', 'Cabo Verde',                 null, 5, 5, false),
('PAN', 'Panamá',                     null, 5, 5, false),
('BIH', 'Bósnia e Herzegovina',       null, 5, 5, false),
('ALG', 'Argélia',                    null, 5, 5, false)

on conflict (id) do nothing;

-- =============================================================
-- APP_CONFIG inicial
-- =============================================================
insert into app_config (key, value) values
  ('api_status',       '{"available": true, "last_sync": null}'::jsonb),
  ('tournament_state', '{"current_phase": "group", "current_round": 1}'::jsonb),
  ('global_banner',    '{"text": null, "type": null}'::jsonb)
on conflict (key) do nothing;

-- =============================================================
-- Verificação: confirma 48 seleções inseridas
-- =============================================================
do $$
declare v_count int;
begin
  select count(*) into v_count from teams;
  if v_count < 48 then
    raise warning 'Seed: apenas % seleções inseridas (esperado 48)', v_count;
  else
    raise notice 'Seed OK: % seleções inseridas', v_count;
  end if;
end;
$$;
