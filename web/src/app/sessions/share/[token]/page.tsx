import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Clock, BookOpen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { SessionDrillItem, Drill, AiGuide } from '@/lib/supabase/types'
import type { SessionSummary } from '@/app/(app)/sessions/actions'

// Unauthenticated anon client — safe for public pages
function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default async function SharedSessionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAnonClient()

  const { data: session } = await supabase
    .from('session_plans')
    .select('*')
    .eq('share_token', token)
    .single()

  if (!session) notFound()

  const sessionPlan = session as typeof session & { ai_summary?: SessionSummary; share_token?: string }
  const drillItems = (sessionPlan.drills_order ?? []) as SessionDrillItem[]
  const drillIds = drillItems.map(d => d.drill_id)
  const drillsMap = new Map<string, Drill>()

  if (drillIds.length > 0) {
    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, description, canvas_preview_url, difficulty, age_group, player_count, ai_guide')
      .in('id', drillIds)
    for (const drill of drills ?? []) drillsMap.set(drill.id, drill as Drill)
  }

  const { data: coach } = await supabase
    .from('profiles')
    .select('display_name, club')
    .eq('id', session.coach_id)
    .single()

  const hours = session.total_duration ? Math.floor(session.total_duration / 60) : 0
  const mins = session.total_duration ? session.total_duration % 60 : 0
  const durationLabel = session.total_duration
    ? hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
    : null

  const summary = sessionPlan.ai_summary ?? null

  return (
    <div style={{ background: '#07080d', minHeight: '100vh', color: '#e8e4dc', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7,8,13,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Image src="/logo.png" alt="18th Man" width={32} height={32} />
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.08em', color: '#e8e4dc', textTransform: 'uppercase' }}>
              18TH MAN
            </span>
          </Link>
          <Link
            href="/signup"
            style={{
              background: '#e8560a',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '8px 18px',
              borderRadius: 4,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Get the app
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            {session.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: '#7a7875' }}>
            {coach?.display_name && (
              <span>by {coach.display_name}{coach.club ? ` · ${coach.club}` : ''}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={13} />
              {drillIds.length} drill{drillIds.length !== 1 ? 's' : ''}
            </span>
            {durationLabel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} />
                {durationLabel}
              </span>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {summary && (
          <>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }} />
            <div style={{
              background: '#0d0f16',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: '3px solid #e8560a',
              borderRadius: 10,
              padding: '1.25rem',
              marginBottom: '2rem',
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e8560a', marginBottom: '0.75rem' }}>
                Session Overview
              </p>
              <p style={{ color: '#a8a4a0', lineHeight: 1.6, marginBottom: '1rem' }}>{summary.overview}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {summary.focus_areas?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7875', marginBottom: 8 }}>Focus Areas</p>
                    {summary.focus_areas.map((a: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8560a', marginTop: 6, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', color: '#a8a4a0', lineHeight: 1.4 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
                {summary.equipment?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7875', marginBottom: 8 }}>Equipment</p>
                    {summary.equipment.map((e: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8560a', marginTop: 6, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', color: '#a8a4a0', lineHeight: 1.4 }}>{e}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {summary.warm_up_suggestion && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7875', marginBottom: 6 }}>Warm-up</p>
                  <p style={{ fontSize: '0.875rem', color: '#a8a4a0', lineHeight: 1.5 }}>{summary.warm_up_suggestion}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Drill list */}
        {drillIds.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a7875', marginBottom: '1rem' }}>
              Drills ({drillIds.length})
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drillItems.map((item, index) => {
                const drill = drillsMap.get(item.drill_id)
                if (!drill) return null
                const aiGuide = drill.ai_guide as AiGuide | null
                const keyCues = aiGuide?.key_cues?.slice(0, 3) ?? []

                return (
                  <li key={`${item.drill_id}-${index}`} style={{
                    background: '#0d0f16',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '1.25rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#e8560a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                        }}>{index + 1}</div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{drill.title}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {drill.difficulty && (
                              <span style={{ fontSize: '0.75rem', color: '#7a7875', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 8px' }}>
                                {drill.difficulty}
                              </span>
                            )}
                            {drill.player_count && (
                              <span style={{ fontSize: '0.75rem', color: '#7a7875', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 8px' }}>
                                {drill.player_count} players
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#e8560a', fontWeight: 700, flexShrink: 0, background: 'rgba(232,86,10,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                        {item.duration_minutes}min
                      </span>
                    </div>

                    {/* Canvas drawing */}
                    {drill.canvas_preview_url && (
                      <img
                        src={drill.canvas_preview_url}
                        alt={drill.title}
                        style={{ width: '100%', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}
                      />
                    )}

                    {drill.description && (
                      <p style={{ fontSize: '0.875rem', color: '#7a7875', lineHeight: 1.6, marginBottom: keyCues.length ? 10 : 0 }}>
                        {drill.description}
                      </p>
                    )}

                    {item.notes && (
                      <p style={{ fontSize: '0.875rem', color: '#a8a4a0', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 10, marginBottom: keyCues.length ? 10 : 0 }}>
                        {item.notes}
                      </p>
                    )}

                    {keyCues.length > 0 && (
                      <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7875', marginBottom: 8 }}>
                          Key Cues
                        </p>
                        {keyCues.map((cue, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e8560a', marginTop: 6, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#a8a4a0' }}>{cue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </>
        )}

        {/* Footer CTA */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#0d0f16',
          border: '1px solid rgba(232,86,10,0.2)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <p style={{ color: '#7a7875', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Plan sessions, design drills, and connect with coaches on 18th Man.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#e8560a',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 28px',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            Join for free
          </Link>
        </div>

      </div>
    </div>
  )
}
