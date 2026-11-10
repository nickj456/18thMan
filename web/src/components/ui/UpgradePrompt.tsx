'use client'

import Link from 'next/link'
import { Lock, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

interface UpgradePromptProps {
  feature: string
  description?: string
  /** Overrides the default "{feature} is a club feature" heading -- use when `feature` doesn't read naturally as the subject of that sentence (e.g. a specific error case with its own wording). */
  heading?: string
  /**
   * What to say instead of `description` inside the Android app, which is consumption-only
   * (lib/app-shell.ts) — explain the limit, never point at a way to pay.
   */
  appDescription?: string
  /** If true, renders as a dismissible modal overlay */
  modal?: boolean
  onDismiss?: () => void
}

export const DEFAULT_APP_UPGRADE_DESCRIPTION = "This isn't included in your current plan."

/**
 * Inline upgrade prompt — shown when a free-tier user tries to access a gated feature.
 * Pass modal=true to wrap it in a full-screen overlay.
 *
 * Both the web and Android-app wording are rendered; CSS keyed off
 * <html data-app-shell> shows one (globals.css). The "See club plans" link is
 * hidden in the app by its /pricing href.
 */
export function UpgradePrompt({ feature, description, heading, appDescription, modal, onDismiss }: UpgradePromptProps) {
  const card = (
    <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
      {modal && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-primary" />
        </div>
        <div>
          {heading ? (
            <h3 className="font-semibold text-sm text-white">{heading}</h3>
          ) : (
            <h3 className="font-semibold text-sm text-white">
              <span className="hide-in-app">{feature} is a club feature</span>
              <span className="only-in-app">{feature} isn&rsquo;t on your current plan</span>
            </h3>
          )}
          <p className="hide-in-app text-sm text-zinc-400 mt-0.5">
            {description ?? `${feature} is available on the club subscription. Upgrade to unlock it for your whole coaching staff.`}
          </p>
          <p className="only-in-app text-sm text-zinc-400 mt-0.5">
            {appDescription ?? DEFAULT_APP_UPGRADE_DESCRIPTION}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium transition-colors"
        >
          <Sparkles size={13} />
          See club plans
        </Link>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  )

  if (!modal) return card

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md">
        {card}
      </div>
    </div>
  )
}

/**
 * Hook to manage upgrade prompt visibility triggered by a server action error.
 * Returns a show flag, a handler to call with the error string, and a dismiss fn.
 */
export function useUpgradePrompt() {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)

  function checkError(error: string | undefined) {
    if (error?.includes('Upgrade') || error?.includes('club subscription')) {
      setMessage(error)
      setShow(true)
      return true
    }
    return false
  }

  return {
    show,
    message,
    checkError,
    dismiss: () => { setShow(false); setMessage(undefined) },
  }
}
