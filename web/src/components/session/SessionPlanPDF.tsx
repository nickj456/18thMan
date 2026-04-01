import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SessionPlan, SessionDrillItem, AiGuide } from '@/lib/supabase/types'
import type { SessionSummary } from '@/app/(app)/sessions/actions'

const E = '#e8560a'
const DARK = '#111827'
const MID = '#374151'
const MUTED = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE = '#ffffff'

const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 10,
    color: DARK,
  },

  // ── Fixed footer ────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: E,
    letterSpacing: 1.5,
  },
  footerPage: {
    fontSize: 7,
    color: MUTED,
  },

  // ── Header ──────────────────────────────────────────────────
  accentBar: {
    height: 4,
    backgroundColor: E,
    borderRadius: 2,
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  brandBlock: {
    flexDirection: 'column',
  },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: E,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1,
    marginTop: 2,
  },
  docDate: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },

  sessionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: DARK,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    marginRight: 28,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: DARK,
  },

  // ── Section label ────────────────────────────────────────────
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: E,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 6,
  },

  // ── AI Summary ───────────────────────────────────────────────
  summaryBox: {
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: E,
    borderLeftStyle: 'solid',
  },
  summaryOverview: {
    fontSize: 10,
    color: MID,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  summaryCol: {
    flex: 1,
    marginRight: 12,
  },
  summaryColLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: E,
    marginTop: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 9,
    color: MID,
    flex: 1,
    lineHeight: 1.4,
  },
  warmupBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  warmupLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  warmupText: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.5,
  },
  coachingNotesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  coachingNotesText: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.6,
  },

  // ── Drill card ───────────────────────────────────────────────
  drillCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  drillLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  drillNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: E,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  drillNum: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: WHITE,
  },
  drillTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: DARK,
    flex: 1,
    lineHeight: 1.3,
  },
  durationBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  durationText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#92400e',
  },
  drillTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  drillTag: {
    fontSize: 8,
    color: MUTED,
    backgroundColor: LIGHT,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  drillDescription: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.55,
  },
  notesBox: {
    borderLeftWidth: 3,
    borderLeftColor: BORDER,
    borderLeftStyle: 'solid',
    paddingLeft: 8,
    marginTop: 8,
  },
  notesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Oblique',
  },
  keyCuesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  keyCuesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
})

// ── Types ─────────────────────────────────────────────────────

interface DrillWithMeta {
  drill: {
    id: string
    title: string
    description: string | null
    difficulty: string | null
    age_group: string | null
    player_count: string | null
    ai_guide: AiGuide | null
  }
  duration_minutes: number
  notes?: string
}

interface Props {
  session: SessionPlan & { ai_summary?: SessionSummary }
  drillItems: DrillWithMeta[]
  coach: { display_name: string | null; club: string | null }
}

// ── Helpers ───────────────────────────────────────────────────

