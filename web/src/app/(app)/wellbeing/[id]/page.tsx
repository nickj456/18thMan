import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { WellbeingResource } from '@/lib/supabase/types'

// ── Content types ──────────────────────────────────────────────────────────

interface AiGeneratedContent {
  ai_generated: true
  source_url: string
  summary: string
  key_points: string[]
  guidance: { title: string; detail: string }[]
}

interface NutritionPlanContent {
  athlete?: {
    age?: number
    height?: string
    weight?: string
    goal?: string
  }
  daily_calories?: number
  meals?: {
    name: string
    description?: string
    time?: string
  }[]
  habits?: {
    title: string
    detail?: string
  }[]
}

interface NutritionGuideContent {
  sections?: {
    title: string
    items?: string[]
  }[]
  example_day?: {
    time?: string
    description: string
  }[]
}

interface MentalHealthContent {
  stats?: { value: string; label: string }[]
  summary?: string
  channels?: { title: string; description?: string }[]
  facilitators_note?: string
  testimonials?: { quote: string; author?: string }[]
  url?: string
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('wellbeing_resources')
    .select('title')
    .eq('id', id)
    .single()

  return { title: data?.title ?? 'Wellbeing Resource' }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function WellbeingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: resource } = await supabase
    .from('wellbeing_resources')
    .select('*')
    .eq('id', id)
    .single()

  if (!resource) notFound()

  const content = resource.content as Record<string, unknown>
  const isAiGenerated = content?.ai_generated === true

  return (
    <div className="max-w-3xl space-y-8">
      {/* Back */}
      <Link
        href="/wellbeing"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Wellbeing
      </Link>

      {/* Type label */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {resource.type.replace(/_/g, ' ')}
      </p>

      {isAiGenerated && <AiGeneratedDetail resource={resource} />}
      {!isAiGenerated && resource.type === 'nutrition_plan' && <NutritionPlanDetail resource={resource} />}
      {!isAiGenerated && resource.type === 'nutrition_guide' && <NutritionGuideDetail resource={resource} />}
      {!isAiGenerated && resource.type === 'mental_health' && <MentalHealthDetail resource={resource} />}
    </div>
  )
}

// ── AI Generated ──────────────────────────────────────────────────────────

