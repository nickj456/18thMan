import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Bell, Star } from 'lucide-react'
import { markAllNotificationsRead } from './actions'
import { formatDistanceToNow } from 'date-fns'

interface NotificationData {
  drill_id: string
  drill_title: string
  rater_display_name: string
  rating: number
  comment?: string | null
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
            You&apos;ll be notified here when coaches rate your drills.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const data = n.data as NotificationData
            return (
              <Link
                key={n.id}
                href={`/drills/${data.drill_id}#ratings`}
                className={`flex gap-4 p-4 rounded-xl border transition-colors hover:border-zinc-600 ${
                  n.read
                    ? 'border-zinc-800 bg-zinc-900/40'
                    : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mt-0.5">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{data.rater_display_name}</span>
                    {' rated your drill '}
                    <span className="font-semibold text-white">{data.drill_title}</span>
                  </p>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`size-3 ${star <= data.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{data.rating}/5</span>
                  </div>

                  {/* Comment */}
                  {data.comment && (
                    <p className="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
                      &ldquo;{data.comment}&rdquo;
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-2 h-2 rounded-full bg-[#e8560a]" />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
