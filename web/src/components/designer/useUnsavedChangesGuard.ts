'use client'

import { useCallback, useEffect, useRef } from 'react'

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes to this drill. Leave without saving?'

/**
 * Warns before the coach leaves the designer with unsaved work.
 *
 * - Browser close / refresh / external navigation: the native beforeunload prompt.
 * - In-app links (the page back link, the sidebar, anything rendered as <a>): a
 *   capture-phase click listener asks first. Next's <Link> skips navigation when
 *   the click was default-prevented, and stopping propagation at the document
 *   means React's handlers never see a cancelled click.
 *
 * Returns `allowNavigation`, which turns the guard off for the rest of the page's
 * life; call it right before navigating away after a successful save.
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  const bypassRef = useRef(false)

  useEffect(() => {
    if (!dirty) return

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (bypassRef.current) return
      e.preventDefault()
      // Older browsers need returnValue set to show the prompt.
      e.returnValue = ''
    }

    function onClick(e: MouseEvent) {
      if (bypassRef.current || e.defaultPrevented) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // opens elsewhere
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return // full page load: beforeunload covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm(message)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, message])

  return useCallback(() => {
    bypassRef.current = true
  }, [])
}
