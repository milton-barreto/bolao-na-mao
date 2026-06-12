import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
    // Service Worker specific globals (not in WorkerGlobalScope by default)
    readonly registration: {
      showNotification(title: string, options?: object): Promise<void>
    }
    readonly clients: {
      matchAll(options?: object): Promise<{ url: string; focus(): Promise<unknown> }[]>
      openWindow(url: string): Promise<unknown>
    }
  }
}

// @ts-expect-error — ServiceWorker global scope não está no tsconfig dom lib
const sw = self as WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: sw.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\/$/,
      handler: new NetworkFirst({
        cacheName: 'pages',
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
  ],
})

serwist.addEventListeners()

// ── Web Push ──────────────────────────────────────────────────

// @ts-expect-error — PushEvent não está nas lib-dom types do tsconfig SW
sw.addEventListener('push', (event: PushEvent) => {
  const data = (event.data?.json() ?? {}) as {
    title?: string
    body?: string
    url?: string
  }
  event.waitUntil(
    sw.registration.showNotification(data.title ?? 'Bolão na Mão', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    }),
  )
})

// @ts-expect-error — NotificationEvent não está nas lib-dom types do tsconfig SW
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'
  event.waitUntil(
    (async () => {
      const windowClients = await sw.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      if (sw.clients.openWindow) return sw.clients.openWindow(url)
    })(),
  )
})
