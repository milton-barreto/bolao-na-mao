-- =============================================================
-- Migration 008: Mata-mata, Bilhete Premiado, Rebalanceamento
-- =============================================================

-- =============================================================
-- Campo bracket_slot em matches (para topologia do SVG bracket)
-- Valores 0-15 para R32, determinados pelo admin ao semear os jogos
-- =============================================================
alter table matches add column if not exists bracket_slot int;

-- =============================================================
-- Tabela golden_tickets (Bilhete Premiado)
-- predictions JSONB:
--   r32: { "match_uuid": "team_id" }    -- quem avança dos 16-avos
--   r16: { "0": "team_id", ... "7": "team_id" }  -- quem avança das oitavas
--   qf:  { "0": "team_id", ... "3": "team_id" }  -- quem avança das quartas
--   sf:  { "0": "team_id", "1": "team_id" }      -- os dois finalistas
--   champion: "team_id"  -- o campeão (também responsável pelos 5pts do confronto final)
-- =============================================================
create table if not exists golden_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  predictions jsonb not null default '{}',
  locked_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

comment on table golden_tickets is 'Bilhete Premiado: previsão do chaveamento do mata-mata por usuário';

-- Trigger updated_at
create or replace function set_golden_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_golden_ticket_updated_at
  before update on golden_tickets
  for each row execute function set_golden_ticket_updated_at();

-- =============================================================
-- RLS: golden_tickets
-- =============================================================
alter table golden_tickets enable row level security;

create policy "golden_tickets: select proprio ou admin"
  on golden_tickets for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "golden_tickets: insert proprio"
  on golden_tickets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "golden_tickets: update proprio nao travado"
  on golden_tickets for update
  to authenticated
  using (user_id = auth.uid() and locked_at is null)
  with check (user_id = auth.uid() and locked_at is null);

create policy "golden_tickets: admin pode tudo"
  on golden_tickets for all
  to authenticated
  using (is_admin());

-- =============================================================
-- RLS adicional: app_config — tournament_state legível por todos
-- =============================================================
create policy "app_config: select tournament_state autenticado"
  on app_config for select
  to authenticated
  using (key = 'tournament_state');

-- =============================================================
-- Seed / normalização: tournament_state como string simples
-- Migra o formato antigo (objeto JSON) para string simples "group"
-- =============================================================
insert into app_config (key, value)
  values ('tournament_state', '"group"')
  on conflict (key) do update
    set value = '"group"'
    where app_config.value::text not in (
      '"group"', '"r32_open"', '"r32"', '"r16_open"', '"r16"',
      '"qf_open"', '"qf"', '"sf_open"', '"sf"', '"final_open"', '"final"', '"finished"'
    );

-- =============================================================
-- CHECK constraint: tournament_state só aceita estados válidos
-- NOT VALID: não valida linhas existentes, apenas novas inserções/atualizações
-- =============================================================
alter table app_config add constraint chk_tournament_state_value
  check (
    key != 'tournament_state' or (
      jsonb_typeof(value) = 'string' and
      value#>>'{}' in (
        'group', 'r32_open', 'r32', 'r16_open', 'r16',
        'qf_open', 'qf', 'sf_open', 'sf', 'final_open', 'final', 'finished'
      )
    )
  ) not valid;

-- =============================================================
-- Índices
-- =============================================================
create index if not exists idx_golden_tickets_user_id
  on golden_tickets (user_id);

create index if not exists idx_matches_phase_status
  on matches (phase, status);

create index if not exists idx_matches_bracket_slot
  on matches (phase, bracket_slot)
  where phase in ('r32', 'r16', 'qf', 'sf', 'final');

-- =============================================================
-- Função: calculate_golden_ticket_points
-- Pontua o bilhete premiado de um usuário contra os resultados reais.
-- Pontos: r32=1, r16=2, qf=5, sf=5, final=5+10 (confronto+campeão).
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

  -- Final: 5pts (confronto final) + 10pts (campeão) se acertou
  select advancing_team_id into v_final_winner
  from matches
  where phase = 'final'
    and status = 'finished'
    and advancing_team_id is not null
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

-- =============================================================
-- Função: lock_all_golden_tickets
-- Trava todos os bilhetes ainda abertos (locked_at IS NULL).
-- Chamada quando admin avança tournament_state de r32_open → r32.
-- Retorna o número de bilhetes travados.
-- =============================================================
create or replace function lock_all_golden_tickets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update golden_tickets
  set locked_at = now()
  where locked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================
