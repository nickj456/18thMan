import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import { tierLabel } from '@/lib/coach-dna/tier-label'
import { sourceTagFor, allCategoriesSelfOnly } from '@/lib/coach-dna/source-label'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'
const GREEN  = '#059669'
const AMBER  = '#d97706'

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
  title: { fontFamily: 'Barlow Condensed', fontStyle: 'italic', fontWeight: 800, fontSize: 30, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  body: { paddingHorizontal: 44, paddingTop: 24 },

  sectionLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, color: MUTED, letterSpacing: 2.5, marginBottom: 10 },
  groupHeading: {
    fontSize: 8, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 2, marginBottom: 10, marginTop: 18,
    paddingBottom: 6, borderBottomWidth: 1.5, borderBottomStyle: 'solid',
  },

  detailTable: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 8, marginBottom: 18 },
  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  detailRowLast: { flexDirection: 'row' },
  detailKey: {
    width: 110, paddingVertical: 9, paddingHorizontal: 14, fontSize: 8.5, color: MUTED,
    borderRightWidth: 1, borderRightColor: BORDER, borderRightStyle: 'solid', backgroundColor: LIGHT,
  },
  detailValue: { flex: 1, paddingVertical: 9, paddingHorizontal: 14, fontSize: 8.5, fontFamily: 'Geist', fontWeight: 700, color: DARK },

  narrative: { fontSize: 9.5, color: MID, lineHeight: 1.5, marginBottom: 6 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    width: '48%', marginRight: '2%', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: LIGHT, borderRadius: 6, borderLeftWidth: 3, borderLeftStyle: 'solid',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  cardDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  cardLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 1.5 },
  cardMeta: { fontSize: 6.5, color: MUTED, marginLeft: 6 },
  cardTag: { fontSize: 6, color: MUTED, marginLeft: 6 },
  cardBody: { fontSize: 8.5, color: MID, lineHeight: 1.45 },

  resourceList: { marginTop: 5 },
  resourceItem: { fontSize: 7.5, color: MUTED, lineHeight: 1.4, marginBottom: 2 },

  footer: {
    position: 'absolute', bottom: 18, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Geist', fontWeight: 700, color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },

  confidential: { marginTop: 16, fontSize: 7.5, color: '#9ca3af', textAlign: 'center' },
})

function CategoryCard({
  category,
  color,
  sourcedCategories,
}: {
  category: SelfAssessmentSummary['categories'][number]
  color: string
  sourcedCategories: SelfAssessmentSummary['sourcedCategories']
}) {
  const tag = sourceTagFor(sourcedCategories, category.categorySlug)
  return (
    <View style={[s.card, { borderLeftColor: color }]} wrap={false}>
      <View style={s.cardHeaderRow}>
        <View style={[s.cardDot, { backgroundColor: color }]} />
        <Text style={[s.cardLabel, { color }]}>{labelFor(category.categorySlug).toUpperCase()}</Text>
        <Text style={s.cardMeta}>{tierLabel(category.tier)} · {Math.round(category.score)}/100</Text>
        {tag && <Text style={s.cardTag}>{tag}</Text>}
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

export function CoachDnaSummaryPDF({
  data,
  completedAt,
  logoSrc,
  coachName,
  clubName,
}: {
  data: SelfAssessmentSummary
  completedAt: string
  logoSrc?: string
  coachName?: string | null
  clubName?: string | null
}) {
  const typeLine = `${labelFor(data.primaryType)}${data.secondaryType ? ` / ${labelFor(data.secondaryType)}` : ''} Coach`
  const completedLabel = new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const allCategorySlugs = data.categories.map(c => c.categorySlug)
  const selfOnly = allCategoriesSelfOnly(data.sourcedCategories, allCategorySlugs)

  const rows = [
    ...(coachName ? [{ key: 'Coach', value: coachName }] : []),
    ...(clubName ? [{ key: 'Club', value: clubName }] : []),
    { key: 'Coach Type', value: typeLine },
    { key: 'Completed', value: completedLabel },
    { key: 'Data Source', value: selfOnly ? 'Self-Assessment Only' : 'Self-Assessment + Player/Peer Feedback' },
  ]

  return (
    <Document title="Coach DNA — Self-Assessment Results" author="18th Man Coach DNA">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyeLabel}>COACH DNA</Text>
            <Text style={s.title}>{typeLine}</Text>
            <Text style={s.subtitle}>Self-Assessment Results</Text>
          </View>
          {logoSrc && (
            <View style={s.headerLogoBadge}>
              <Image style={s.headerLogo} src={logoSrc} />
            </View>
          )}
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>SUMMARY</Text>

          <View style={s.detailTable} wrap={false}>
            {rows.map(({ key, value }, i) => (
              <View key={key} style={i === rows.length - 1 ? s.detailRowLast : s.detailRow}>
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.narrative}>{data.narrative}</Text>

          <Text style={[s.groupHeading, { color: GREEN, borderBottomColor: GREEN }]}>STRENGTHS</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'strength').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={GREEN} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          <Text style={[s.groupHeading, { color: MID, borderBottomColor: BORDER }]}>SOLID GROUND</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'solid').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={MID} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          <Text style={[s.groupHeading, { color: AMBER, borderBottomColor: AMBER }]}>FOCUS AREAS</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'focus').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={AMBER} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          {selfOnly && (
            <Text style={s.confidential}>
              This reflects your self-assessment only and will update as player and peer feedback comes in.
            </Text>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>COACH DNA · 18TH MAN</Text>
          <Text
            style={s.footerMeta}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `${today} · Page ${pageNumber} of ${totalPages}` : today
            }
          />
        </View>
      </Page>
    </Document>
  )
}
