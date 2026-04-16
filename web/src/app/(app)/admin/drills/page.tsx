import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'
import { approveDrill, rejectDrill } from './actions'

export const metadata = { title: 'Drill Approval — Admin' }

export default async function AdminDrillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: pending } = await supabase
    .from('drills')
    .select(`
      id, title, description, difficulty, age_group, player_count,
      preview_image_url, youtube_url, is_public, created_at, approval_status,
      category:drill_categories ( name ),
      author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url )
    `)
    .eq('approval_status', 'pending')
    .eq('is_public', true)
    .order('created_at', { ascending: true })

  const drills = pending ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Drill Approval</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {drills.length === 0
              ? 'All caught up — no drills pending review'
              : `${drills.length} drill${drills.length !== 1 ? 's' : ''} awaiting review`}
          </p>
        </div>
      </div>

      {drills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle size={40} className="text-emerald-500 mb-4 opacity-60" />
          <p className="font-medium">Queue is empty</p>
          <p className="text-sm text-muted-foreground mt-1">New public drills will appear here for review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drills.map(drill => {
            const author = drill.author as unknown as { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null
            const category = drill.category as unknown as { name: string } | null

            return (
              <div
                key={drill.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex gap-4 items-start"
              >
                {/* Thumbnail */}
                <div className="w-24 h-16 rounded-lg bg-zinc-800 overflow-hidden shrink-0 relative">
                  {drill.preview_image_url ? (
                    <Image src={drill.preview_image_url} alt={drill.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-30">🏉</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Link
                      href={`/drills/${drill.id}`}
                      className="font-semibold leading-snug hover:text-white transition-colors"
                      target="_blank"
                    >
                      {drill.title}
                    </Link>
                    {category?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {category.name}
                      </span>
                    )}
                    {drill.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                        {drill.difficulty}
                      </span>
                    )}
                  </div>
                  {drill.description && (
                    <p className="text-sm text-zinc-500 line-clamp-2">{drill.description}</p>
                  )}
                  <p className="text-xs text-zinc-600">
                    By{' '}
                    <Link href={`/profile/${author?.username}`} className="hover:text-zinc-400 transition-colors" target="_blank">
                      {author?.display_name ?? author?.username ?? 'Unknown'}
                    </Link>
                    {' · '}
                    {new Date(drill.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <form action={async () => { await approveDrill(drill.id) }}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle size={13} />
                      Approve
                    </button>
                  </form>
                  <form action={async () => { await rejectDrill(drill.id) }}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex gap-3 items-start">
        <Clock size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Pending drills are visible to their author in their drill library but do not appear
          in the public community library until approved. Rejected drills remain accessible only
          to the author.
        </p>
      </div>
    </div>
  )
}
