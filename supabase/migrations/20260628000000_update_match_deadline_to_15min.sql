-- =============================================================
-- Migration: Alterar deadline de aposta de 1h → 10 minutos
-- Usa trigger em vez de coluna gerada (timestamptz - interval
-- é STABLE, não aceito em ALTER TABLE generated always as).
-- =============================================================

-- Remover coluna gerada antiga (CASCADE dropa policies dependentes)
alter table matches drop column deadline_at cascade;

-- Recriar como coluna regular
alter table matches add column deadline_at timestamptz;

-- Preencher valores existentes
update matches set deadline_at = kickoff_at - interval '10 minutes';

-- Trigger para manter deadline_at em sincronia com kickoff_at
create or replace function matches_set_deadline()
returns trigger as $$
begin
  new.deadline_at := new.kickoff_at - interval '10 minutes';
  return new;
end;
$$ language plpgsql;

create trigger trg_matches_set_deadline
  before insert or update of kickoff_at on matches
  for each row execute function matches_set_deadline();

-- Índice de performance
create index if not exists idx_matches_deadline_at on matches (deadline_at);

-- Recriar policies de bets (dropadas pelo CASCADE acima)
create policy "bets: select alheio após deadline"
  on bets for select to authenticated
  using (
    user_id != auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id and m.deadline_at < now()
    )
  );

create policy "bets: insert owner antes do deadline"
  on bets for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id
        and m.deadline_at > now()
        and m.status not in ('cancelled')
    )
  );

create policy "bets: update owner antes do deadline"
  on bets for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id and m.deadline_at > now()
    )
  );

create policy "bets: delete owner antes do deadline"
  on bets for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = bets.match_id and m.deadline_at > now()
    )
  );
