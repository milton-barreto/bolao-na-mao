-- =============================================================
-- Migration: Destrava bilhetes premiados e relaxa RLS de UPDATE
--
-- Causa-raiz do erro "new row violates row-level security policy":
-- Os bilhetes foram travados (locked_at NOT NULL) por um auto-lock antigo
-- que disparava ao avançar o tournament_state para 'r32'. Com locked_at
-- preenchido, a cláusula USING (... and locked_at is null) da política
-- UPDATE esconde a linha durante o .upsert(), e o Postgres rejeita com
-- "new row violates RLS". O admin escapa pela política "admin pode tudo".
--
-- Esta migration:
--   (a) Destrava todos os bilhetes (locked_at = NULL).
--   (b) Relaxa a política UPDATE: USING/WITH CHECK apenas user_id = auth.uid().
--       O bloqueio pós-prazo passa a ser enforçado server-side no Server
--       Action saveGoldenTicket() via TICKET_EDIT_DEADLINE (15:00 Fortaleza),
--       e pela pré-checagem de locked_at em TypeScript (lock manual de admin).
-- =============================================================

-- (a) Destrava bilhetes travados prematuramente
update golden_tickets
set locked_at = null
where locked_at is not null;

-- (b) Recria a política UPDATE sem o filtro locked_at no USING
drop policy if exists "golden_tickets: update proprio nao travado" on golden_tickets;
drop policy if exists "golden_tickets: update proprio" on golden_tickets;

create policy "golden_tickets: update proprio"
  on golden_tickets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
