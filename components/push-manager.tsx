'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { savePushSubscription } from '@/lib/actions/push'

const PERMISSION_KEY = 'push_permission'

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str)
}

async function getOrCreateSubscription(
  reg: ServiceWorkerRegistration,
  vapidKey: string,
): Promise<PushSubscription | null> {
  try {
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing

    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  } catch (err) {
    console.error('[push] subscribe failed:', err)
    return null
  }
}

export function PushManager() {
  useEffect(() => {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const storedPermission = localStorage.getItem(PERMISSION_KEY)
    if (storedPermission === 'denied') return

    async function setupPush() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const currentPermission = Notification.permission

      if (currentPermission === 'denied') {
        localStorage.setItem(PERMISSION_KEY, 'denied')
        return
      }

      // Se ainda não pediu permissão, pede agora
      if (currentPermission === 'default') {
        const result = await Notification.requestPermission()
        localStorage.setItem(PERMISSION_KEY, result)
        if (result !== 'granted') return
      }

      // Permissão concedida — garante que a subscription está ativa e salva
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await getOrCreateSubscription(reg, vapidKey!)
        if (!sub) return

        const p256dh = sub.getKey('p256dh')
        const auth = sub.getKey('auth')
        if (!p256dh || !auth) return

        await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh: bufferToBase64(p256dh),
          auth_key: bufferToBase64(auth),
        })
        localStorage.setItem(PERMISSION_KEY, 'granted')
      } catch (err) {
        console.error('[push] setup failed:', err)
      }
    }

    // Pequeno delay para não competir com a carga inicial
    const t = setTimeout(setupPush, 3500)
    return () => clearTimeout(t)
  }, [])

  return null
}
