import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { WellbeingResource, WellbeingResourceType } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Wellbeing — 18th Man',
}

// ── Content shape helpers ──────────────────────────────────────────────────

interface NutritionPlanContent {
  daily_calories?: number
  meals?: unknown[]
}

interface MentalHealthContent {
  stats?: { value: string; label: string }[]
}

// ── Tab config ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'nutrition', label: 'Nutrition', types: ['nutrition_plan', 'nutrition_guide'] as WellbeingResourceType[] },
  { key: 'mental-health', label: 'Mental Health', types: ['mental_health'] as WellbeingResourceType[] },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default async function WellbeingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = TABS.find(t => t.key === tab) ?? TABS[0]

  const supabase = await createClient()
  const { data: resources } = await supabase
    .from('wellbeing_resources')
    .select('*')
    .order('sort_order', { ascending: true })

  const filtered = (resources ?? []).filter((r: WellbeingResource) =>
    (activeTab.types as string[]).includes(r.type)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="app-heading text-2xl">Wellbeing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nutrition plans and mental health resources for coaches and players.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/wellbeing?tab=${t.key}`}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab.key === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="text-4xl">🌱</div>
          <p className="text-muted-foreground">No {activeTab.label.toLowerCase()} resources yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((resource: WellbeingResource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Resource card ──────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: WellbeingResource }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {resource.type.replace(/_/g, ' ')}
        </p>
        <h2 className="font-semibold leading-snug">{resource.title}</h2>
        {resource.subtitle && (
          <p className="text-sm text-muted-foreground">{resource.subtitle}</p>
        )}
      </div>

      {/* Nutrition snippets */}
      {(resource.type === 'nutrition_plan' || resource.type === 'nutrition_guide') && (
        <NutritionMeta resource={resource} />
      )}

      {/* Mental health stats */}
      {resource.type === 'mental_health' && (
        <MentalHealthStats resource={resource} />
      )}

      <Button render={<Link href={`/wellbeing/${resource.id}`} />} variant="outline" size="sm" className="w-fit mt-auto">
        View
      </Button>
    </div>
  )
}

function NutritionMeta({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as NutritionPlanContent
  const mealCount = Array.isArray(content.meals) ? content.meals.length : null
  const cals = content.daily_calories ?? null

  if (!mealCount && !cals) return null

  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      {mealCount !== null && (
        <span className="rounded-md bg-muted px-2 py-1">{mealCount} meals</span>
      )}
      {cals !== null && (
        <span className="rounded-md bg-muted px-2 py-1">{cals.toLocaleString()} kcal / day</span>
      )}
    </div>
  )
}

function MentalHealthStats({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as MentalHealthContent
  const stats = content.stats
  if (!Array.isArray(stats) || stats.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stats.slice(0, 3).map((s, i) => (
        <div key={i} className="rounded-md bg-muted px-2 py-1 text-xs">
          <span className="font-semibold text-foreground">{s.value}</span>{' '}
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
