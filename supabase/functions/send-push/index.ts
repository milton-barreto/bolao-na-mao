// =============================================================
// Edge Function: send-push
// Roda a cada 2min (config.toml schedule).
// 1. Enfileira lembretes de deadline (matches fechando em ~30min)
// 2. Processa a push_queue e envia as Web Push notifications via VAPID
// =============================================================

import webPush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_SUBJECT = 'mailto:bolao@bolaonamao.com'

interface QueueItem {
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  title: string
  body: string
  url: string
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')

  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ error: 'VAPID keys não configuradas' }, { status: 500 })
  }

  webPush.setVapidDetails(VAPID_SUBJECT, vapidPublic, vapidPrivate)

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Enfileira lembretes de deadline
  await supabase.rpc('check_deadline_reminders')

  // 2. Obtém fila + marca como enviados atomicamente
  const { data: items, error } = await supabase.rpc('process_push_queue')
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const item of (items as QueueItem[]) ?? []) {
    try {
      await webPush.sendNotification(
        {
          endpoint: item.endpoint,
          keys: { p256dh: item.p256dh, auth: item.auth_key },
        },
        JSON.stringify({
          title: item.title,
          body:  item.body,
          url:   item.url ?? '/',
        }),
      )
      sent++
    } catch (err) {
      const msg = String(err)
      errors.push(msg)
      // 410 Gone = subscription expirou, remove do banco
      if (msg.includes('410') || msg.includes('Gone')) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', item.endpoint)
      }
    }
  }

  return Response.json({ sent, queued: items?.length ?? 0, errors })
})
