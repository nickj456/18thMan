import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { GamePlan, GamePlanAiPlan } from '@/lib/supabase/types'

const E = '#e8560a'
const DARK = '#111111'
const MID = '#374151'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const WHITE = '#ffffff'

const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 10,
    color: DARK,
    fontFamily: 'Helvetica',
  },

  // ── Fixed footer ─────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
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

  // ── Header ───────────────────────────────────────────────────
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
  docLabel: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'right',
  },

  // ── Title block ──────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  opposition: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: DARK,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
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

  // ── Section ──────────────────────────────────────────────────
  sectionHeader: {
    borderTopWidth: 1,
    borderTopColor: E,
    borderTopStyle: 'solid',
    paddingTop: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: DARK,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },

  // ── Body text ────────────────────────────────────────────────
  bodyText: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.5,
    marginBottom: 6,
  },

  // ── Bullet points ────────────────────────────────────────────
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  bulletMark: {
    fontSize: 10,
    color: E,
    marginRight: 6,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.5,
  },
  bulletText: {
    fontSize: 10,
    color: MID,
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Quote box ────────────────────────────────────────────────
  quoteBox: {
    borderWidth: 1,
    borderColor: E,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 11,
    color: DARK,
    fontFamily: 'Helvetica-Oblique',
    textAlign: 'center',
    lineHeight: 1.6,
  },
})

interface Props {
  gamePlan: GamePlan & { ai_plan: GamePlanAiPlan }
}

function formatKickOff(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GamePlanPDF({ gamePlan }: Props) {
  const plan = gamePlan.ai_plan

  if (!plan) {
    return (
      <Document title="Game Plan" creator="18th Man">
        <Page size="A4" style={s.page}>
          <Text style={s.bodyText}>No plan generated.</Text>
        </Page>
      </Document>
    )
  }

  const kickOff = formatKickOff(gamePlan.kick_off_time)

  return (
    <Document
      title={`${gamePlan.opposition} — Game Plan`}
      subject="Rugby League Game Plan"
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
          <Text style={s.docLabel}>GAME PLAN</Text>
        </View>

        <View style={s.divider} />

        {/* ── Title block ──────────────────────────────────── */}
        <Text style={s.opposition}>vs {gamePlan.opposition}</Text>

        <View style={s.metaRow}>
          {gamePlan.pitch && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>PITCH</Text>
              <Text style={s.metaValue}>{gamePlan.pitch}</Text>
            </View>
          )}
          {kickOff && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>KICK-OFF</Text>
              <Text style={s.metaValue}>{kickOff}</Text>
            </View>
          )}
        </View>

        {/* ── Team Focus ───────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>TEAM FOCUS</Text>
        </View>

        {plan.teamFocus.intro ? (
          <Text style={s.bodyText}>{plan.teamFocus.intro}</Text>
        ) : null}

        {plan.teamFocus.keyMessages.map((msg, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{msg}</Text>
          </View>
        ))}

        {/* ── Forwards ─────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>FORWARDS</Text>
          {plan.forwards.positions ? (
            <Text style={s.sectionSubtitle}>{plan.forwards.positions}</Text>
          ) : null}
        </View>

        {plan.forwards.role ? (
          <Text style={s.bodyText}>{plan.forwards.role}</Text>
        ) : null}

        {plan.forwards.points.map((point, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{point}</Text>
          </View>
        ))}

        {/* ── Backs ────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>BACKS</Text>
          {plan.backs.positions ? (
            <Text style={s.sectionSubtitle}>{plan.backs.positions}</Text>
          ) : null}
        </View>

        {plan.backs.role ? (
          <Text style={s.bodyText}>{plan.backs.role}</Text>
        ) : null}

        {plan.backs.points.map((point, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{point}</Text>
          </View>
        ))}

        {/* ── Half Backs ───────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>HALF BACKS</Text>
          {plan.halfBacks.positions ? (
            <Text style={s.sectionSubtitle}>{plan.halfBacks.positions}</Text>
          ) : null}
        </View>

        {plan.halfBacks.role ? (
          <Text style={s.bodyText}>{plan.halfBacks.role}</Text>
        ) : null}

        {plan.halfBacks.points.map((point, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{point}</Text>
          </View>
        ))}

        {/* ── Final Reminders ──────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>FINAL REMINDERS</Text>
        </View>

        {plan.finalReminders.closing ? (
          <Text style={s.bodyText}>{plan.finalReminders.closing}</Text>
        ) : null}

        {plan.finalReminders.points.map((point, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{point}</Text>
          </View>
        ))}

        {plan.finalReminders.quote ? (
          <View style={s.quoteBox}>
            <Text style={s.quoteText}>"{plan.finalReminders.quote}"</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
