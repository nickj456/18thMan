import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import type { FeedbackSummaryData, FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 56, fontSize: 10, fontFamily: 'Helvetica', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogoBadge: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 36, height: 36 },
  eyeLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  body: { paddingHorizontal: 44, paddingTop: 32 },

  groupHeading: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 12, marginTop: 28,
    paddingBottom: 8, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: E, color: E,
  },
  responseCount: { fontSize: 9, color: MUTED, marginBottom: 14 },
  categoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: LIGHT, borderRadius: 5, marginBottom: 6,
  },
  categoryName: { fontSize: 9.5, color: MID, fontFamily: 'Helvetica-Bold' },
  categoryRating: { fontSize: 9.5, color: DARK, fontFamily: 'Helvetica-Bold' },
  notReady: { fontSize: 9.5, color: MUTED, fontStyle: 'italic', paddingVertical: 8 },

  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },
})

function FeedbackTypeSection({ heading, summary }: { heading: string; summary: FeedbackTypeSummary }) {
  return (
    <View wrap={false}>
      <Text style={s.groupHeading}>{heading}</Text>
      {summary.ready ? (
        <>
          <Text style={s.responseCount}>
            {summary.responseCount} response{summary.responseCount === 1 ? '' : 's'}
          </Text>
          {summary.categories.map(category => (
            <View key={category.categorySlug} style={s.categoryRow}>
              <Text style={s.categoryName}>{labelFor(category.categorySlug)}</Text>
              <Text style={s.categoryRating}>{category.averageRating.toFixed(1)}/5</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={s.notReady}>Not enough responses yet — check back once more feedback comes in.</Text>
      )}
    </View>
  )
}

export function FeedbackSummaryPDF({
  data,
  coachName,
  clubName,
  logoSrc,
}: {
  data: FeedbackSummaryData
  coachName?: string | null
  clubName?: string | null
  logoSrc?: string
}) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title="Coach DNA — Feedback Summary" author="18th Man Coach DNA">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyeLabel}>COACH DNA</Text>
            <Text style={s.title}>Feedback Summary</Text>
            <Text style={s.subtitle}>
              {coachName ?? 'Coach'}{clubName ? ` · ${clubName}` : ''}
            </Text>
          </View>
          {logoSrc && (
            <View style={s.headerLogoBadge}>
              <Image style={s.headerLogo} src={logoSrc} />
            </View>
          )}
        </View>

        <View style={s.body}>
          <FeedbackTypeSection heading="PLAYER / PARENT VOICE" summary={data.playerParentVoice} />
          <FeedbackTypeSection heading="PEER OBSERVATION" summary={data.peerObservation} />
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>COACH DNA · 18TH MAN</Text>
          <Text style={s.footerMeta}>{today}</Text>
        </View>
      </Page>
    </Document>
  )
}
