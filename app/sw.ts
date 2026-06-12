import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from 'serwist'

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope & {
  registration: {
    showNotification(title: string, options?: object): Promise<void>
  }
  clients: {
    matchAll(options?: object): Promise<{ url: string; focus(): Promise<unknown> }[]>
    openWindow(url: string): Promise<unknown>
  }
  addEventListener(type: string, listener: (event: unknown) => void): void
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
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

self.addEventListener('push', (e) => {
  const event = e as { data?: { json(): unknown }; waitUntil(p: Promise<unknown>): void }
  const data = (event.data?.json() ?? {}) as {
    title?: string
    body?: string
    url?: string
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Bolão na Mão', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  const event = e as {
    notification: { close(): void; data?: { url?: string } }
    waitUntil(p: Promise<unknown>): void
  }
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })(),
  )
})
