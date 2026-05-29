import { createClient } from '@supabase/supabase-js'

/** Service-role client — bypasses RLS. Only use server-side for privileged operations. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}
