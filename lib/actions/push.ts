'use server'

import { createClient } from '@/lib/supabase/server'

export async function savePushSubscription(params: {
  endpoint: string
  p256dh: string
  auth_key: string
}): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('push_subscriptions').upsert(
    {
      user_id:  user.id,
      endpoint: params.endpoint,
      p256dh:   params.p256dh,
      auth_key: params.auth_key,
    },
    { onConflict: 'user_id,endpoint' },
  )
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
}
