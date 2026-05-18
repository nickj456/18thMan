import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// ── Palette ───────────────────────────────────────────────────────────────────
const E      = '#e8560a'   // ember brand
const E_SOFT = '#fff2ed'   // ember tint for backgrounds
const NAVY   = '#0d1117'   // near-black headers
const DARK   = '#1a2332'   // dark text
const MID    = '#4b5563'   // body copy
const MUTED  = '#9ca3af'   // secondary labels
const BORDER = '#e8eaed'   // hairlines
const WHITE  = '#ffffff'
const AMBER  = '#fffbeb'   // duration badge bg
const AMBER_TEXT = '#92400e'

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // Page
  page: {
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontSize: 10,
    color: DARK,
  },

  // ── Footer (fixed) ─────────────────────────────────────────────────────────
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
  footerBrand: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: E,
    letterSpacing: 1.8,
  },
  footerPage: {
    fontSize: 6.5,
    color: MUTED,
  },

  // ── Cover header ───────────────────────────────────────────────────────────
  coverHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 44,
    paddingTop: 48,
    paddingBottom: 24,
    marginBottom: 0,
  },
  coverHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImg: {
    width: 38,
    height: 38,
  },
  brandText: {
    flexDirection: 'column',
  },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: WHITE,
    letterSpacing: 2.5,
  },
  brandTagline: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: E,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeBadgeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: WHITE,
    letterSpacing: 1,
  },

  // Title block inside dark header
  coverDivider: {
    height: 1,
    backgroundColor: '#2a3444',
    marginBottom: 18,
  },
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    color: WHITE,
    lineHeight: 1.15,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  docMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: E,
  },
  docMetaText: {
    fontSize: 8.5,
    color: MUTED,
    letterSpacing: 0.3,
  },

  // ── Page body padding ──────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 44,
    paddingTop: 24,
  },

  // ── Intro ──────────────────────────────────────────────────────────────────
  introPara: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.65,
    marginBottom: 20,
  },

  // ── Week block ─────────────────────────────────────────────────────────────
  weekBlock: {
    marginBottom: 24,
  },

  // Week header: large number + title side by side
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 0,
  },
  weekNumBlock: {
    backgroundColor: E,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    flexShrink: 0,
  },
  weekNum: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    color: WHITE,
    lineHeight: 1,
  },
  weekNumLabel: {
    fontSize: 6,
    color: WHITE,
    letterSpacing: 1,
    opacity: 0.7,
    marginTop: 2,
  },
  weekTitleBlock: {
    backgroundColor: NAVY,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  weekTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: WHITE,
    letterSpacing: 0.2,
  },
  focusTag: {
    borderWidth: 1,
    borderColor: '#3a4555',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  focusTagText: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.8,
  },

  // ── Drill list ─────────────────────────────────────────────────────────────
  drillList: {
    borderLeftWidth: 2,
    borderLeftColor: BORDER,
    borderLeftStyle: 'solid',
    marginLeft: 0,
    paddingLeft: 0,
    marginTop: 0,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  drillStep: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: E_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 10,
    marginTop: 1,
  },
  drillStepText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: E,
  },
  drillContent: {
    flex: 1,
    marginRight: 10,
  },
  drillTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: DARK,
    marginBottom: 3,
    lineHeight: 1.2,
  },
  drillDesc: {
    fontSize: 8.5,
    color: MID,
    lineHeight: 1.55,
  },
  durationPill: {
    backgroundColor: AMBER,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: AMBER_TEXT,
  },

  // ── Coach notes callout ────────────────────────────────────────────────────
  coachNotes: {
    backgroundColor: NAVY,
    borderRadius: 5,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  coachNotesAccent: {
    width: 3,
    backgroundColor: E,
    borderRadius: 2,
    flexShrink: 0,
  },
  coachNotesInner: {
    flex: 1,
  },
  coachNotesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: E,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  coachNotesText: {
    fontSize: 9,
    color: '#c9d1dc',
    lineHeight: 1.6,
    fontFamily: 'Helvetica-Oblique',
  },

  // ── Section totals strip ───────────────────────────────────────────────────
  sessionTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  sessionTotalLabel: {
    fontSize: 7.5,
    color: MUTED,
  },
  sessionTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: DARK,
  },

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },

  // ── CTA box ────────────────────────────────────────────────────────────────
  ctaBox: {
    backgroundColor: NAVY,
    borderRadius: 8,
    padding: 24,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ctaLeft: {
    flex: 1,
  },
  ctaEyebrow: {
    fontSize: 6.5,
    color: E,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  ctaTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: WHITE,
    lineHeight: 1.3,
    marginBottom: 6,
  },
  ctaBody: {
    fontSize: 8.5,
    color: MUTED,
    lineHeight: 1.55,
  },
  ctaRight: {
    alignItems: 'center',
    flexShrink: 0,
  },
  ctaUrlBox: {
    backgroundColor: E,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaUrlText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: WHITE,
    letterSpacing: 0.5,
  },
  ctaSubtext: {
    fontSize: 7,
    color: '#3a4555',
    marginTop: 5,
    textAlign: 'center',
  },
})

