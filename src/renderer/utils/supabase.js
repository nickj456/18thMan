import { createClient } from '@supabase/supabase-js'

let _client = null

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) return null
  _client = createClient(url, anonKey, {
    auth: { storageKey: '18thman-email' },
  })
  return _client
}

export function getSupabase() { return _client }
