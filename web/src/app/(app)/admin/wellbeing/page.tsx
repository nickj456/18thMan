import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Heart, Plus, Pencil } from 'lucide-react'
import { WellbeingControls } from './WellbeingControls'
import { createWellbeingResource } from './actions'
import type { WellbeingResourceType } from '@/lib/supabase/types'

export const metadata = { title: 'Wellbeing Resources — Admin' }

const TYPE_LABELS: Record<WellbeingResourceType, string> = {
  nutrition_plan: 'Nutrition Plan',
  nutrition_guide: 'Nutrition Guide',
  mental_health: 'Mental Health',
}

const TYPE_BADGE: Record<WellbeingResourceType, string> = {
  nutrition_plan: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  nutrition_guide: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  mental_health: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

export default async function AdminWellbeingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: resources } = await supabase
    .from('wellbeing_resources')
    .select('id, type, title, subtitle, sort_order')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="app-heading text-2xl flex items-center gap-2">
            <Heart size={20} className="text-emerald-400" /> Wellbeing Resources
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{resources?.length ?? 0} resource{(resources?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Resource list */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        {!resources?.length ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">No resources yet</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {resources.map((res, idx) => (
              <div key={res.id} className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800/40 transition-colors gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zinc-200">{res.title}</p>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGE[res.type as WellbeingResourceType]}`}>
                      {TYPE_LABELS[res.type as WellbeingResourceType]}
                    </span>
                  </div>
                  {res.subtitle && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{res.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/admin/wellbeing/${res.id}`}
                    className="p-1.5 rounded text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </Link>
                  <WellbeingControls
                    id={res.id}
                    isFirst={idx === 0}
                    isLast={idx === (resources.length - 1)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add resource */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus size={14} className="text-emerald-400" /> Add Resource
        </h2>
        <form action={createWellbeingResource} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <select
              name="type"
              required
              defaultValue=""
              className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>Type…</option>
              <option value="nutrition_plan">Nutrition Plan</option>
              <option value="nutrition_guide">Nutrition Guide</option>
              <option value="mental_health">Mental Health</option>
            </select>
            <input
              name="title"
              placeholder="Title…"
              required
              className="flex-1 min-w-40 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="subtitle"
              placeholder="Subtitle (optional)…"
              className="flex-1 min-w-40 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
