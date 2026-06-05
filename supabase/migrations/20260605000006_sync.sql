-- =============================================================
-- Migration 006: flag_url, índices, fix URU→URY, seed 72 jogos Copa 2026
-- =============================================================

-- =============================================================
-- Corrigir ID do Uruguai para bater com o TLA da football-data.org
-- (deve rodar antes do seed de jogos)
-- =============================================================
update teams set id = 'URY' where id = 'URU';

-- =============================================================
-- Populate flag_url em todos os 48 times via flagcdn.com
-- Mapping TLA → ISO alpha-2
-- =============================================================
update teams set flag_url = case id
  -- Tier 1
  when 'POR' then 'https://flagcdn.com/w40/pt.png'
  when 'FRA' then 'https://flagcdn.com/w40/fr.png'
  when 'ESP' then 'https://flagcdn.com/w40/es.png'
  when 'ENG' then 'https://flagcdn.com/w40/gb-eng.png'
  -- Tier 2
  when 'BRA' then 'https://flagcdn.com/w40/br.png'
  when 'ARG' then 'https://flagcdn.com/w40/ar.png'
  when 'GER' then 'https://flagcdn.com/w40/de.png'
  -- Tier 3
  when 'JPN' then 'https://flagcdn.com/w40/jp.png'
  when 'COL' then 'https://flagcdn.com/w40/co.png'
  when 'SEN' then 'https://flagcdn.com/w40/sn.png'
  when 'URY' then 'https://flagcdn.com/w40/uy.png'
  when 'MAR' then 'https://flagcdn.com/w40/ma.png'
  when 'BEL' then 'https://flagcdn.com/w40/be.png'
  when 'NED' then 'https://flagcdn.com/w40/nl.png'
  when 'ECU' then 'https://flagcdn.com/w40/ec.png'
  when 'NOR' then 'https://flagcdn.com/w40/no.png'
  when 'CRO' then 'https://flagcdn.com/w40/hr.png'
  -- Tier 4
  when 'SUI' then 'https://flagcdn.com/w40/ch.png'
  when 'MEX' then 'https://flagcdn.com/w40/mx.png'
  when 'USA' then 'https://flagcdn.com/w40/us.png'
  when 'CAN' then 'https://flagcdn.com/w40/ca.png'
  when 'SCO' then 'https://flagcdn.com/w40/gb-sct.png'
  when 'KOR' then 'https://flagcdn.com/w40/kr.png'
  when 'PAR' then 'https://flagcdn.com/w40/py.png'
  when 'TUR' then 'https://flagcdn.com/w40/tr.png'
  when 'SWE' then 'https://flagcdn.com/w40/se.png'
  when 'TUN' then 'https://flagcdn.com/w40/tn.png'
  when 'EGY' then 'https://flagcdn.com/w40/eg.png'
  when 'IRN' then 'https://flagcdn.com/w40/ir.png'
  when 'KSA' then 'https://flagcdn.com/w40/sa.png'
  when 'AUS' then 'https://flagcdn.com/w40/au.png'
  when 'AUT' then 'https://flagcdn.com/w40/at.png'
  when 'CIV' then 'https://flagcdn.com/w40/ci.png'
  when 'GHA' then 'https://flagcdn.com/w40/gh.png'
  when 'CZE' then 'https://flagcdn.com/w40/cz.png'
  -- Tier 5
  when 'HAI' then 'https://flagcdn.com/w40/ht.png'
  when 'CUW' then 'https://flagcdn.com/w40/cw.png'
  when 'COD' then 'https://flagcdn.com/w40/cd.png'
  when 'NZL' then 'https://flagcdn.com/w40/nz.png'
  when 'IRQ' then 'https://flagcdn.com/w40/iq.png'
  when 'JOR' then 'https://flagcdn.com/w40/jo.png'
  when 'QAT' then 'https://flagcdn.com/w40/qa.png'
  when 'RSA' then 'https://flagcdn.com/w40/za.png'
  when 'UZB' then 'https://flagcdn.com/w40/uz.png'
  when 'CPV' then 'https://flagcdn.com/w40/cv.png'
  when 'PAN' then 'https://flagcdn.com/w40/pa.png'
  when 'BIH' then 'https://flagcdn.com/w40/ba.png'
  when 'ALG' then 'https://flagcdn.com/w40/dz.png'
  else flag_url
