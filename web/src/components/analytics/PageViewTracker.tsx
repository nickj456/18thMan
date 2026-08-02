'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const payload = JSON.stringify({ path: pathname })

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/track-page-view', blob)
    } else {
      // Fire-and-forget: a failed beacon must never surface as an unhandled
      // rejection in the user's console.
      fetch('/api/track-page-view', { method: 'POST', body: payload, keepalive: true }).catch(
        () => {}
      )
    }
  }, [pathname])

  return null
}
