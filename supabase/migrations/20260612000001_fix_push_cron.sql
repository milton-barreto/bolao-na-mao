-- =============================================================
-- Fix cron job send-push-every-2min
-- Problema: body := '{}'::bytea não bate com a assinatura de
--           net.http_post que espera jsonb.
-- Solução:  recriar o job com body := '{}'::jsonb
-- =============================================================

-- Remove o job quebrado
SELECT cron.unschedule('send-push-every-2min');

-- Recria com tipos corretos
-- verify_jwt = false na Edge Function, não precisa de Authorization
SELECT cron.schedule(
  'send-push-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tabfqaxubgmjkxekojpm.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