end;

-- =============================================================
-- Índices adicionais para queries da Parte 3
-- =============================================================

-- Para getUpcomingMatches: WHERE deadline_at > now() ORDER BY kickoff_at
create index if not exists idx_matches_deadline_at
  on matches (deadline_at);

-- Para getMatchesByRound: WHERE phase = 'group' AND round_number = N
create index if not exists idx_matches_phase_round
  on matches (phase, round_number, kickoff_at);

-- =============================================================
-- Seed: 72 jogos da fase de grupos — Copa do Mundo 2026
-- Fonte: football-data.org (baixado em 2026-06-05)
-- external_id = ID numérico da API; home/away_team_id = tla
-- =============================================================
insert into matches (
  external_id,
  home_team_id,
  away_team_id,
  phase,
  group_name,
  round_number,
  kickoff_at,
  status
) values
  ('537327', 'MEX', 'RSA', 'group', 'A', 1, '2026-06-11T19:00:00Z'::timestamptz, 'scheduled'),
  ('537328', 'KOR', 'CZE', 'group', 'A', 1, '2026-06-12T02:00:00Z'::timestamptz, 'scheduled'),
  ('537333', 'CAN', 'BIH', 'group', 'B', 1, '2026-06-12T19:00:00Z'::timestamptz, 'scheduled'),
  ('537345', 'USA', 'PAR', 'group', 'D', 1, '2026-06-13T01:00:00Z'::timestamptz, 'scheduled'),
  ('537334', 'QAT', 'SUI', 'group', 'B', 1, '2026-06-13T19:00:00Z'::timestamptz, 'scheduled'),
  ('537339', 'BRA', 'MAR', 'group', 'C', 1, '2026-06-13T22:00:00Z'::timestamptz, 'scheduled'),
  ('537340', 'HAI', 'SCO', 'group', 'C', 1, '2026-06-14T01:00:00Z'::timestamptz, 'scheduled'),
  ('537346', 'AUS', 'TUR', 'group', 'D', 1, '2026-06-14T04:00:00Z'::timestamptz, 'scheduled'),
  ('537351', 'GER', 'CUW', 'group', 'E', 1, '2026-06-14T17:00:00Z'::timestamptz, 'scheduled'),
  ('537357', 'NED', 'JPN', 'group', 'F', 1, '2026-06-14T20:00:00Z'::timestamptz, 'scheduled'),
  ('537352', 'CIV', 'ECU', 'group', 'E', 1, '2026-06-14T23:00:00Z'::timestamptz, 'scheduled'),
  ('537358', 'SWE', 'TUN', 'group', 'F', 1, '2026-06-15T02:00:00Z'::timestamptz, 'scheduled'),
  ('537369', 'ESP', 'CPV', 'group', 'H', 1, '2026-06-15T16:00:00Z'::timestamptz, 'scheduled'),
  ('537363', 'BEL', 'EGY', 'group', 'G', 1, '2026-06-15T19:00:00Z'::timestamptz, 'scheduled'),
  ('537370', 'KSA', 'URY', 'group', 'H', 1, '2026-06-15T22:00:00Z'::timestamptz, 'scheduled'),
  ('537364', 'IRN', 'NZL', 'group', 'G', 1, '2026-06-16T01:00:00Z'::timestamptz, 'scheduled'),
  ('537391', 'FRA', 'SEN', 'group', 'I', 1, '2026-06-16T19:00:00Z'::timestamptz, 'scheduled'),
  ('537392', 'IRQ', 'NOR', 'group', 'I', 1, '2026-06-16T22:00:00Z'::timestamptz, 'scheduled'),
  ('537397', 'ARG', 'ALG', 'group', 'J', 1, '2026-06-17T01:00:00Z'::timestamptz, 'scheduled'),
  ('537398', 'AUT', 'JOR', 'group', 'J', 1, '2026-06-17T04:00:00Z'::timestamptz, 'scheduled'),
  ('537403', 'POR', 'COD', 'group', 'K', 1, '2026-06-17T17:00:00Z'::timestamptz, 'scheduled'),
  ('537409', 'ENG', 'CRO', 'group', 'L', 1, '2026-06-17T20:00:00Z'::timestamptz, 'scheduled'),
  ('537410', 'GHA', 'PAN', 'group', 'L', 1, '2026-06-17T23:00:00Z'::timestamptz, 'scheduled'),
  ('537404', 'UZB', 'COL', 'group', 'K', 1, '2026-06-18T02:00:00Z'::timestamptz, 'scheduled'),
  ('537329', 'CZE', 'RSA', 'group', 'A', 2, '2026-06-18T16:00:00Z'::timestamptz, 'scheduled'),
  ('537335', 'SUI', 'BIH', 'group', 'B', 2, '2026-06-18T19:00:00Z'::timestamptz, 'scheduled'),
  ('537336', 'CAN', 'QAT', 'group', 'B', 2, '2026-06-18T22:00:00Z'::timestamptz, 'scheduled'),
  ('537330', 'MEX', 'KOR', 'group', 'A', 2, '2026-06-19T01:00:00Z'::timestamptz, 'scheduled'),
  ('537348', 'USA', 'AUS', 'group', 'D', 2, '2026-06-19T19:00:00Z'::timestamptz, 'scheduled'),
  ('537342', 'SCO', 'MAR', 'group', 'C', 2, '2026-06-19T22:00:00Z'::timestamptz, 'scheduled'),
  ('537341', 'BRA', 'HAI', 'group', 'C', 2, '2026-06-20T00:30:00Z'::timestamptz, 'scheduled'),
  ('537347', 'TUR', 'PAR', 'group', 'D', 2, '2026-06-20T03:00:00Z'::timestamptz, 'scheduled'),
  ('537359', 'NED', 'SWE', 'group', 'F', 2, '2026-06-20T17:00:00Z'::timestamptz, 'scheduled'),
  ('537353', 'GER', 'CIV', 'group', 'E', 2, '2026-06-20T20:00:00Z'::timestamptz, 'scheduled'),
  ('537354', 'ECU', 'CUW', 'group', 'E', 2, '2026-06-21T00:00:00Z'::timestamptz, 'scheduled'),
  ('537360', 'TUN', 'JPN', 'group', 'F', 2, '2026-06-21T04:00:00Z'::timestamptz, 'scheduled'),
  ('537371', 'ESP', 'KSA', 'group', 'H', 2, '2026-06-21T16:00:00Z'::timestamptz, 'scheduled'),
  ('537365', 'BEL', 'IRN', 'group', 'G', 2, '2026-06-21T19:00:00Z'::timestamptz, 'scheduled'),
  ('537372', 'URY', 'CPV', 'group', 'H', 2, '2026-06-21T22:00:00Z'::timestamptz, 'scheduled'),
  ('537366', 'NZL', 'EGY', 'group', 'G', 2, '2026-06-22T01:00:00Z'::timestamptz, 'scheduled'),
  ('537399', 'ARG', 'AUT', 'group', 'J', 2, '2026-06-22T17:00:00Z'::timestamptz, 'scheduled'),
  ('537393', 'FRA', 'IRQ', 'group', 'I', 2, '2026-06-22T21:00:00Z'::timestamptz, 'scheduled'),
  ('537394', 'NOR', 'SEN', 'group', 'I', 2, '2026-06-23T00:00:00Z'::timestamptz, 'scheduled'),
  ('537400', 'JOR', 'ALG', 'group', 'J', 2, '2026-06-23T03:00:00Z'::timestamptz, 'scheduled'),
  ('537405', 'POR', 'UZB', 'group', 'K', 2, '2026-06-23T17:00:00Z'::timestamptz, 'scheduled'),
  ('537411', 'ENG', 'GHA', 'group', 'L', 2, '2026-06-23T20:00:00Z'::timestamptz, 'scheduled'),
  ('537412', 'PAN', 'CRO', 'group', 'L', 2, '2026-06-23T23:00:00Z'::timestamptz, 'scheduled'),
  ('537406', 'COL', 'COD', 'group', 'K', 2, '2026-06-24T02:00:00Z'::timestamptz, 'scheduled'),
  ('537338', 'BIH', 'QAT', 'group', 'B', 3, '2026-06-24T19:00:00Z'::timestamptz, 'scheduled'),
  ('537337', 'SUI', 'CAN', 'group', 'B', 3, '2026-06-24T19:00:00Z'::timestamptz, 'scheduled'),
  ('537343', 'SCO', 'BRA', 'group', 'C', 3, '2026-06-24T22:00:00Z'::timestamptz, 'scheduled'),
  ('537344', 'MAR', 'HAI', 'group', 'C', 3, '2026-06-24T22:00:00Z'::timestamptz, 'scheduled'),
  ('537332', 'RSA', 'KOR', 'group', 'A', 3, '2026-06-25T01:00:00Z'::timestamptz, 'scheduled'),
  ('537331', 'CZE', 'MEX', 'group', 'A', 3, '2026-06-25T01:00:00Z'::timestamptz, 'scheduled'),
  ('537356', 'CUW', 'CIV', 'group', 'E', 3, '2026-06-25T20:00:00Z'::timestamptz, 'scheduled'),
  ('537355', 'ECU', 'GER', 'group', 'E', 3, '2026-06-25T20:00:00Z'::timestamptz, 'scheduled'),
  ('537362', 'JPN', 'SWE', 'group', 'F', 3, '2026-06-25T23:00:00Z'::timestamptz, 'scheduled'),
  ('537361', 'TUN', 'NED', 'group', 'F', 3, '2026-06-25T23:00:00Z'::timestamptz, 'scheduled'),
  ('537350', 'PAR', 'AUS', 'group', 'D', 3, '2026-06-26T02:00:00Z'::timestamptz, 'scheduled'),
  ('537349', 'TUR', 'USA', 'group', 'D', 3, '2026-06-26T02:00:00Z'::timestamptz, 'scheduled'),
  ('537396', 'SEN', 'IRQ', 'group', 'I', 3, '2026-06-26T19:00:00Z'::timestamptz, 'scheduled'),
  ('537395', 'NOR', 'FRA', 'group', 'I', 3, '2026-06-26T19:00:00Z'::timestamptz, 'scheduled'),
  ('537374', 'CPV', 'KSA', 'group', 'H', 3, '2026-06-27T00:00:00Z'::timestamptz, 'scheduled'),
  ('537373', 'URY', 'ESP', 'group', 'H', 3, '2026-06-27T00:00:00Z'::timestamptz, 'scheduled'),
  ('537368', 'EGY', 'IRN', 'group', 'G', 3, '2026-06-27T03:00:00Z'::timestamptz, 'scheduled'),
  ('537367', 'NZL', 'BEL', 'group', 'G', 3, '2026-06-27T03:00:00Z'::timestamptz, 'scheduled'),
  ('537414', 'CRO', 'GHA', 'group', 'L', 3, '2026-06-27T21:00:00Z'::timestamptz, 'scheduled'),
  ('537413', 'PAN', 'ENG', 'group', 'L', 3, '2026-06-27T21:00:00Z'::timestamptz, 'scheduled'),
  ('537408', 'COD', 'UZB', 'group', 'K', 3, '2026-06-27T23:30:00Z'::timestamptz, 'scheduled'),
  ('537407', 'COL', 'POR', 'group', 'K', 3, '2026-06-27T23:30:00Z'::timestamptz, 'scheduled'),
  ('537402', 'ALG', 'AUT', 'group', 'J', 3, '2026-06-28T02:00:00Z'::timestamptz, 'scheduled'),
  ('537401', 'JOR', 'ARG', 'group', 'J', 3, '2026-06-28T02:00:00Z'::timestamptz, 'scheduled')
on conflict (external_id) do nothing;

-- =============================================================
-- Nota: o schedule do sync-matches está em supabase/config.toml
-- [functions.sync-matches]
-- schedule = "*/10 * * * *"
-- O pg_cron mantém apenas o recalc_finished_bets (SQL puro, sem HTTP).
-- =============================================================
