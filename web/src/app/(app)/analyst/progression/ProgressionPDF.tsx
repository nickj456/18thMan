// web/src/app/(app)/analyst/progression/ProgressionPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { countEvents, computePlayerStats } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

const E = '#e8560a'
const DARK = '#111827'
const MUTED = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE = '#ffffff'
const GREEN = '#059669'
const RED = '#dc2626'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 48, fontSize: 9, fontFamily: 'Helvetica', color: DARK },
  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid', paddingTop: 6 },
  footerText: { fontSize: 7, color: MUTED },
  header: { backgroundColor: E, paddingHorizontal: 36, paddingVertical: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE },
  headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  headerLogo: { width: 40, height: 40 },
  content: { paddingHorizontal: 36, paddingTop: 20 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 2, marginBottom: 10, marginTop: 16 },
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  tableRowLast: { flexDirection: 'row' },
  cellLabel: { flex: 2, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: LIGHT, fontSize: 8, color: MUTED },
  cell: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'right', fontSize: 8 },
  cellHeader: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'right', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, backgroundColor: LIGHT },
})

function Footer({ text }: { text: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>18TH MAN · MATCH ANALYSIS</Text>
      <Text style={s.footerText}>{text}</Text>
    </View>
  )
}

interface PDFProps {
  sessions: MatchSessionWithAnalyst[]
  sessionIds: string[]
  playerKeys: string[]
  players: ResolvedPlayer[]
  sections: string[]
  statTypes: string[]
  logoSrc?: string
  exportDate: string
}

export function ProgressionPDF({
  sessions,
  sessionIds,
  playerKeys,
  players,
  sections,
  statTypes,
  logoSrc,
  exportDate,
}: PDFProps) {
  const includedSessions = sessions
    .filter(sess => sessionIds.includes(sess.id))
    .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? ''))

  const selectedPlayers = players.filter(p => playerKeys.includes(p.key))

  return (
    <Document title="Match Analysis — 18th Man" author="18th Man">
      {/* Cover page */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>MATCH ANALYSIS</Text>
            <Text style={s.headerTitle}>Team Progression Report</Text>
            <Text style={s.headerSub}>{includedSessions.length} matches · {selectedPlayers.length} players</Text>
          </View>
          {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
        </View>
        <View style={s.content}>
          <Text style={s.sectionLabel}>MATCHES INCLUDED</Text>
          <View style={s.table}>
            {includedSessions.map((session, i) => (
              <View key={session.id} style={i === includedSessions.length - 1 ? s.tableRowLast : s.tableRow}>
                <Text style={s.cellLabel}>vs {session.opposition ?? '—'}</Text>
                <Text style={[s.cell, { flex: 2 }]}>{session.match_date ?? '—'} · {session.our_score ?? '?'} – {session.opp_score ?? '?'}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>EXPORT INFO</Text>
          <Text style={{ fontSize: 8, color: MUTED }}>Generated {exportDate} · 18th Man Match Analysis</Text>
        </View>
        <Footer text={exportDate} />
      </Page>

      {/* Team report page */}
      {sections.includes('team') && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <View>
              <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>TEAM REPORT</Text>
              <Text style={s.headerTitle}>Team Stats by Match</Text>
            </View>
            {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
          </View>
          <View style={s.content}>
            <View style={s.table}>
              <View style={s.tableRow}>
                <Text style={[s.cellLabel, { flex: 2 }]}>Stat</Text>
                {includedSessions.map(session => (
                  <Text key={session.id} style={s.cellHeader}>
                    {session.opposition ?? '—'}{'\n'}{session.match_date ?? '—'}
                  </Text>
                ))}
              </View>
              {statTypes.map((statType, i) => {
                const isLast = i === statTypes.length - 1
                return (
                  <View key={statType} style={isLast ? s.tableRowLast : s.tableRow}>
                    <Text style={[s.cellLabel, { flex: 2 }]}>{statType.replace(/_/g, ' ')}</Text>
                    {includedSessions.map(session => {
                      const val = countEvents(session.events)[statType] ?? 0
                      return (
                        <Text key={session.id} style={s.cell}>{val}</Text>
                      )
                    })}
                  </View>
                )
              })}
            </View>
          </View>
          <Footer text="Team Report" />
        </Page>
      )}

      {/* Player report cards — one page per player */}
      {sections.includes('cards') && selectedPlayers.map(player => {
        const stats = computePlayerStats(player.key, sessions, sessionIds, statTypes)
          .filter(stat => stat.avg > 0 || stat.best > 0)
        const hasDecline = stats.some(stat => stat.hasDecline)

        return (
          <Page key={player.key} size="A4" style={s.page}>
            <View style={s.header}>
              <View>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>PLAYER REPORT CARD</Text>
                <Text style={s.headerTitle}>{player.name}</Text>
                <Text style={s.headerSub}>
                  #{player.primaryNumber} · {player.sessionCount} matches
                  {hasDecline ? ' · ⚠ Stat decline detected' : ''}
                </Text>
              </View>
              {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
            </View>
            <View style={s.content}>
              <View style={s.table}>
                <View style={s.tableRow}>
                  <Text style={s.cellLabel}>Stat</Text>
                  <Text style={s.cellHeader}>Avg</Text>
                  <Text style={s.cellHeader}>Best</Text>
                  <Text style={s.cellHeader}>Worst</Text>
                  <Text style={s.cellHeader}>Trend</Text>
                </View>
                {stats.map((stat, i) => {
                  const isLast = i === stats.length - 1
                  const trendMap: Record<string, string> = {
                    'up-strong': '↑↑', 'up': '↑', 'flat': '→', 'down': '↓', 'down-strong': '↓↓',
                  }
                  return (
                    <View key={stat.statType} style={isLast ? s.tableRowLast : s.tableRow}>
                      <Text style={s.cellLabel}>{stat.statType.replace(/_/g, ' ')}{stat.hasDecline ? ' ⚠' : ''}</Text>
                      <Text style={s.cell}>{stat.avg.toFixed(1)}</Text>
                      <Text style={[s.cell, { color: GREEN }]}>{stat.best}</Text>
                      <Text style={[s.cell, { color: RED }]}>{stat.worst}</Text>
                      <Text style={s.cell}>{trendMap[stat.trend] ?? '→'}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <Footer text={`${player.name} · #${player.primaryNumber}`} />
          </Page>
        )
      })}
    </Document>
  )
}
