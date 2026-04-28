import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotificationEmail } from '@/lib/email-notifications'

type NotificationType =
  | 'drill_rating'
  | 'club_invite'
  | 'group_invite'
  | 'session_scheduled'
  | 'new_dm'
  | 'new_drill'
  | 'followed_you'

interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  data: Record<string, unknown>
}

export async function createNotification(
  supabase: SupabaseClient,
  { userId, type, data }: CreateNotificationOptions,
) {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, data })
    .select('id')
    .single()

  if (error) {
    console.error('[createNotification]', error)
    return
  }

  // Non-blocking email side-effect — never throws
  dispatchNotificationEmail({
    userId,
    notificationId: notification.id,
    type,
    data,
  }).catch(err => console.error('[createNotification email]', err))
}
