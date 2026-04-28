import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendNotificationEmailHtml, sendBurstEmailHtml } from '@/lib/email'

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? 'dev-fallback-secret'

// ── Unsubscribe tokens ─────────────────────────────────────────────────────────

export function generateUnsubscribeToken(userId: string, category: string): string {
  const ts = Date.now().toString()
  const payload = [userId, category, ts].join(':')
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): { userId: string; category: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 4) return null
    const [userId, category, ts, sig] = parts
    if (Date.now() - parseInt(ts) > 90 * 24 * 60 * 60 * 1000) return null
    const payload = [userId, category, ts].join(':')
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return null
    return { userId, category }
  } catch {
    return null
  }
}

// ── Category mapping ───────────────────────────────────────────────────────────

export const NOTIFICATION_CATEGORY: Record<string, string> = {
  new_dm: 'dm',
  drill_rating: 'drill_rating',
  club_invite: 'club_invite',
  group_invite: 'club_invite',
  followed_you: 'new_follower',
  session_scheduled: 'session_scheduled',
  new_drill: 'new_public_drill',
}

export const EMAIL_CATEGORY_LABELS: Record<string, string> = {
  dm: 'direct message',
  drill_rating: 'drill rating',
  club_invite: 'club & group invite',
  new_follower: 'follower',
  session_scheduled: 'session',
  weekly_focus: 'weekly focus',
  new_public_drill: 'new drill',
  podcast: 'podcast',
  wellbeing: 'wellbeing resource',
  announcement: 'platform announcement',
}

// ── Email content per notification type ───────────────────────────────────────

export function getNotificationEmailContent(
  type: string,
  data: Record<string, unknown>,
  recipientName: string,
): { subject: string; bodyText: string; ctaLabel: string; ctaPath: string } {
  const name = recipientName || 'Coach'
  switch (type) {
    case 'new_dm':
      return {
        subject: `New message from ${data.sender_display_name ?? 'someone'} — 18th Man`,
        bodyText: `Hi ${name}, you have a new direct message from <strong style="color:#ffffff;">${data.sender_display_name ?? 'someone'}</strong> on 18th Man.`,
        ctaLabel: 'Read your message',
        ctaPath: data.conversation_id ? `/chat/dm/${data.conversation_id}` : '/chat',
      }
    case 'drill_rating':
      return {
        subject: `Your drill received a new rating — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.rater_display_name ?? 'A coach'}</strong> left a rating on your drill <strong style="color:#ffffff;">${data.drill_title ?? 'your drill'}</strong>.`,
        ctaLabel: 'View your drill',
        ctaPath: data.drill_id ? `/drills/${data.drill_id}` : '/drills',
      }
    case 'club_invite':
      return {
        subject: `You've been invited to join ${data.club_name ?? 'a club'} — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.invited_by_display_name ?? 'Someone'}</strong> has invited you to join <strong style="color:#ffffff;">${data.club_name ?? 'a club'}</strong> on 18th Man.`,
        ctaLabel: 'View invitation',
        ctaPath: '/clubs',
      }
    case 'group_invite':
      return {
        subject: `You've been invited to join a coaching group — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.invited_by_display_name ?? 'Someone'}</strong> has invited you to join the coaching group <strong style="color:#ffffff;">${data.group_name ?? 'a group'}</strong>.`,
        ctaLabel: 'View invitation',
        ctaPath: '/groups',
      }
    case 'followed_you':
      return {
        subject: `${data.follower_display_name ?? 'Someone'} is now following you — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.follower_display_name ?? 'A coach'}</strong> is now following your profile on 18th Man.`,
        ctaLabel: 'View their profile',
        ctaPath: data.follower_username ? `/profile/${data.follower_username}` : '/dashboard',
      }
    case 'session_scheduled':
      return {
        subject: `Session scheduled: ${data.session_title ?? 'new session'} — 18th Man`,
        bodyText: `Hi ${name}, a session <strong style="color:#ffffff;">${data.session_title ?? 'has been scheduled'}</strong> has been added to your plan.`,
        ctaLabel: 'View session',
        ctaPath: data.session_id ? `/sessions/${data.session_id}` : '/sessions',
      }
    default:
      return {
        subject: `New notification — 18th Man`,
        bodyText: `Hi ${name}, you have a new notification on 18th Man.`,
        ctaLabel: 'Open 18th Man',
        ctaPath: '/dashboard',
      }
  }
}

// ── Preference check ───────────────────────────────────────────────────────────

export async function isUserOptedOut(userId: string, category: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('email_preferences')
    .select('enabled')
    .eq('user_id', userId)
    .eq('category', category)
    .single()
  // Missing row = opted in; row with enabled=false = opted out
  return data?.enabled === false
}

// ── Rate limit check ───────────────────────────────────────────────────────────

export async function getRecentEmailCount(
  userId: string,
  windowMinutes: number,
): Promise<number> {
  const service = createServiceClient()
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count } = await service
    .from('notification_email_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', since)
  return count ?? 0
}

// ── Main dispatch function ─────────────────────────────────────────────────────

export async function dispatchNotificationEmail(params: {
  userId: string
  notificationId: string
  type: string
  data: Record<string, unknown>
}): Promise<void> {
  const { userId, notificationId, type, data } = params
  const category = NOTIFICATION_CATEGORY[type]
  if (!category) return // Unknown type — skip

  // Check opt-out
  const optedOut = await isUserOptedOut(userId, category)
  if (optedOut) return

  const service = createServiceClient()

  // Get email settings
  const { data: settings } = await service
    .from('email_settings')
    .select('burst_threshold, burst_window_minutes')
    .single()
  const threshold = settings?.burst_threshold ?? 3
  const windowMins = settings?.burst_window_minutes ?? 5

  // Get user email + name
  const { data: authUser } = await service.auth.admin.getUserById(userId)
  const email = authUser?.user?.email
  if (!email) return

  const { data: profile } = await service
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  const displayName = profile?.display_name ?? ''

  // Check rate limit
  const recentCount = await getRecentEmailCount(userId, windowMins)

  if (recentCount >= threshold) {
    // Send burst summary instead of individual email
    const result = await sendBurstEmailHtml(email, displayName, recentCount + 1)
    if (result.success) {
      await service.from('notification_email_log').insert({
        user_id: userId,
        notification_ids: [notificationId],
        is_burst: true,
      })
    }
  } else {
    // Send individual notification email
    const content = getNotificationEmailContent(type, data, displayName)
    const unsubToken = generateUnsubscribeToken(userId, category)
    const result = await sendNotificationEmailHtml(email, {
      ...content,
      userId,
      category,
      unsubToken,
    })
    if (result.success) {
      await service.from('notification_email_log').insert({
        user_id: userId,
        notification_ids: [notificationId],
        is_burst: false,
      })
      await service.from('email_sends').insert({
        user_id: userId,
        notification_id: notificationId,
        category,
        resend_message_id: result.messageId ?? null,
      })
    }
  }
}

