-- =============================================================
-- Migration 005: Auth — allowlist RPC, bucket avatars, seed admin
-- =============================================================

-- =============================================================
-- check_email_allowed
-- Verifica se um e-mail está na allowlist e ainda não foi usado.
-- SECURITY DEFINER para contornar a RLS admin-only de allowed_emails
-- (usuário não-logado precisa checar antes de criar conta).
-- Retorna apenas boolean — não vaza nenhum outro dado.
-- =============================================================
create or replace function check_email_allowed(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from allowed_emails
    where lower(email) = lower(p_email)
      and used = false
  );
$$;

-- Permitir que anon (não-logado) e authenticated chamem a função
revoke all on function check_email_allowed(text) from public;
grant execute on function check_email_allowed(text) to anon, authenticated;

-- =============================================================
-- Bucket de Storage "avatars" (público)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública dos avatares
create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload: usuário autenticado só na própria pasta (avatars/{user_id}/...)
create policy "avatars: upload próprio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: usuário autenticado só na própria pasta
create policy "avatars: update próprio"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: usuário autenticado só na própria pasta
create policy "avatars: delete próprio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- Seed do admin na allowlist
-- ⚠️ TROQUE 'ADMIN_EMAIL_PLACEHOLDER' pelo seu e-mail real ANTES de
--    rodar `npm run db:push`.
-- Após cadastrar a conta com esse e-mail, promova a admin rodando:
--   update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'SEU_EMAIL');
-- =============================================================
insert into allowed_emails (email)
values ('miltonbarreto024@gmail.com')
on conflict (email) do nothing;