function formatDuration(mins: number | null): string {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── PDF Component ─────────────────────────────────────────────

export function SessionPlanPDF({ session, drillItems, coach }: Props) {
  const summary = session.ai_summary ?? null

  return (
    <Document
      title={session.title}
      author={coach.display_name ?? '18th Man Coach'}
      subject="Rugby League Session Plan"
      creator="18th Man"
    >
      <Page size="A4" style={s.page}>
        {/* Fixed footer on every page */}
        <View fixed style={s.footer}>
          <Text style={s.footerBrand}>18TH MAN — RUGBY LEAGUE</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        {/* ── Page header ──────────────────────────────────── */}
        <View style={s.accentBar} />

        <View style={s.brandRow}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>18TH MAN</Text>
            <Text style={s.brandSub}>RUGBY LEAGUE COACHING PLATFORM</Text>
          </View>
          <Text style={s.docDate}>
            {formatDate(session.created_at)}
          </Text>
        </View>

        <View style={s.divider} />

        <Text style={s.sessionTitle}>{session.title}</Text>

        <View style={s.metaRow}>
          {coach.display_name && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>COACH</Text>
              <Text style={s.metaValue}>{coach.display_name}</Text>
            </View>
          )}
          {coach.club && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>CLUB</Text>
              <Text style={s.metaValue}>{coach.club}</Text>
            </View>
          )}
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>DURATION</Text>
            <Text style={s.metaValue}>{formatDuration(session.total_duration)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>DRILLS</Text>
            <Text style={s.metaValue}>{drillItems.length}</Text>
          </View>
        </View>

        {/* ── AI Summary ───────────────────────────────────── */}
        {summary && (
          <View wrap={false}>
            <View style={s.divider} />
            <Text style={s.sectionLabel}>SESSION OVERVIEW</Text>
            <View style={s.summaryBox}>
              <Text style={s.summaryOverview}>{summary.overview}</Text>

              <View style={s.summaryGrid}>
                {summary.focus_areas.length > 0 && (
                  <View style={s.summaryCol}>
                    <Text style={s.summaryColLabel}>FOCUS AREAS</Text>
                    {summary.focus_areas.map((area, i) => (
                      <View key={i} style={s.bulletRow}>
                        <View style={s.bulletDot} />
                        <Text style={s.bulletText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {summary.equipment.length > 0 && (
                  <View style={s.summaryCol}>
                    <Text style={s.summaryColLabel}>EQUIPMENT</Text>
                    {summary.equipment.map((item, i) => (
                      <View key={i} style={s.bulletRow}>
                        <View style={s.bulletDot} />
                        <Text style={s.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {summary.warm_up_suggestion && (
                <View style={s.warmupBox}>
                  <Text style={s.warmupLabel}>WARM-UP SUGGESTION</Text>
                  <Text style={s.warmupText}>{summary.warm_up_suggestion}</Text>
                </View>
              )}

              {summary.coaching_notes && (
                <View style={s.coachingNotesBox}>
                  <Text style={s.warmupLabel}>COACHING NOTES</Text>
                  <Text style={s.coachingNotesText}>{summary.coaching_notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Drill list ───────────────────────────────────── */}
        {drillItems.length > 0 && (
          <View>
            <View style={s.divider} />
            <Text style={s.sectionLabel}>TRAINING DRILLS</Text>

            {drillItems.map((item, index) => {
              const drill = item.drill
              const tags: string[] = []
              if (drill.difficulty) tags.push(capitalize(drill.difficulty))
              if (drill.player_count) tags.push(`${drill.player_count} players`)
              if (drill.age_group) tags.push(drill.age_group)

              const keyCues = drill.ai_guide?.key_cues?.slice(0, 4) ?? []

              return (
                <View key={drill.id} wrap={false} style={s.drillCard}>
                  {/* Drill header: number + title + duration */}
                  <View style={s.drillHeader}>
                    <View style={s.drillLeft}>
                      <View style={s.drillNumBadge}>
                        <Text style={s.drillNum}>{index + 1}</Text>
                      </View>
                      <Text style={s.drillTitle}>{drill.title}</Text>
                    </View>
                    <View style={s.durationBadge}>
                      <Text style={s.durationText}>{item.duration_minutes} min</Text>
                    </View>
                  </View>

                  {/* Meta tags */}
                  {tags.length > 0 && (
                    <View style={s.drillTagRow}>
                      {tags.map((tag, i) => (
                        <Text key={i} style={s.drillTag}>{tag}</Text>
                      ))}
                    </View>
                  )}

                  {/* Description */}
                  {drill.description && (
                    <Text style={s.drillDescription}>{drill.description}</Text>
                  )}

                  {/* Session-specific notes */}
                  {item.notes && (
                    <View style={s.notesBox}>
                      <Text style={s.notesLabel}>SESSION NOTES</Text>
                      <Text style={s.notesText}>{item.notes}</Text>
                    </View>
                  )}

                  {/* Key coaching cues from AI guide */}
                  {keyCues.length > 0 && (
                    <View style={s.keyCuesBox}>
                      <Text style={s.keyCuesLabel}>KEY COACHING CUES</Text>
                      {keyCues.map((cue, i) => (
                        <View key={i} style={s.bulletRow}>
                          <View style={s.bulletDot} />
                          <Text style={s.bulletText}>{cue}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </Page>
    </Document>
  )
}
