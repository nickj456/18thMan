import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import { feedbackBandLabel, type FeedbackSummaryData, type FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 40, fontSize: 9.5, fontFamily: 'Geist', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogoBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 32, height: 32 },
  eyeLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 },
  title: { fontFamily: 'Barlow Condensed', fontStyle: 'italic', fontSize: 30, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  body: { paddingHorizontal: 44, paddingTop: 24 },

  groupHeading: {
    fontSize: 8, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 2, marginBottom: 10, marginTop: 18,
    paddingBottom: 6, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: E, color: E,
  },
  responseCount: { fontSize: 8.5, color: MUTED, marginBottom: 10 },

  card: {
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: LIGHT, borderRadius: 6, marginBottom: 8,
    borderLeftWidth: 3, borderLeftStyle: 'solid',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  cardDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  cardLabel: { fontSize: 7.5, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 1.5 },
  cardMeta: { fontSize: 6.5, color: MUTED, marginLeft: 6 },
  cardBody: { fontSize: 8.5, color: MID, lineHeight: 1.45 },

  resourceList: { marginTop: 5 },
  resourceItem: { fontSize: 7.5, color: MUTED, lineHeight: 1.4, marginBottom: 2 },

  notReady: { fontSize: 9, color: MUTED, fontStyle: 'italic', paddingVertical: 6 },

  footer: {
    position: 'absolute', bottom: 18, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Geist', fontWeight: 700, color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },
})

function FeedbackCategoryCard({ category }: { category: FeedbackTypeSummary['categories'][number] }) {
  const strong = category.averageRating >= 3.5
  const color = strong ? '#059669' : '#d97706'
  return (
    <View style={[s.card, { borderLeftColor: color }]} wrap={false}>
      <View style={s.cardHeaderRow}>
        <View style={[s.cardDot, { backgroundColor: color }]} />
        <Text style={[s.cardLabel, { color }]}>{labelFor(category.categorySlug).toUpperCase()}</Text>
        <Text style={s.cardMeta}>{feedbackBandLabel(category.averageRating)} · {category.averageRating.toFixed(1)}/5 · {category.responseCount} response{category.responseCount === 1 ? '' : 's'}</Text>
      </View>
      <Text style={s.cardBody}>{category.text}</Text>
      {category.resources.length > 0 && (
        <View style={s.resourceList}>
          {category.resources.map(resource => (
            <Text key={resource.title} style={s.resourceItem}>
              {resource.url ? (
                <Link src={resource.url} style={{ color: E }}>{resource.title}</Link>
              ) : (
                <Text>{resource.title}</Text>
              )}
              {' — '}{resource.description}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

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
            <FeedbackCategoryCard key={category.categorySlug} category={category} />
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
      <Page size="A4" orientation="landscape" style={s.page}>
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
