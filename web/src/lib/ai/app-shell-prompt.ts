import { APP_SHELL_TWA } from '@/lib/app-shell'

/**
 * AI assistants inside the Android app. That app is consumption-only (see
 * lib/app-shell.ts), and a CSS rule can't hide text a model writes, so the
 * prompts themselves must not quote prices or direct anyone to pay. The chat
 * clients send `appShell: 'twa'` in the request body when running in the app.
 */

export function isAndroidAppRequest(body: unknown): boolean {
  return typeof body === 'object' && body !== null && (body as { appShell?: unknown }).appShell === APP_SHELL_TWA
}

export const ANDROID_APP_PROMPT_RULE =
  "The user is in the 18th Man Android app, where plans and purchases aren't available. " +
  'Never quote prices. Never suggest upgrading, subscribing or buying anything, and never point them to the pricing page, ' +
  'checkout, billing, or any other way to pay. If they ask about plans, prices or upgrading, say plans ' +
  "aren't available in the Android app. You may still say that a feature isn't included in their current plan."

const PLAN_BLOCK = /<!-- plans:start -->[\s\S]*?<!-- plans:end -->\n?/g

/** Removes `<!-- plans:start -->…<!-- plans:end -->` blocks (prices, upgrade directions) from a guide. */
export function stripPlanBlocks(markdown: string): string {
  return markdown.replace(PLAN_BLOCK, '')
}

/**
 * The system prompt for the shell the request came from. Prompts keep every
 * price and upgrade direction inside plans blocks (app-shell-prompt.test.ts
 * enforces this for the chat route and help guide); in the Android app those
 * blocks go and the no-selling rule is added.
 */
export function promptForShell(prompt: string, inAndroidApp: boolean): string {
  if (!inAndroidApp) return prompt
  return `${stripPlanBlocks(prompt).trimEnd()}\n\n## Android app\n${ANDROID_APP_PROMPT_RULE}`
}
