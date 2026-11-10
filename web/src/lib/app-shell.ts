/**
 * Detecting the 18th Man Android app — a Trusted Web Activity (TWA) that wraps
 * 18thman.app full-screen in Chrome. See docs/android-release.md.
 *
 * Google Play only lets an app sell digital subscriptions through Play Billing,
 * so inside the Android app we run "consumption-only": every way to buy (pricing,
 * Stripe checkout and billing portal, shop purchases, upgrade CTAs) is hidden.
 * Coaches who already pay just sign in and keep their tier; buying stays on the
 * website.
 *
 * How it works:
 * - The app launches `/dashboard?source=twa`, and Chrome also sets
 *   `document.referrer` to `android-app://<package>` on the first page of a TWA
 *   session (including deep links, which don't carry our query param).
 * - APP_SHELL_BOOTSTRAP_SCRIPT runs inline in <head> before first paint and sets
 *   <html data-app-shell="twa">. CSS in globals.css then hides `.hide-in-app`
 *   (plus any link to /pricing) and reveals `.only-in-app`. No flash of pricing,
 *   no hydration mismatch, and it works inside Server Components.
 * - The flag is kept in sessionStorage, not a cookie: a TWA shares Chrome's
 *   cookie jar, so a cookie would hide pricing in the coach's ordinary browser
 *   tabs too. sessionStorage is per-tab, and the app re-detects on each launch.
 *
 * This is a UI policy, not a security boundary — the Stripe routes don't (and
 * shouldn't) care which shell called them.
 */

/** Play Store application id. Permanent once the app is uploaded — never change it. */
export const ANDROID_PACKAGE_NAME = 'app.eighteenthman.twa'

export const APP_SHELL_TWA = 'twa'
export const APP_SHELL_QUERY_PARAM = 'source'
export const APP_SHELL_STORAGE_KEY = '18m:app-shell'
export const APP_SHELL_ATTRIBUTE = 'data-app-shell'

/** Path the Android app opens on launch. Logged-out coaches are bounced to /login with it as `next`. */
export const ANDROID_START_PATH = `/dashboard?${APP_SHELL_QUERY_PARAM}=${APP_SHELL_TWA}`

/**
 * True when this page load is the start of a TWA session. Mirrors the inline
 * bootstrap script below — app-shell.test.ts runs both against the same cases.
 */
export function isTwaLaunch(search: string, referrer: string, packageName: string = ANDROID_PACKAGE_NAME): boolean {
  if (new URLSearchParams(search).get(APP_SHELL_QUERY_PARAM) === APP_SHELL_TWA) return true
  const origin = `android-app://${packageName}`
  return referrer === origin || referrer.startsWith(`${origin}/`)
}

/**
 * For client code that builds sales text in JS (toasts, confirm dialogs), where
 * the CSS classes can't reach. Read it in event handlers only — calling it during
 * render would differ between server and client and break hydration.
 */
export function isInAndroidApp(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute(APP_SHELL_ATTRIBUTE) === APP_SHELL_TWA
}

/** Extra body fields for AI chat requests, so the server can drop prices from the prompt (lib/ai/app-shell-prompt.ts). */
export function appShellRequestBody(): { appShell?: typeof APP_SHELL_TWA } {
  return isInAndroidApp() ? { appShell: APP_SHELL_TWA } : {}
}

const q = JSON.stringify

/**
 * Inline <head> script. Plain ES5, self-contained, and each storage access is
 * guarded separately: if sessionStorage is blocked we still mark this page, we
 * just lose the flag on the next navigation.
 */
export const APP_SHELL_BOOTSTRAP_SCRIPT =
  `(function(){var v=${q(APP_SHELL_TWA)},k=${q(APP_SHELL_STORAGE_KEY)},a=${q(`android-app://${ANDROID_PACKAGE_NAME}`)},t=false;` +
  `try{var r=document.referrer;t=new URLSearchParams(location.search).get(${q(APP_SHELL_QUERY_PARAM)})===v||r===a||r.indexOf(a+"/")===0}catch(e){}` +
  `try{var s=window.sessionStorage;if(t)s.setItem(k,v);else t=s.getItem(k)===v}catch(e){}` +
  `if(t)document.documentElement.setAttribute(${q(APP_SHELL_ATTRIBUTE)},v)})()`
