'use client'

import { useEffect } from 'react'

/**
 * Registers public/sw.js, which only adds an offline fallback page for
 * navigations (see that file). Production only: in dev a service worker would
 * fight hot reload. Registration failure is harmless — the site works without it.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[sw] registration failed', err)
    })
  }, [])

  return null
}
