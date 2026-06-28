-- =============================================================
-- Migration: Corrige RLS de golden_tickets para permitir UPDATE/UPSERT
--
-- Problema: Política UPDATE com WITH CHECK validando locked_at foi muito
-- restritiva e causava erro ao fazer UPSERT (new row violates RLS policy).
--
-- Solução: Mover validação de locked_at para TypeScript (saveGoldenTicket)
-- e deixar WITH CHECK apenas validar user_id = owner.
--
-- RLS agora protege: USING (user_id = auth.uid() and locked_at is null)
-- TypeScript protege: fetch bilhete, verifica locked_at antes de UPSERT
-- =============================================================

-- Recriar todas as políticas de golden_tickets com lógica correta
drop policy if exists "golden_tickets: select proprio ou admin" on golden_tickets;
drop policy if exists "golden_tickets: insert proprio" on golden_tickets;
drop policy if exists "golden_tickets: update proprio nao travado" on golden_tickets;
drop policy if exists "golden_tickets: admin pode tudo" on golden_tickets;

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
  with check (user_id = auth.uid());

create policy "golden_tickets: admin pode tudo"
  on golden_tickets for all
  to authenticated
  using (is_admin());
