'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const EMAIL_CATEGORIES = [
  { key: 'dm', label: 'Direct messages', group: 'Notifications' },
  { key: 'drill_rating', label: 'Drill ratings & comments', group: 'Notifications' },
  { key: 'club_invite', label: 'Club & group invites', group: 'Notifications' },
  { key: 'new_follower', label: 'New followers', group: 'Notifications' },
  { key: 'session_scheduled', label: 'Sessions scheduled', group: 'Notifications' },
  { key: 'weekly_focus', label: 'Weekly focus published', group: 'Club & Content' },
  { key: 'new_public_drill', label: 'New public drills', group: 'Club & Content' },
  { key: 'podcast', label: 'New podcast episodes', group: 'Club & Content' },
  { key: 'wellbeing', label: 'New wellbeing resources', group: 'Club & Content' },
  { key: 'announcement', label: 'Feature announcements & polls', group: 'Platform' },
] as const

export type EmailCategoryKey = (typeof EMAIL_CATEGORIES)[number]['key']

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