-- Função: admin_trigger_rebalancing
-- Implementa o algoritmo completo de rebalanceamento de tiers (§5.6).
--
-- Matriz de pontos de tier:
--   Win vs melhor oponente (tier < team_tier): +3
--   Win vs mesmo tier:                         +1
--   Win vs pior oponente (tier > team_tier):   0
--   Draw vs melhor:                            +1
--   Draw vs mesmo:                             0
--   Draw vs pior:                              -1
--   Loss vs melhor:                            0
--   Loss vs mesmo:                             -1
--   Loss vs pior:                              -3
--
-- Multiplicador ×1.5 se |diff_tier| >= 2.
-- Média >= +1 → sobe 1 tier (não sobe T1).
-- Média <= -1 → desce 1 tier (não desce T5).
-- Se p_dry_run = false: persiste em teams + tier_history + admin_logs.
-- =============================================================
create or replace function admin_trigger_rebalancing(
  p_window   text,
  p_admin_id uuid,
  p_reason   text,
  p_dry_run  boolean default false
)
returns table(
  out_team_id     text,
  out_team_name   text,
  out_current_tier int,
  out_new_tier    int,
  out_delta       int,
  out_avg_score   numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phases       text[];
  v_hist_reason  text;
  v_rec          record;
begin
  -- Valida janela
  case p_window
    when 'post_groups' then
      v_phases := array['group'];
      v_hist_reason := 'group_rebalance';
    when 'post_r16' then
      v_phases := array['r32', 'r16'];
      v_hist_reason := 'r16_rebalance';
    else
      raise exception 'window inválido: %. Use post_groups ou post_r16', p_window;
  end case;

  for v_rec in (
    -- Passo 1: pega cada partida finalizada da janela do ponto de vista de cada time
    with team_match_view as (
      select
        t.id                                               as team_id,
        t.name                                             as team_name,
        t.current_tier                                     as cur_tier,
        m.id                                               as match_id,
        -- resultado da perspectiva do time
        case
          when m.home_team_id = t.id then
            case when m.home_score > m.away_score then 'win'
                 when m.home_score < m.away_score then 'loss'
                 else 'draw' end
          else -- away
            case when m.away_score > m.home_score then 'win'
                 when m.away_score < m.home_score then 'loss'
                 else 'draw' end
        end                                                as result,
        -- tier do time no kickoff
        case when m.home_team_id = t.id
             then m.home_tier_at_kickoff
             else m.away_tier_at_kickoff end               as team_tier_ko,
        -- tier do adversário no kickoff
        case when m.home_team_id = t.id
             then m.away_tier_at_kickoff
             else m.home_tier_at_kickoff end               as opp_tier_ko
      from teams t
      join matches m
        on (m.home_team_id = t.id or m.away_team_id = t.id)
      where m.phase = any(v_phases)
        and m.status = 'finished'
        and m.home_score is not null
        and m.away_score is not null
        and m.home_tier_at_kickoff is not null
        and m.away_tier_at_kickoff is not null
    ),
    -- Passo 2: calcula pontos de tier por partida (com multiplicador)
    match_points as (
      select
        tmv.team_id,
        tmv.team_name,
        tmv.cur_tier,
        -- pontos brutos pela matriz
        (case tmv.result
          when 'win' then
            case when tmv.opp_tier_ko < tmv.team_tier_ko then 3    -- venceu melhor
                 when tmv.opp_tier_ko = tmv.team_tier_ko then 1    -- venceu igual
                 else 0 end                                         -- venceu pior
          when 'draw' then
            case when tmv.opp_tier_ko < tmv.team_tier_ko then 1    -- empatou melhor
                 when tmv.opp_tier_ko = tmv.team_tier_ko then 0    -- empatou igual
                 else -1 end                                        -- empatou pior
          else -- loss
            case when tmv.opp_tier_ko < tmv.team_tier_ko then 0    -- perdeu pro melhor
                 when tmv.opp_tier_ko = tmv.team_tier_ko then -1   -- perdeu pro igual
                 else -3 end                                        -- perdeu pro pior
        end)::numeric
        -- multiplicador ×1.5 se diferença de tier >= 2
        * case when abs(tmv.opp_tier_ko - tmv.team_tier_ko) >= 2
               then 1.5 else 1.0 end                               as adj_pts
      from team_match_view tmv
    ),
    -- Passo 3: agrega e calcula média por time
    team_summary as (
      select
        mp.team_id,
        mp.team_name,
        mp.cur_tier,
        round(avg(mp.adj_pts), 4) as avg_pts,
        count(*)                   as match_count
      from match_points mp
      group by mp.team_id, mp.team_name, mp.cur_tier
    ),
    -- Passo 4: determina novo tier
    new_tiers as (
      select
        ts.team_id,
        ts.team_name,
        ts.cur_tier,
        ts.avg_pts,
        case
          when ts.avg_pts >= 1 and ts.cur_tier > 1 then ts.cur_tier - 1  -- sobe (melhora)
          when ts.avg_pts <= -1 and ts.cur_tier < 5 then ts.cur_tier + 1 -- desce (piora)
          else ts.cur_tier                                                  -- mantém
        end as calc_new_tier
      from team_summary ts
    )
    select
      nt.team_id,
      nt.team_name,
      nt.cur_tier,
      nt.calc_new_tier,
      nt.calc_new_tier - nt.cur_tier as delta_val,
      nt.avg_pts
    from new_tiers nt
    order by nt.team_name
  )
  loop
    -- Persistir se não for dry run e houve mudança
    if not p_dry_run and v_rec.delta_val != 0 then
      update teams
      set current_tier = v_rec.calc_new_tier
      where id = v_rec.team_id;

      insert into tier_history (team_id, from_tier, to_tier, changed_by, reason, changed_at)
      values (
        v_rec.team_id,
        v_rec.cur_tier,
        v_rec.calc_new_tier,
        p_admin_id,
        v_hist_reason,
        now()
      );
    end if;

    -- Retornar linha
    out_team_id      := v_rec.team_id;
    out_team_name    := v_rec.team_name;
    out_current_tier := v_rec.cur_tier;
    out_new_tier     := v_rec.calc_new_tier;
    out_delta        := v_rec.delta_val;
    out_avg_score    := v_rec.avg_pts;
    return next;
  end loop;

  -- Registra no admin_logs se não for dry run
  if not p_dry_run then
    insert into admin_logs (action, admin_id, target_table, reason)
    values (
      'rebalance_tiers',
      p_admin_id,
      'teams',
      p_reason || ' [janela: ' || p_window || ']'
    );
  end if;

end;
$$;
