'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { EMAIL_CATEGORIES } from './email-constants'

export async function saveEmailPreferences(
  prefs: Record<string, boolean>,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rows = Object.entries(prefs).map(([category, enabled]) => ({
    user_id: user.id,
    category,
    enabled,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('email_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function unsubscribeFromAll(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rows = EMAIL_CATEGORIES.map(c => ({
    user_id: user.id,
    category: c.key,
    enabled: false,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('email_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}
