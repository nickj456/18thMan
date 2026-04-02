import type { SupabaseClient } from '@supabase/supabase-js'

type NotificationType = 'drill_rating' | 'club_invite' | 'group_invite' | 'session_scheduled'

interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  data: Record<string, unknown>
}

export async function createNotification(
  supabase: SupabaseClient,
  { userId, type, data }: CreateNotificationOptions
) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, data })

  if (error) {
    console.error('[createNotification]', error)
  }
}
