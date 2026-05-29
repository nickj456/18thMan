import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'
const GREEN  = '#059669'
const RED    = '#dc2626'

const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: DARK,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta:  { fontSize: 6.5, color: MUTED },
  coverHeader: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 40,
  },
  coverEyeLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    marginBottom: 6,
  },
  coverSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  coverMeta: {
    paddingHorizontal: 44,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    gap: 32,
  },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1.5, marginBottom: 3 },
  metaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  section: { paddingHorizontal: 44, paddingTop: 28 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: E,
    marginBottom: 10,
  },
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  colName:  { flex: 1, fontSize: 9, color: DARK },
  colCount: { width: 60, fontSize: 9, color: DARK, textAlign: 'right' },
  colHead:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1 },
  setGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  setCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  setCardLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  setCardFraction: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: DARK },
  setCardRate: { fontSize: 8, color: MUTED, marginTop: 2 },
})

export interface GameStatsPDFData {
  opponent: string
  matchDate: string
  groupName: string
  location: string
  carries: { name: string; count: number }[]
  tackles: { name: string; count: number }[]
  sets: {
    half1: { completed: number; total: number }
    half2: { completed: number; total: number }
  }
}

function rate(completed: number, total: number) {
  if (total === 0) return '—'
  return `${Math.round((completed / total) * 100)}%`
}

export function GameStatsPDF({ data }: { data: GameStatsPDFData }) {
  const date = new Date(data.matchDate).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cover header */}
        <View style={s.coverHeader}>
          <Text style={s.coverEyeLabel}>18TH MAN — GAME STATS</Text>
          <Text style={s.coverTitle}>vs {data.opponent}</Text>
          <Text style={s.coverSubtitle}>{data.groupName}</Text>
        </View>

        {/* Meta row */}
        <View style={s.coverMeta}>
          <View>
            <Text style={s.metaLabel}>DATE</Text>
            <Text style={s.metaValue}>{date}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>LOCATION</Text>
            <Text style={s.metaValue}>{data.location}</Text>
          </View>
        </View>

        {/* Carries */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Attack — Carries</Text>
          {data.carries.length === 0 ? (
            <Text style={{ fontSize: 9, color: MUTED }}>No carries recorded.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colHead, { flex: 1 }]}>PLAYER</Text>
                <Text style={[s.colHead, { width: 60, textAlign: 'right' }]}>CARRIES</Text>
              </View>
              {data.carries.map((row, i) => (
                <View
                  key={row.name}
                  style={i === data.carries.length - 1 ? s.tableRowLast : s.tableRow}
                >
                  <Text style={s.colName}>{row.name}</Text>
                  <Text style={s.colCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tackles */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Defence — Tackles</Text>
          {data.tackles.length === 0 ? (
            <Text style={{ fontSize: 9, color: MUTED }}>No tackles recorded.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colHead, { flex: 1 }]}>PLAYER</Text>
                <Text style={[s.colHead, { width: 60, textAlign: 'right' }]}>TACKLES</Text>
              </View>
              {data.tackles.map((row, i) => (
                <View
                  key={row.name}
                  style={i === data.tackles.length - 1 ? s.tableRowLast : s.tableRow}
                >
                  <Text style={s.colName}>{row.name}</Text>
                  <Text style={s.colCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Set Completion */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Set Completion</Text>
          <View style={s.setGrid}>
            <View style={s.setCard}>
              <Text style={s.setCardLabel}>1ST HALF</Text>
              <Text style={s.setCardFraction}>
                {data.sets.half1.completed}/{data.sets.half1.total}
              </Text>
              <Text style={s.setCardRate}>
                {rate(data.sets.half1.completed, data.sets.half1.total)} completion rate
              </Text>
            </View>
            <View style={s.setCard}>
              <Text style={s.setCardLabel}>2ND HALF</Text>
              <Text style={s.setCardFraction}>
                {data.sets.half2.completed}/{data.sets.half2.total}
              </Text>
              <Text style={s.setCardRate}>
                {rate(data.sets.half2.completed, data.sets.half2.total)} completion rate
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>18TH MAN</Text>
          <Text style={s.footerMeta}>
            vs {data.opponent} · {date}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