// ── Data ──────────────────────────────────────────────────────────────────────

interface DrillRow {
  title: string
  duration: number
  description: string
}

interface Week {
  number: number
  title: string
  focus: string
  drills: DrillRow[]
  coachNotes: string
}

const WEEKS: Week[] = [
  {
    number: 1,
    title: 'Ball Handling & Passing',
    focus: 'FUNDAMENTALS',
    drills: [
      {
        title: 'Warm-Up',
        duration: 10,
        description:
          'Dynamic stretches and a light jog, progressing to two-touch ball work in pairs. Players loosen up with the ball in hand from the start.',
      },
      {
        title: 'Passing Grid',
        duration: 20,
        description:
          '5×5m grids. Players pass across the grid — receiving, setting, and offloading while stationary then on the move. Focus on flat passes and keeping heads up.',
      },
      {
        title: 'Hit-Up & Offload Game',
        duration: 30,
        description:
          '4v3 attack vs defence. Ball carrier makes contact, offloads to support player. Defensive line resets after each play. Reward the offload.',
      },
      {
        title: 'Cool Down',
        duration: 10,
        description:
          'Light stretch and team debrief. Review the key passing cues from the session. Ask players to name one thing they improved.',
      },
    ],
    coachNotes:
      'Keep the grid tight early on — too much space hides poor technique. Push players to call for the ball before they receive it. Loud communication is a skill.',
  },
  {
    number: 2,
    title: 'Defensive Shape',
    focus: 'DEFENCE',
    drills: [
      {
        title: 'Warm-Up: Defensive Slide',
        duration: 10,
        description:
          "Five players in a line slide left and right on the coach's call, working on defensive footwork and communication. Progress the speed over 5 minutes.",
      },
      {
        title: 'Flat Line Drill',
        duration: 20,
        description:
          'Two lines of six face each other across 20m. Attack walks or jogs forward, defence holds position until the trigger, then rushes up together. Penalise any broken line.',
      },
      {
        title: 'Tackle Technique',
        duration: 20,
        description:
          'Low pad work first — body position and leg drive. Then live tackle reps in pairs at half pace. Focus on the wrap and driving through the contact.',
      },
      {
        title: 'Conditioned Game',
        duration: 20,
        description:
          '6v6 touch, but the defence must be flat and communicate each set. Turn the ball over if the defensive line is broken before the tackle.',
      },
    ],
    coachNotes:
      "The line is the team's identity. If one player is late, the whole structure falls apart — and everyone feels it. Make that the message this session.",
  },
  {
    number: 3,
    title: 'Attack Plays',
    focus: 'ATTACK',
    drills: [
      {
        title: 'Warm-Up: Quick Hands',
        duration: 10,
        description:
          'Ball movement circles, quick hands from dummy half, and a five-pass sequence to open into space. High tempo, encourage early calls.',
      },
      {
        title: 'Set-Piece Play',
        duration: 25,
        description:
          'Walk through your two main attacking plays from 20m out. First rep slow, then game-speed. Assign roles clearly — hooker, halves, dummy runners. Run each play five times.',
      },
      {
        title: 'Broken-Field Running',
        duration: 20,
        description:
          'Defenders chase from behind as ball carriers find space and run hard lines. Encourage the step and changes in direction. Reward players who back themselves.',
      },
      {
        title: 'Small-Sided Game',
        duration: 20,
        description:
          '5v5 on a short field. Four tackles then attack. Encourage teams to call their plays from the line before each set starts.',
      },
    ],
    coachNotes:
      'Don\'t just run plays — give your players language. "Squeeze left", "open side", "wrap". If they can talk it, they can execute it under pressure.',
  },
  {
    number: 4,
    title: 'Full Run Session',
    focus: 'APPLICATION',
    drills: [
      {
        title: 'Warm-Up: Cue Review',
        duration: 10,
        description:
          'Revisit the key cues from weeks 1–3. Ball warm-up with a passing focus. Players call cues aloud as they work — make it loud and deliberate.',
      },
      {
        title: 'Defensive Line Revisit',
        duration: 15,
        description:
          'Run through the flat line drill from Week 2. Look for improvement in communication and line speed. Compare to how they looked four weeks ago.',
      },
      {
        title: 'Attack Play Run-Through',
        duration: 20,
        description:
          'Run through both set-piece plays from Week 3 at game speed. Add live defenders progressively — start at 50%, then to full pace. Players call the plays.',
      },
      {
        title: 'Full Training Game',
        duration: 30,
        description:
          'Full squad game, all rules. Coaches observe and take notes, minimal intervention during the game. Let the players apply everything. Debrief afterwards.',
      },
    ],
    coachNotes:
      'This is the reward session. Trust what you\'ve built over four weeks. Let them play — step back and watch. Your job this session is to observe, not fix.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  logoSrc?: string
  weekNumber: number
}

export function LeadMagnetSessionPDF({ logoSrc, weekNumber }: Props) {
  const week = WEEKS[weekNumber - 1]
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const totalMins = week.drills.reduce((sum, d) => sum + d.duration, 0)

  return (
    <Document
      title={`Week ${weekNumber} — ${week.title}`}
      author="18th Man"
      subject="Free Rugby League Session Plan"
      creator="18th Man"
    >
      <Page size="A4" style={s.page}>

        {/* ── Fixed footer ─────────────────────────────────────── */}
        <View fixed style={s.footer}>
          <Text style={s.footerBrand}>18TH MAN — RUGBY LEAGUE COACHING PLATFORM</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

        {/* ── Cover header ─────────────────────────────────────── */}
        <View style={s.coverHeader}>
          {/* Brand row */}
          <View style={s.coverHeaderTop}>
            <View style={s.brandLockup}>
              {logoSrc && <Image src={logoSrc} style={s.logoImg} />}
              <View style={s.brandText}>
                <Text style={s.brandName}>18TH MAN</Text>
                <Text style={s.brandTagline}>RUGBY LEAGUE COACHING PLATFORM</Text>
              </View>
            </View>
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText}>FREE RESOURCE</Text>
            </View>
          </View>

          {/* Title */}
          <View style={s.coverDivider} />
          <Text style={s.docTitle}>Week {weekNumber} of 4{'\n'}{week.title}</Text>
          <View style={s.docMeta}>
            <View style={s.docMetaItem}>
              <View style={s.docMetaDot} />
              <Text style={s.docMetaText}>4-Week Training Plan</Text>
            </View>
            <View style={s.docMetaItem}>
              <View style={s.docMetaDot} />
              <Text style={s.docMetaText}>{totalMins} Minutes</Text>
            </View>
            <View style={s.docMetaItem}>
              <View style={s.docMetaDot} />
              <Text style={s.docMetaText}>{today}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ─────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Week block */}
          <View style={s.weekBlock} wrap={false}>

            {/* Week header */}
            <View style={s.weekHeaderRow}>
              <View style={s.weekNumBlock}>
                <Text style={s.weekNum}>{week.number}</Text>
                <Text style={s.weekNumLabel}>WEEK</Text>
              </View>
              <View style={s.weekTitleBlock}>
                <Text style={s.weekTitle}>{week.title}</Text>
                <View style={s.focusTag}>
                  <Text style={s.focusTagText}>{week.focus}</Text>
                </View>
              </View>
            </View>

            {/* Drill list */}
            <View style={s.drillList}>
              {week.drills.map((drill, i) => (
                <View key={i} style={s.drillRow}>
                  <View style={s.drillStep}>
                    <Text style={s.drillStepText}>{i + 1}</Text>
                  </View>
                  <View style={s.drillContent}>
                    <Text style={s.drillTitle}>{drill.title}</Text>
                    <Text style={s.drillDesc}>{drill.description}</Text>
                  </View>
                  <View style={s.durationPill}>
                    <Text style={s.durationText}>{drill.duration} min</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Session total */}
            <View style={s.sessionTotal}>
              <Text style={s.sessionTotalLabel}>Total session time:</Text>
              <Text style={s.sessionTotalValue}>{totalMins} min</Text>
            </View>

            {/* Coach notes */}
            <View style={s.coachNotes}>
              <View style={s.coachNotesAccent} />
              <View style={s.coachNotesInner}>
                <Text style={s.coachNotesLabel}>COACH NOTES</Text>
                <Text style={s.coachNotesText}>{week.coachNotes}</Text>
              </View>
            </View>

          </View>

          {/* CTA */}
          <View style={s.ctaBox}>
            <View style={s.ctaLeft}>
              <Text style={s.ctaEyebrow}>FREE FOR ALL COACHES</Text>
              <Text style={s.ctaTitle}>Design your own drills.{'\n'}Plan sessions with AI.</Text>
              <Text style={s.ctaBody}>
                18th Man is the coaching platform built for grassroots rugby league.
                Create unlimited drills, plan training with AI assistance, and share
                what works with coaches across the game.
              </Text>
            </View>
            <View style={s.ctaRight}>
              <View style={s.ctaUrlBox}>
                <Text style={s.ctaUrlText}>18thman.app</Text>
              </View>
              <Text style={s.ctaSubtext}>No credit card needed</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}
