import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { createWeeklyFocus } from '../actions'
import { FOCUS_TOPICS } from '@/lib/supabase/types'
import type { Drill } from '@/lib/supabase/types'

export const metadata = { title: 'Set Weekly Focus — 18th Man' }

function getMonday(d: Date): string {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return copy.toISOString().split('T')[0]
}

const CATEGORY_COLOUR: Record<string, string> = {
  Attacking: 'border-amber-500/30 text-amber-400',
  Defensive: 'border-red-500/30 text-red-400',
  'Ball Handling': 'border-sky-500/30 text-sky-400',
  'Set Piece & Kicking': 'border-violet-500/30 text-violet-400',
  'Fitness & Game Sense': 'border-emerald-500/30 text-emerald-400',
}

export default async function NewWeeklyFocusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/weekly-focus')
  if (!profile.club_id) redirect('/clubs')

  // Get existing focus for this week to pre-fill
  const thisMonday = getMonday(new Date())
  const [focusRes, drillsRes] = await Promise.all([
    supabase
      .from('weekly_focuses')
      .select('*')
      .eq('club_id', profile.club_id)
      .eq('week_start', thisMonday)
      .maybeSingle(),
    supabase
      .from('drills')
      .select('id, title, difficulty, preview_image_url, canvas_preview_url')
      .order('title'),
  ])

  const existing = focusRes.data
  const drills = (drillsRes.data ?? []) as Pick<Drill, 'id' | 'title' | 'difficulty' | 'preview_image_url' | 'canvas_preview_url'>[]

  // Group topics by category
  const categories = [...new Set(FOCUS_TOPICS.map(t => t.category))]

  const weekLabel = new Date(thisMonday).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href="/weekly-focus" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Weekly Focus
      </Link>

      <div>
        <h1 className="app-heading text-2xl">Set Weekly Focus</h1>
        <p className="text-sm text-zinc-500 mt-1">Week of {weekLabel}</p>
      </div>

      <form action={async (fd: FormData) => { await createWeeklyFocus(fd) }} className="space-y-8">
        {/* Topic picker */}
        <section className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">
            Focus Topic
          </label>
          {categories.map(cat => (
            <div key={cat} className="space-y-2">
              <p className={`text-[11px] font-semibold uppercase tracking-widest ${CATEGORY_COLOUR[cat]?.split(' ')[1] ?? 'text-zinc-500'}`}>
                {cat}
              </p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_TOPICS.filter(t => t.category === cat).map(t => (
                  <label key={t.label} className="cursor-pointer">
                    <input
                      type="radio"
                      name="topic"
                      value={t.label}
                      defaultChecked={existing?.topic === t.label}
                      required
                      className="sr-only peer"
                    />
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs border transition-all
                      peer-checked:bg-indigo-600 peer-checked:border-indigo-500 peer-checked:text-white
                      bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 ${CATEGORY_COLOUR[cat] ?? ''}`}>
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Description */}
        <section className="space-y-2">
          <label htmlFor="description" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            defaultValue={existing?.description ?? ''}
            placeholder="Describe what players will be working on this week and why it matters..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </section>

        {/* Drill selection */}
        <section className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">
            Suggested Drills <span className="text-zinc-600 normal-case font-normal">(pick up to 3)</span>
          </label>
          {drills.length === 0 ? (
            <p className="text-sm text-zinc-600">No drills in the library yet. <Link href="/drills/new" className="text-indigo-400 hover:text-indigo-300">Add one.</Link></p>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden max-h-64 overflow-y-auto">
              <ul className="divide-y divide-zinc-800 bg-zinc-900">
                {drills.map(drill => (
                  <li key={drill.id}>
                    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <input
                        type="checkbox"
                        name="drill_ids"
                        value={drill.id}
                        defaultChecked={existing?.drill_ids?.includes(drill.id)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-zinc-300 flex-1 truncate">{drill.title}</span>
                      {drill.difficulty && (
                        <span className="text-[10px] text-zinc-600 capitalize shrink-0">{drill.difficulty}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Next week hint */}
        <section className="space-y-2">
          <label htmlFor="next_topic" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">
            Next Week Preview <span className="text-zinc-600 normal-case font-normal">(optional)</span>
          </label>
          <input
            id="next_topic"
            name="next_topic"
            type="text"
            defaultValue={existing?.next_topic ?? ''}
            placeholder="e.g. Tackle Technique"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
          />
          <p className="text-xs text-zinc-600">Shown as a teaser to keep players thinking ahead.</p>
        </section>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          {existing ? 'Update this week\'s focus' : 'Publish focus'}
        </button>
      </form>
    </div>
  )
}
