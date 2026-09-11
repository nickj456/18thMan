/**
 * Single source of truth for every Groq model id used in the app.
 *
 * Groq decommissions hosted models on short notice and the API then returns
 * `The model \`X\` does not exist or you do not have access to it` at call
 * time — not at build time, not in typecheck. In September 2026 the entire
 * Llama family (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`,
 * `meta-llama/llama-4-scout-17b-16e-instruct`) went away and silently broke
 * eight separate features at once, because every call site had its own
 * hardcoded string.
 *
 * Never write a model id inline at a call site. Import one of these constants
 * instead — `groq-models.test.ts` scans the source tree and fails the build if
 * a raw id reappears or a decommissioned one is used.
 *
 * To check what the account can actually serve right now:
 *   curl -H "Authorization: Bearer $GROQ_API_KEY" \
 *     https://api.groq.com/openai/v1/models
 */

/** Long-form generation and structured output: game plans, session plans, chat. */
export const GROQ_TEXT_HEAVY = 'openai/gpt-oss-120b'

/** Short, cheap, latency-sensitive extraction: tagging, summarising a video. */
export const GROQ_TEXT_FAST = 'openai/gpt-oss-20b'

/** Safety classification. Purpose-built for policy screening; fails closed. */
export const GROQ_SAFEGUARD = 'openai/gpt-oss-safeguard-20b'

/** Every id the app is allowed to send to Groq. */
export const ALLOWED_GROQ_MODELS = [
  GROQ_TEXT_HEAVY,
  GROQ_TEXT_FAST,
  GROQ_SAFEGUARD,
] as const

/**
 * Ids Groq has retired. Kept so the regression test can name the culprit
 * explicitly rather than just saying "unknown model" — add to this list
 * whenever a model we used gets decommissioned.
 */
export const DECOMMISSIONED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const
