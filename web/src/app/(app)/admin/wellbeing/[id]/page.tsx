import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Save } from 'lucide-react'
import { updateWellbeingResource } from '../actions'
import type { WellbeingResourceType } from '@/lib/supabase/types'

export const metadata = { title: 'Edit Wellbeing Resource — Admin' }

const TYPE_LABELS: Record<WellbeingResourceType, string> = {
  nutrition_plan: 'Nutrition Plan',
  nutrition_guide: 'Nutrition Guide',
  mental_health: 'Mental Health',
}

const CONTENT_HINTS: Record<WellbeingResourceType, string> = {
  nutrition_plan: `{
  "athlete_profile": { "age": "", "height": "", "weight": "", "goal": "" },
  "daily_calories": "",
  "meals": [
    { "name": "Breakfast", "description": "" }
  ],
  "habits": [
    { "title": "", "detail": "" }
  ]
}`,
  nutrition_guide: `{
  "sections": [
    {
      "title": "Section Title",
      "items": [
        { "name": "", "detail": "" }
      ]
    }
  ],
  "example_day": [
    { "meal": "Breakfast", "food": "" }
  ]
}`,
  mental_health: `{
  "programme": "",
  "partner": "",
  "url": "",
  "stats": [
    { "value": "", "label": "" }
  ],
  "summary": "",
  "delivery": [
    { "channel": "", "detail": "" }
  ],
  "facilitators": "",
  "testimonials": [
    { "quote": "", "attribution": "" }
  ],
  "contact": ""
}`,
}

export default async function AdminWellbeingEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: resource } = await supabase
    .from('wellbeing_resources')
    .select('*')
    .eq('id', id)
    .single()

  if (!resource) notFound()

  const type = resource.type as WellbeingResourceType
  const contentJson = JSON.stringify(resource.content, null, 2)
  const updateWithId = updateWellbeingResource.bind(null, id)

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/admin/wellbeing"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Wellbeing Resources
      </Link>

      <div>
        <h1 className="app-heading text-2xl">Edit Resource</h1>
        <p className="text-sm text-zinc-500 mt-1">
          <span className="capitalize">{TYPE_LABELS[type]}</span>
          {' · '}
          <span className="font-mono text-xs text-zinc-600">{id}</span>
        </p>
      </div>

      <form action={updateWithId} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Title
          </label>
          <input
            name="title"
            defaultValue={resource.title}
            required
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Subtitle <span className="text-zinc-600 normal-case">(optional)</span>
          </label>
          <input
            name="subtitle"
            defaultValue={resource.subtitle ?? ''}
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Content JSON */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Content (JSON)
            </label>
            <span className="text-xs text-zinc-600">Must be valid JSON</span>
          </div>

          {/* Schema hint */}
          <details className="group">
            <summary className="text-xs text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors mb-2 list-none flex items-center gap-1">
              <span className="group-open:hidden">▶ Show {TYPE_LABELS[type]} schema hint</span>
              <span className="hidden group-open:inline">▼ Hide schema hint</span>
            </summary>
            <pre className="text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto mb-2 font-mono leading-relaxed">
              {CONTENT_HINTS[type]}
            </pre>
          </details>

          <textarea
            name="content"
            defaultValue={contentJson}
            rows={28}
            spellCheck={false}
            className="w-full text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
          >
            <Save size={14} />
            Save Changes
          </button>
          <Link
            href="/admin/wellbeing"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