function AiGeneratedDetail({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as unknown as AiGeneratedContent

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">{resource.title}</h1>
        {resource.subtitle && (
          <p className="text-muted-foreground">{resource.subtitle}</p>
        )}
      </div>

      {/* Summary */}
      {content.summary && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.summary}</p>
        </div>
      )}

      {/* Key points */}
      {Array.isArray(content.key_points) && content.key_points.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Key Points</h2>
          <ul className="space-y-2">
            {content.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Guidance */}
      {Array.isArray(content.guidance) && content.guidance.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Guidance for Coaches &amp; Athletes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.guidance.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Source link */}
      {content.source_url && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Original source</p>
          <Button render={<a href={content.source_url} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">
            Visit Source ↗
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Nutrition Plan ─────────────────────────────────────────────────────────

function NutritionPlanDetail({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as NutritionPlanContent

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">{resource.title}</h1>
        {resource.subtitle && (
          <p className="text-muted-foreground">{resource.subtitle}</p>
        )}
      </div>

      {/* Athlete profile + calories */}
      {(content.athlete || content.daily_calories) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Athlete Profile</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {content.athlete?.age && (
              <Stat label="Age" value={`${content.athlete.age} yrs`} />
            )}
            {content.athlete?.height && (
              <Stat label="Height" value={content.athlete.height} />
            )}
            {content.athlete?.weight && (
              <Stat label="Weight" value={content.athlete.weight} />
            )}
            {content.athlete?.goal && (
              <Stat label="Goal" value={content.athlete.goal} />
            )}
          </div>
          {content.daily_calories && (
            <div className="pt-3 border-t border-border">
              <Stat label="Daily Calorie Target" value={`${content.daily_calories.toLocaleString()} kcal`} large />
            </div>
          )}
        </div>
      )}

      {/* Meal schedule */}
      {Array.isArray(content.meals) && content.meals.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Meal Schedule</h2>
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {content.meals.map((meal, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-card">
                {meal.time && (
                  <span className="text-xs text-muted-foreground w-16 shrink-0 mt-0.5 font-mono">{meal.time}</span>
                )}
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-medium text-sm">{meal.name}</p>
                  {meal.description && (
                    <p className="text-sm text-muted-foreground">{meal.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key habits */}
      {Array.isArray(content.habits) && content.habits.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Key Habits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.habits.map((habit, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1">
                <p className="font-medium text-sm">{habit.title}</p>
                {habit.detail && (
                  <p className="text-sm text-muted-foreground">{habit.detail}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Nutrition Guide ────────────────────────────────────────────────────────

function NutritionGuideDetail({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as NutritionGuideContent

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">{resource.title}</h1>
        {resource.subtitle && (
          <p className="text-muted-foreground">{resource.subtitle}</p>
        )}
      </div>

      {/* Sections */}
      {Array.isArray(content.sections) && content.sections.length > 0 && (
        <div className="space-y-4">
          {content.sections.map((section, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h2 className="font-semibold text-sm">{section.title}</h2>
              </div>
              {Array.isArray(section.items) && section.items.length > 0 && (
                <ul className="divide-y divide-border">
                  {section.items.map((item, j) => (
                    <li key={j} className="px-5 py-3 text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Example day */}
      {Array.isArray(content.example_day) && content.example_day.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Example Day</h2>
          <div className="relative space-y-0 pl-6 border-l-2 border-border ml-2">
            {content.example_day.map((entry, i) => (
              <div key={i} className="relative pb-4 last:pb-0">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="space-y-0.5">
                  {entry.time && (
                    <p className="text-xs font-mono text-muted-foreground">{entry.time}</p>
                  )}
                  <p className="text-sm">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Mental Health ──────────────────────────────────────────────────────────

function MentalHealthDetail({ resource }: { resource: WellbeingResource }) {
  const content = resource.content as MentalHealthContent

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">{resource.title}</h1>
        {resource.subtitle && (
          <p className="text-muted-foreground">{resource.subtitle}</p>
        )}
      </div>

      {/* Programme stats */}
      {Array.isArray(content.stats) && content.stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {content.stats.map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 text-center space-y-1">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {content.summary && (
        <p className="text-muted-foreground leading-relaxed">{content.summary}</p>
      )}

      {/* Delivery channels */}
      {Array.isArray(content.channels) && content.channels.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Delivery Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.channels.map((channel, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-1">
                <p className="font-medium">{channel.title}</p>
                {channel.description && (
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Facilitator's note */}
      {content.facilitators_note && (
        <section className="rounded-xl border border-border bg-muted/30 p-5 space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Facilitator's Note</h2>
          <p className="text-sm leading-relaxed">{content.facilitators_note}</p>
        </section>
      )}

      {/* Testimonials */}
      {Array.isArray(content.testimonials) && content.testimonials.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Testimonials</h2>
          <div className="space-y-3">
            {content.testimonials.map((t, i) => (
              <blockquote
                key={i}
                className="rounded-xl border border-border bg-card p-5 space-y-2"
              >
                <p className="text-sm leading-relaxed before:content-['“'] after:content-['”']">
                  {t.quote}
                </p>
                {t.author && (
                  <footer className="text-xs text-muted-foreground">— {t.author}</footer>
                )}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* External link */}
      {content.url && (
        <div>
          <Button
            render={<a href={content.url} target="_blank" rel="noopener noreferrer" />}
            variant="default"
          >
            Visit Programme Website ↗
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Stat({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={large ? 'text-xl font-bold' : 'text-sm font-semibold'}>{value}</p>
    </div>
  )
}
