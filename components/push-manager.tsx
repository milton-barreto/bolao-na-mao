'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { savePushSubscription } from '@/lib/actions/push'

const STORAGE_KEY = 'push_asked'

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str)
}

export function PushManager() {
  useEffect(() => {
    // Só pede uma vez — localStorage guarda a decisão para sempre
    if (localStorage.getItem(STORAGE_KEY)) return
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    async function requestPermission() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const permission = await Notification.requestPermission()
      localStorage.setItem(STORAGE_KEY, permission)
      if (permission !== 'granted') return

      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!).buffer as ArrayBuffer,
        })

        await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh:   bufferToBase64(sub.getKey('p256dh')!),
          auth_key: bufferToBase64(sub.getKey('auth')!),
        })
      } catch (err) {
        console.error('[push] subscribe failed:', err)
      }
    }

    // Pequeno delay para não competir com a carga inicial
    const t = setTimeout(requestPermission, 3500)
    return () => clearTimeout(t)
  }, [])

  return null
}
