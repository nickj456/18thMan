import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import { sourceTagFor, allCategoriesSelfOnly } from '@/lib/coach-dna/source-label'
import { tierLabel } from '@/lib/coach-dna/tier-label'
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

  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 2.5, marginBottom: 12 },
  groupHeading: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 12, marginTop: 28,
    paddingBottom: 8, borderBottomWidth: 1.5, borderBottomStyle: 'solid',
  },

  detailTable: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 8, marginBottom: 24 },
  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  detailRowLast: { flexDirection: 'row' },
  detailKey: {
    width: 130, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, color: MUTED,
    borderRightWidth: 1, borderRightColor: BORDER, borderRightStyle: 'solid', backgroundColor: LIGHT,
  },
  detailValue: { flex: 1, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },

  narrative: { fontSize: 10.5, color: MID, lineHeight: 1.6, marginBottom: 8 },

  commentBlock: { marginBottom: 16 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  commentDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  commentLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  sourceTag: { fontSize: 6.5, color: MUTED, marginLeft: 8, fontFamily: 'Helvetica' },
  commentBody: {
    fontSize: 9.5, color: MID, lineHeight: 1.6, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: LIGHT, borderRadius: 5, borderLeftWidth: 3, borderLeftStyle: 'solid',
  },

  resourceList: { marginTop: 6, paddingLeft: 10 },
  resourceItem: { fontSize: 8, color: MUTED, lineHeight: 1.5, marginBottom: 2 },
  resourceTitle: { fontFamily: 'Helvetica-Bold', color: MID },

  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },

  confidential: { marginTop: 20, fontSize: 7.5, color: '#9ca3af', textAlign: 'center' },
})

function CommentBlock({
  label,
  meta,
  text,
  color,
  resources,
  tag,
}: {
  label: string
  meta: string
  text: string
  color: string
  resources?: { title: string; description: string }[]
  tag?: string | null
}) {
  return (
    <View style={s.commentBlock} wrap={false}>
      <View style={s.commentHeaderRow}>
        <View style={[s.commentDot, { backgroundColor: color }]} />
        <Text style={[s.commentLabel, { color }]}>{label}</Text>
        <Text style={s.sourceTag}>{meta}</Text>
        {tag && <Text style={s.sourceTag}>{tag}</Text>}
      </View>
      <Text style={[s.commentBody, { borderLeftColor: color }]}>{text}</Text>
      {resources && resources.length > 0 && (
        <View style={s.resourceList}>
          {resources.map(resource => (
            <Text key={resource.title} style={s.resourceItem}>
              <Text style={s.resourceTitle}>{resource.title}</Text>
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
  // "Completed" reflects when the assessment was actually finished, not when
  // this PDF happens to be rendered/emailed — `today` (below) is only for the
  // footer's "generated on" stamp.
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
      <Page size="A4" style={s.page}>
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
          {data.categories.filter(c => c.tier === 'strength').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={GREEN}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}

          <Text style={[s.groupHeading, { color: MID, borderBottomColor: BORDER }]}>SOLID GROUND</Text>
          {data.categories.filter(c => c.tier === 'solid').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={MID}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}

          <Text style={[s.groupHeading, { color: AMBER, borderBottomColor: AMBER }]}>FOCUS AREAS</Text>
          {data.categories.filter(c => c.tier === 'focus').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={AMBER}
              resources={category.resources}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}

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
