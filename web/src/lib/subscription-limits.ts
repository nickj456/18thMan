// Plain constants only -- no imports. subscription.ts (server-only, depends
// on next/headers via the Supabase server client) re-exports these, but
// client components that only need the numbers -- not the DB-backed tier
// logic -- must import from here directly, or bundling pulls server-only
// code into the client bundle and breaks the production build.
export const FREE_DRILL_LIMIT = 20
export const FREE_SESSION_LIMIT = 1
export const FREE_AI_CHAT_DAILY_LIMIT = 20
