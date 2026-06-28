-- =============================================================
-- Migration: Corrige política RLS de golden_tickets
-- Problema: with check não validava locked_at, permitindo que
-- bilhetes pré-travados bloqueassem UPDATE de usuários normais
-- =============================================================

-- Drop a política antiga
drop policy if exists "golden_tickets: update proprio nao travado" on golden_tickets;

-- Recriar com with check correto
create policy "golden_tickets: update proprio nao travado"
  on golden_tickets for update
  to authenticated
  using (user_id = auth.uid() and locked_at is null)
  with check (user_id = auth.uid() and locked_at is null);
