import type { ReactNode } from 'react'

export const ANDROID_APP_PURCHASE_NOTICE =
  "Plans and purchases aren't available in the Android app. Everything your account already includes works here as normal."

/**
 * Shown only inside the Android app, in place of purchase UI that's hidden there
 * (lib/app-shell.ts). Server-safe: visibility is pure CSS (.only-in-app). Keep the
 * wording factual — no links or directions to pay elsewhere, which Play policy
 * treats the same as a buy button.
 */
export function AndroidAppNotice({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`only-in-app rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400 ${className}`}>
      {children ?? ANDROID_APP_PURCHASE_NOTICE}
    </div>
  )
}
