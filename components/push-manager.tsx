'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
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

async function subscribe(vapidKey: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }
    const p256dh = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    if (!p256dh || !auth) return false
    await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: bufferToBase64(p256dh),
      auth_key: bufferToBase64(auth),
    })
    return true
  } catch (err) {
    console.error('[push] subscribe failed:', err)
    return false
  }
}

export function PushManager() {
  // null = ainda verificando, false = não mostrar, true = mostrar banner
  const [showBanner, setShowBanner] = useState<boolean>(false)

  useEffect(() => {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

    const stored = localStorage.getItem(PERMISSION_KEY)
    if (stored === 'denied') return
    if (Notification.permission === 'denied') {
      localStorage.setItem(PERMISSION_KEY, 'denied')
      return
    }

    // Já concedido em sessão anterior → renovar subscription silenciosamente
    if (Notification.permission === 'granted') {
      subscribe(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY).catch(() => {})
      return
    }

    // Ainda não pediu → mostrar banner (requer gesto do usuário no Chrome Android)
    const t = setTimeout(() => setShowBanner(true), 1500)
    return () => clearTimeout(t)
  }, [])

  async function handleAllow() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    const result = await Notification.requestPermission()
    localStorage.setItem(PERMISSION_KEY, result)
    setShowBanner(false)
    if (result === 'granted') {
      await subscribe(vapidKey)
    }
  }

  function handleDismiss() {
    localStorage.setItem(PERMISSION_KEY, 'dismissed')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Ativar notificações</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          Avisa quando seu palpite for julgado.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleAllow}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity active:opacity-80"
        >
          Ativar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
