import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const E = '#e8560a'
const DARK = '#111827'
const MUTED = '#6b7280'

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 11, fontFamily: 'Helvetica', color: DARK },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: E, marginBottom: 12 },
  narrative: { marginBottom: 20, lineHeight: 1.5 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 16 },
  item: { marginBottom: 6, lineHeight: 1.4 },
  itemLabel: { fontFamily: 'Helvetica-Bold' },
  disclaimer: { marginTop: 24, fontSize: 9, color: MUTED },
})

const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher', technician: 'Technician', motivator: 'Motivator', developer: 'Developer',
  'game-manager': 'Game Manager', communicator: 'Communicator', organiser: 'Organiser', 'culture-builder': 'Culture Builder',
}

export function CoachDnaSummaryPDF({ data }: { data: SelfAssessmentSummary }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>
          {CATEGORY_LABELS[data.primaryType]}{data.secondaryType ? ` / ${CATEGORY_LABELS[data.secondaryType]}` : ''} Coach
        </Text>
        <Text style={s.narrative}>{data.narrative}</Text>

        <Text style={s.sectionTitle}>Strengths</Text>
        {data.pros.map(pro => (
          <Text key={pro.categorySlug} style={s.item}>
            <Text style={s.itemLabel}>{CATEGORY_LABELS[pro.categorySlug]}: </Text>{pro.text}
          </Text>
        ))}

        <Text style={s.sectionTitle}>Focus areas</Text>
        {data.cons.map(con => (
          <View key={con.categorySlug}>
            <Text style={s.item}>
              <Text style={s.itemLabel}>{CATEGORY_LABELS[con.categorySlug]}: </Text>{con.text}
            </Text>
          </View>
        ))}

        <Text style={s.disclaimer}>
          This reflects your self-assessment only and will update as player and peer feedback comes in.
        </Text>
      </Page>
    </Document>
  )
}
