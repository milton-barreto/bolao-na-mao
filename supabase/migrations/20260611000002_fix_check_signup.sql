-- =============================================================
-- Migration: check_signup_eligibility
-- Returns 'allowed', 'not_allowed', or 'already_registered'
-- so the frontend can redirect existing users to login.
-- SECURITY DEFINER to access auth.users (normally restricted).
-- =============================================================
create or replace function check_signup_eligibility(p_email text)
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select case
    when exists (
      select 1 from auth.users where lower(email) = lower(p_email)
    ) then 'already_registered'
    when exists (
      select 1 from allowed_emails
      where lower(email) = lower(p_email) and used = false
    ) then 'allowed'
    else 'not_allowed'
  end;
$$;

revoke all on function check_signup_eligibility(text) from public;
grant execute on function check_signup_eligibility(text) to anon, authenticated;
