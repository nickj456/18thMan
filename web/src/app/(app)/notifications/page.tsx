import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Bell, Star, Building2, Users2, CalendarDays, PenTool, UserPlus } from 'lucide-react'
import { markAllNotificationsRead } from './actions'
import { formatDistanceToNow } from 'date-fns'

interface DrillRatingData {
  drill_id: string
  drill_title: string
  rater_display_name: string
  rating: number
  comment?: string | null
}

interface ClubInviteData {
  club_id: string
  club_name: string
  invited_by_display_name: string
}

interface GroupInviteData {
  group_id: string
  group_name: string
  invited_by_display_name: string
}

interface SessionScheduledData {
  session_id: string
  session_title: string
  group_id: string
  scheduled_at: string
  scheduled_by_display_name: string
}

interface NewDrillData {
  drill_id: string
  drill_title: string
  author_display_name: string
  author_username: string
}

interface FollowedYouData {
  follower_id: string
  follower_display_name: string
  follower_username: string
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = notifications ?? []
  const hasUnread = items.some(n => !n.read)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 0 ? 'No notifications yet.' : `${items.length} notification${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell className="size-10 text-zinc-700" />
          <p className="text-sm text-muted-foreground">
            You&apos;ll be notified here when coaches follow you, rate your drills, or coaches you follow post new content.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const isClubInvite = n.type === 'club_invite'
            const unreadDot = !n.read && (
              <div className="flex-shrink-0 mt-2">
                <div className="w-2 h-2 rounded-full bg-[#e8560a]" />
              </div>
            )
            const itemClass = `flex gap-4 p-4 rounded-xl border transition-colors hover:border-zinc-600 ${
              n.read ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-700 bg-zinc-900'
            }`

            if (isClubInvite) {
              const data = n.data as ClubInviteData
              return (
                <Link key={n.id} href="/clubs" className={itemClass}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mt-0.5">
                    <Building2 className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{data.invited_by_display_name}</span>
                      {' invited you to join '}
                      <span className="font-semibold text-white">{data.club_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {unreadDot}
                </Link>
              )
            }

            if (n.type === 'group_invite') {
              const data = n.data as GroupInviteData
              return (
                <Link key={n.id} href="/groups" className={itemClass}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mt-0.5">
                    <Users2 className="size-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{data.invited_by_display_name}</span>
                      {' invited you to join the group '}
                      <span className="font-semibold text-white">{data.group_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {unreadDot}
                </Link>
              )
            }

            if (n.type === 'session_scheduled') {
              const data = n.data as SessionScheduledData
              const scheduled = new Date(data.scheduled_at).toLocaleString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
              return (
                <Link key={n.id} href={`/sessions/${data.session_id}`} className={itemClass}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mt-0.5">
                    <CalendarDays className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{data.scheduled_by_display_name}</span>
                      {' scheduled '}
                      <span className="font-semibold text-white">{data.session_title}</span>
                      {' for '}
                      <span className="text-amber-400">{scheduled}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {unreadDot}
                </Link>
              )
            }

            if (n.type === 'new_drill') {
              const data = n.data as NewDrillData
              return (
                <Link key={n.id} href={`/drills/${data.drill_id}`} className={itemClass}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#e8560a]/15 border border-[#e8560a]/20 flex items-center justify-center mt-0.5">
                    <PenTool className="size-4 text-[#e8560a]" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{data.author_display_name}</span>
                      {' posted a new drill: '}
                      <span className="font-semibold text-white">{data.drill_title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {unreadDot}
                </Link>
              )
            }

            if (n.type === 'followed_you') {
              const data = n.data as FollowedYouData
              return (
                <Link key={n.id} href={`/profile/${data.follower_username}`} className={itemClass}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mt-0.5">
                    <UserPlus className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{data.follower_display_name}</span>
                      {' started following you'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {unreadDot}
                </Link>
              )
            }

            const data = n.data as DrillRatingData
            return (
              <Link
                key={n.id}
                href={`/drills/${data.drill_id}#ratings`}
                className={itemClass}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mt-0.5">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{data.rater_display_name}</span>
                    {' rated your drill '}
                    <span className="font-semibold text-white">{data.drill_title}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`size-3 ${star <= data.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{data.rating}/5</span>
                  </div>
                  {data.comment && (
                    <p className="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
                      &ldquo;{data.comment}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {unreadDot}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
