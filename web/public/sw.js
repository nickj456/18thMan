/*
 * 18th Man service worker — deliberately tiny.
 *
 * It does ONE thing: when a page navigation fails because the device is offline,
 * show the cached /offline page instead of Chrome's dinosaur. Everything else
 * (assets, API calls, Server Actions, Supabase) goes straight to the network
 * untouched — no response is ever served stale.
 *
 * Kill switch: if this ever misbehaves, replace the body of this file with
 *   self.addEventListener('install', () => self.skipWaiting())
 *   self.addEventListener('activate', () => self.registration.unregister())
 * and deploy. Bump CACHE when /offline changes.
 */
const CACHE = '18m-offline-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      // Navigation preload starts the network request while the worker boots,
      // so having a service worker doesn't slow down page loads.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse
        if (preloaded) return preloaded
        return await fetch(event.request)
      } catch {
        const cached = await caches.match(OFFLINE_URL)
        return cached || Response.error()
      }
    })(),
  )
})
