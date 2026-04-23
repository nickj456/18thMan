import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { MatchReportData, PlayerReport, TeamSummary } from './types'

// ── Palette ───────────────────────────────────────────────────────────────────
const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'
const GREEN  = '#059669'
const AMBER  = '#d97706'
const BLUE   = '#2563eb'

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: DARK,
  },

  // Fixed footer on every page
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

  // ── Cover page ───────────────────────────────────────────────────────────────
  coverHeader: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverEyeLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    marginBottom: 10,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: -0.5,
  },
  coverSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  coverLogo: { width: 46, height: 46 },

  coverBody: { paddingHorizontal: 44, paddingTop: 36 },

  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    letterSpacing: 2.5,
    marginBottom: 14,
  },

  matchTable: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 8,
  },
  matchRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  matchRowLast: { flexDirection: 'row' },
  matchKey: {
    width: 115,
    paddingVertical: 11,
    paddingHorizontal: 16,
    fontSize: 9,
    color: MUTED,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderRightStyle: 'solid',
    backgroundColor: LIGHT,
  },
  matchValue: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },

  coverBadge: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: LIGHT,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: E,
    borderLeftStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverBadgeText: { fontSize: 9, color: MUTED },
  coverBadgeBrand: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: E },

  coverConfidential: {
    marginTop: 16,
    fontSize: 7.5,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // ── Section page header (dark) ────────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: DARK,
    paddingHorizontal: 44,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionHeaderLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: E,
    letterSpacing: 2.5,
    marginBottom: 7,
  },
  sectionHeaderName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: -0.3,
  },
  sectionHeaderSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  sectionHeaderLogo: { width: 30, height: 30, opacity: 0.35 },

  // ── Content wrapper ───────────────────────────────────────────────────────────
  content: { paddingHorizontal: 44, paddingTop: 26 },

  // ── Stats grid ────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', marginBottom: 22 },
  statsColLeft: { flex: 1, marginRight: 18 },
  statsColRight: { flex: 1 },
  statsColHeading: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: E,
    letterSpacing: 2.5,
    paddingBottom: 9,
    borderBottomWidth: 1.5,
    borderBottomColor: E,
    borderBottomStyle: 'solid',
    marginBottom: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  statLabel:        { fontSize: 9, color: MID },
  statValueNonZero: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: DARK },
  statValueZero:    { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#d1d5db' },

  // ── Comment blocks ────────────────────────────────────────────────────────────
  divider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    marginBottom: 18,
  },
  commentBlock: { marginBottom: 14 },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  commentDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  commentLabel:    { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  commentBody: {
    fontSize: 9.5,
    color: MID,
    lineHeight: 1.6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: LIGHT,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
  },

  // ── Team summary 2-col grid ───────────────────────────────────────────────────
  teamGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  teamGridLeft: { width: '50%', paddingRight: 10, marginBottom: 6 },
  teamGridRight:{ width: '50%', paddingLeft:  10, marginBottom: 6 },
})

// ── Sub-components ────────────────────────────────────────────────────────────

function Footer({ left, right }: { left: string; right: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerBrand}>{left}</Text>
      <Text style={s.footerMeta}>{right}</Text>
    </View>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={value > 0 ? s.statValueNonZero : s.statValueZero}>{value}</Text>
    </View>
  )
}

