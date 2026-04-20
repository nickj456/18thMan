import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Target, ChevronRight, BookOpen, CalendarDays, Plus, ArrowRight } from 'lucide-react'
import { FocusComments } from './FocusComments'
import { SharePanel } from './SharePanel'
import type { WeeklyFocus, Drill } from '@/lib/supabase/types'

export const metadata = { title: 'Weekly Focus — 18th Man' }

function getMonday(d: Date): string {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return copy.toISOString().split('T')[0]
}

const CATEGORY_COLOUR: Record<string, string> = {
  Attacking: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Defensive: 'text-red-400 bg-red-500/10 border-red-500/20',
  'Ball Handling': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'Set Piece & Kicking': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Fitness & Game Sense': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

function topicCategory(topic: string): string {
  const map: Record<string, string> = {
    'Offloading': 'Attacking', 'Support Play': 'Attacking', 'Line Breaks & Edge Play': 'Attacking', 'Dummy Half Play': 'Attacking',
    'Tackle Technique': 'Defensive', 'Line Speed & Drift Defence': 'Defensive', 'Marker Defence': 'Defensive', 'Goal Line Defence': 'Defensive',
    'Pass Accuracy': 'Ball Handling', 'Handling Under Pressure': 'Ball Handling', 'Catching High Balls': 'Ball Handling',
    'Kick-Off Receipts': 'Set Piece & Kicking', 'Grubber Kicks': 'Set Piece & Kicking', 'Bomb Kicks': 'Set Piece & Kicking', 'Scrum Technique': 'Set Piece & Kicking',
    'Agility & Conditioning': 'Fitness & Game Sense', 'Decision Making': 'Fitness & Game Sense', 'Game Management': 'Fitness & Game Sense',
  }
  return map[topic] ?? 'Attacking'
}

export default async function WeeklyFocusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const isAdmin = profile.role === 'admin'
  const canComment = profile.role === 'coach' || profile.role === 'admin'
  const thisMonday = getMonday(new Date())

  const [focusRes, clubRes] = await Promise.all([
    supabase
      .from('weekly_focuses')
      .select('*')
      .eq('club_id', profile.club_id)
      .eq('week_start', thisMonday)
      .maybeSingle(),
    supabase
      .from('clubs')
      .select('name')
      .eq('id', profile.club_id)
      .single(),
  ])

  const focus = focusRes.data as WeeklyFocus | null
  const clubName = clubRes.data?.name ?? 'Your Club'

  // Fetch drills and comments if focus exists
  let drills: Pick<Drill, 'id' | 'title' | 'description' | 'preview_image_url' | 'canvas_preview_url' | 'difficulty'>[] = []
  let comments: {
    id: string; content: string; created_at: string; user_id: string
    profiles: { display_name: string | null; username: string } | null
  }[] = []

  if (focus) {
    const [drillsRes, commentsRes] = await Promise.all([
      focus.drill_ids.length > 0
        ? supabase
            .from('drills')
            .select('id, title, description, preview_image_url, canvas_preview_url, difficulty')
            .in('id', focus.drill_ids)
        : Promise.resolve({ data: [] }),
      supabase
        .from('weekly_focus_comments')
        .select('id, content, created_at, user_id, profiles!weekly_focus_comments_user_id_fkey(display_name, username)')
        .eq('focus_id', focus.id)
        .order('created_at', { ascending: true }),
    ])
    drills = (drillsRes.data ?? []) as typeof drills
    comments = (commentsRes.data ?? []).map(c => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
    })) as typeof comments
  }

  const category = focus ? topicCategory(focus.topic) : null
  const categoryColour = category ? CATEGORY_COLOUR[category] : null

  const weekLabel = new Date(thisMonday).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-indigo-400" />
            <h1 className="app-heading text-2xl">Weekly Focus</h1>
          </div>
          <p className="text-sm text-zinc-500 flex items-center gap-1.5">
            <CalendarDays size={12} /> Week of {weekLabel}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/weekly-focus/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-colors"
          >
            <Plus size={14} />
            {focus ? 'Edit this week' : 'Set this week\'s focus'}
          </Link>
        )}
      </div>

      {!focus ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-2">
          <Target size={28} className="text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500">No focus set for this week yet.</p>
          {isAdmin && (
            <Link href="/weekly-focus/new" className="text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
              Set it now <ArrowRight size={12} />
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Focus card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="p-6 space-y-4">
              {categoryColour && (
                <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full border ${categoryColour}`}>
                  {category}
                </span>
              )}
              <h2 className="text-2xl font-bold text-white">{focus.topic}</h2>
              <div className="space-y-3">
                {focus.description.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{para.trim()}</p>
                ))}
              </div>
            </div>

            {/* Next week preview */}
            {focus.next_topic && (
              <div className="border-t border-zinc-800 px-6 py-3 bg-zinc-800/40 flex items-center gap-2">
                <ChevronRight size={13} className="text-zinc-600" />
                <span className="text-xs text-zinc-500">Next week:</span>
                <span className="text-xs text-zinc-300 font-medium">{focus.next_topic}</span>
              </div>
            )}
          </div>

          {/* Drills */}
          {drills.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={12} /> Suggested Drills
              </h2>
              <div className="space-y-2">
                {drills.map(drill => (
                  <Link
                    key={drill.id}
                    href={`/drills/${drill.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                  >
                    {(drill.canvas_preview_url ?? drill.preview_image_url) ? (
                      <Image
                        src={drill.canvas_preview_url ?? drill.preview_image_url!}
                        alt={drill.title}
                        width={64}
                        height={44}
                        className="rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-11 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                        <BookOpen size={16} className="text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">{drill.title}</p>
                      {drill.description && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{drill.description}</p>
                      )}
                    </div>
                    <ArrowRight size={13} className="text-zinc-700 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Share panel */}
          <SharePanel
            focusId={focus.id}
            topic={focus.topic}
            description={focus.description}
            nextTopic={focus.next_topic}
            clubName={clubName}
          />

          {/* Comments */}
          <FocusComments
            focusId={focus.id}
            initialComments={comments}
            currentUserId={user.id}
            canComment={canComment}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  )
}
