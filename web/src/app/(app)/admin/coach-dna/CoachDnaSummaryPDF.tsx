import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
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
  },
  eyeLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  body: { paddingHorizontal: 44, paddingTop: 32 },

  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 2.5, marginBottom: 12 },

  detailTable: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 8, marginBottom: 24 },
  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  detailRowLast: { flexDirection: 'row' },
  detailKey: {
    width: 130, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, color: MUTED,
    borderRightWidth: 1, borderRightColor: BORDER, borderRightStyle: 'solid', backgroundColor: LIGHT,
  },
  detailValue: { flex: 1, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },

  narrative: { fontSize: 10.5, color: MID, lineHeight: 1.6, marginBottom: 24 },

  commentBlock: { marginBottom: 14 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  commentDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  commentLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  commentBody: {
    fontSize: 9.5, color: MID, lineHeight: 1.6, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: LIGHT, borderRadius: 5, borderLeftWidth: 3, borderLeftStyle: 'solid',
  },

  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },

  confidential: { marginTop: 8, fontSize: 7.5, color: '#9ca3af', textAlign: 'center' },
})

function CommentBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <View style={s.commentBlock}>
      <View style={s.commentHeaderRow}>
        <View style={[s.commentDot, { backgroundColor: color }]} />
        <Text style={[s.commentLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[s.commentBody, { borderLeftColor: color }]}>{text}</Text>
    </View>
  )
}

export function CoachDnaSummaryPDF({ data }: { data: SelfAssessmentSummary }) {
  const typeLine = `${labelFor(data.primaryType)}${data.secondaryType ? ` / ${labelFor(data.secondaryType)}` : ''} Coach`
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = [
    { key: 'Coach Type', value: typeLine },
    { key: 'Completed', value: today },
    { key: 'Data Source', value: 'Self-Assessment Only' },
  ]

  return (
    <Document title="Coach DNA — Self-Assessment Results" author="18th Man Coach DNA">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.eyeLabel}>COACH DNA</Text>
          <Text style={s.title}>{typeLine}</Text>
          <Text style={s.subtitle}>Self-Assessment Results</Text>
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>SUMMARY</Text>

          <View style={s.detailTable}>
            {rows.map(({ key, value }, i) => (
              <View key={key} style={i === rows.length - 1 ? s.detailRowLast : s.detailRow}>
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.narrative}>{data.narrative}</Text>

          {data.pros.map(pro => (
            <CommentBlock key={pro.categorySlug} label={labelFor(pro.categorySlug).toUpperCase()} text={pro.text} color={GREEN} />
          ))}
          {data.cons.map(con => (
            <CommentBlock key={con.categorySlug} label={labelFor(con.categorySlug).toUpperCase()} text={con.text} color={AMBER} />
          ))}

          <Text style={s.confidential}>
            This reflects your self-assessment only and will update as player and peer feedback comes in.
          </Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>COACH DNA · 18TH MAN</Text>
          <Text style={s.footerMeta}>{today}</Text>
        </View>
      </Page>
    </Document>
  )
}