function CommentBlock({
  label,
  text,
  color,
}: {
  label: string
  text: string
  color: string
}) {
  return (
    <View style={s.commentBlock}>
      <View style={s.commentHeaderRow}>
        <View style={[s.commentDot, { backgroundColor: color }]} />
        <Text style={[s.commentLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[s.commentBody, { borderLeftColor: color }]}>
        {text.trim() || '—'}
      </Text>
    </View>
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function CoverPage({
  data,
  logoSrc,
}: {
  data: MatchReportData
  logoSrc?: string
}) {
  const serviceLabel =
    data.serviceType === 'match-review'
      ? 'Match Review Report'
      : 'Opposition Scouting Report'
  const serviceSubtitle =
    data.serviceType === 'match-review'
      ? 'Individual Player Analysis'
      : 'Full Team Opposition Breakdown'

  const dateFormatted = data.matchDate
    ? new Date(`${data.matchDate}T12:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const rows = [
    { key: 'Date',        value: dateFormatted },
    { key: 'Opposition',  value: data.opposition },
    { key: 'Competition', value: data.competition },
    { key: 'Report Type', value: serviceSubtitle },
    { key: 'Prepared For', value: data.customerEmail },
  ]

  return (
    <Page size="A4" style={s.page}>
      {/* Orange hero header */}
      <View style={s.coverHeader}>
        <View>
          <Text style={s.coverEyeLabel}>COACHING EYE</Text>
          <Text style={s.coverTitle}>{serviceLabel}</Text>
          <Text style={s.coverSubtitle}>{serviceSubtitle}</Text>
        </View>
        {logoSrc && <Image style={s.coverLogo} src={logoSrc} />}
      </View>

      {/* Match details */}
      <View style={s.coverBody}>
        <Text style={s.sectionLabel}>MATCH DETAILS</Text>

        <View style={s.matchTable}>
          {rows.map(({ key, value }, i) => (
            <View key={key} style={i === rows.length - 1 ? s.matchRowLast : s.matchRow}>
              <Text style={s.matchKey}>{key}</Text>
              <Text style={s.matchValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.coverBadge}>
          <Text style={s.coverBadgeBrand}>18th Man Coaching Eye</Text>
          <Text style={s.coverBadgeText}> · Professional Rugby League Analysis</Text>
        </View>

        <Text style={s.coverConfidential}>
          This report is confidential and prepared exclusively for the recipient.
        </Text>
      </View>

      <Footer
        left="COACHING EYE · 18TH MAN"
        right={`${data.opposition} · ${dateFormatted}`}
      />
    </Page>
  )
}

function TeamSummaryPage({
  summary,
  data,
  logoSrc,
}: {
  summary: TeamSummary
  data: MatchReportData
  logoSrc?: string
}) {
  const cells = [
    { label: 'OVERALL SHAPE',       text: summary.overallShape,       color: BLUE,  side: 'left' },
    { label: 'DEFENSIVE PATTERNS',  text: summary.defensivePatterns,  color: E,     side: 'right' },
    { label: 'ATTACKING THREATS',   text: summary.attackingThreats,   color: GREEN, side: 'left' },
    { label: 'SET PIECE NOTES',     text: summary.setPieceNotes,      color: AMBER, side: 'right' },
  ]

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionHeaderLabel}>TEAM OVERVIEW</Text>
          <Text style={s.sectionHeaderName}>{data.opposition}</Text>
          <Text style={s.sectionHeaderSub}>Opposition Scouting Report</Text>
        </View>
        {logoSrc && <Image style={s.sectionHeaderLogo} src={logoSrc} />}
      </View>

      <View style={s.content}>
        <View style={s.teamGrid}>
          {cells.map(({ label, text, color, side }) => (
            <View key={label} style={side === 'left' ? s.teamGridLeft : s.teamGridRight}>
              <CommentBlock label={label} text={text} color={color} />
            </View>
          ))}
        </View>
      </View>

      <Footer
        left="COACHING EYE · 18TH MAN"
        right={`${data.opposition} · Team Analysis`}
      />
    </Page>
  )
}

function PlayerPage({
  player,
  index,
  total,
  data,
  logoSrc,
}: {
  player: PlayerReport
  index: number
  total: number
  data: MatchReportData
  logoSrc?: string
}) {
  const { stats } = player
  const pageLabel = total > 1 ? `PLAYER ANALYSIS · ${index + 1} OF ${total}` : 'PLAYER ANALYSIS'

  return (
    <Page size="A4" style={s.page}>
      {/* Dark header */}
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionHeaderLabel}>{pageLabel}</Text>
          <Text style={s.sectionHeaderName}>{player.name}</Text>
          <Text style={s.sectionHeaderSub}>{player.position}</Text>
        </View>
        {logoSrc && <Image style={s.sectionHeaderLogo} src={logoSrc} />}
      </View>

      <View style={s.content}>
        {/* Stats */}
        <View style={s.statsRow}>
          {/* Attack */}
          <View style={s.statsColLeft}>
            <Text style={s.statsColHeading}>ATTACK</Text>
            <StatRow label="Carries"      value={stats.carries} />
            <StatRow label="Metres Made"  value={stats.metresMade} />
            <StatRow label="Line Breaks"  value={stats.lineBreaks} />
            <StatRow label="Offloads"     value={stats.offloads} />
            <StatRow label="Tries"        value={stats.tries} />
            <StatRow label="Try Assists"  value={stats.tryAssists} />
          </View>

          {/* Defence & Errors */}
          <View style={s.statsColRight}>
            <Text style={s.statsColHeading}>DEFENCE &amp; ERRORS</Text>
            <StatRow label="Tackles Made"    value={stats.tacklesMade} />
            <StatRow label="Missed Tackles"  value={stats.missedTackles} />
            <StatRow label="Handling Errors" value={stats.handlingErrors} />
            <StatRow label="Penalties"       value={stats.penalties} />
          </View>
        </View>

        <View style={s.divider} />

        {/* Comments */}
        <CommentBlock label="STRENGTHS"                  text={player.strengths}      color={GREEN} />
        <CommentBlock label="AREAS TO IMPROVE"           text={player.areasToImprove} color={AMBER} />
        <CommentBlock label="ACTION POINTS FOR TRAINING" text={player.actionPoints}   color={BLUE} />
      </View>

      <Footer
        left="COACHING EYE · 18TH MAN"
        right={`${data.opposition} · ${player.name}`}
      />
    </Page>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export function MatchReportPDF({
  data,
  logoSrc,
}: {
  data: MatchReportData
  logoSrc?: string
}) {
  const title =
    data.serviceType === 'match-review'
      ? `Match Review — ${data.opposition}`
      : `Opposition Scouting — ${data.opposition}`

  return (
    <Document title={title} author="18th Man Coaching Eye">
      <CoverPage data={data} logoSrc={logoSrc} />

      {data.serviceType === 'opposition-scouting' && data.teamSummary && (
        <TeamSummaryPage summary={data.teamSummary} data={data} logoSrc={logoSrc} />
      )}

      {data.players.map((player, i) => (
        <PlayerPage
          key={i}
          player={player}
          index={i}
          total={data.players.length}
          data={data}
          logoSrc={logoSrc}
        />
      ))}
    </Document>
  )
}
