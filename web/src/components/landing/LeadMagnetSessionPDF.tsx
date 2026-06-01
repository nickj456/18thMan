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

type AgeTier = 'mini' | 'youth' | 'senior'

function getAgeTier(ageGroup: string | null | undefined): AgeTier {
  if (!ageGroup) return 'senior'
  if (/U8|U10|Mini|U12/i.test(ageGroup)) return 'mini'
  if (/U14|U16/i.test(ageGroup)) return 'youth'
  return 'senior'
}

// ── Mini sessions (U8–U12): fun-first, game-based, short bursts ───────────────

const WEEKS_MINI: Week[] = [
  {
    number: 1,
    title: 'Ball Skills & Moving',
    focus: 'FUN FIRST',
    drills: [
      {
        title: 'Tag & Pass Warm-Up',
        duration: 10,
        description:
          'Pairs jog freely around the field. On the whistle, stop and make five fast passes before moving again. Everyone touches the ball from the very first minute.',
      },
      {
        title: 'Treasure Hunt Passing',
        duration: 15,
        description:
          'Two teams race to collect cones from the middle of the field. To pick up a cone, your team must complete three passes first. First team to collect five cones wins.',
      },
      {
        title: 'Try-Line Challenge',
        duration: 20,
        description:
          'Small-sided tag game on a short field. Every try is celebrated with a routine chosen by the player who scored. Coaches cheer every single try loudly.',
      },
      {
        title: 'Circle Debrief',
        duration: 10,
        description:
          'Players sit in a circle. Roll the ball around — when you catch it, say your name and one cool thing you tried today.',
      },
    ],
    coachNotes:
      "If the ball is being touched and players are smiling, this session is a success. Celebrate effort loudly and correct quietly. Energy is everything at this age.",
  },
  {
    number: 2,
    title: 'Chasing & Defending',
    focus: 'MOVEMENT',
    drills: [
      {
        title: 'Bulldogs',
        duration: 10,
        description:
          'Two defenders try to tag everyone crossing the field. Classic. A great instinctive intro to chasing and tracking a ball carrier.',
      },
      {
        title: 'Shadowing',
        duration: 15,
        description:
          'Pairs face each other 3m apart. One player leads, the other mirrors every movement. Switch roles on the whistle. Teaches tracking footwork in a fun, no-contact way.',
      },
      {
        title: 'Sharks & Dolphins',
        duration: 25,
        description:
          'Sharks defend, Dolphins attack using tags. Swap roles after every two tries. Keep it loose — the goal is chasing and being chased with enthusiasm.',
      },
      {
        title: 'Cool Down',
        duration: 10,
        description:
          'Player-led stretches. Ask the group: what did the best defenders do differently today?',
      },
    ],
    coachNotes:
      "Don't try to build a defensive line yet. The goal is to teach players to want to chase — that competitive instinct is the foundation everything else is built on.",
  },
  {
    number: 3,
    title: 'Running Hard',
    focus: 'ATTACK',
    drills: [
      {
        title: 'Reaction Ball',
        duration: 10,
        description:
          'Coach holds ball up. Players sprint toward coach, who then throws it left or right. Players react and race to catch it. Explosive and immediately fun.',
      },
      {
        title: 'Beat the Defender',
        duration: 20,
        description:
          '1v1 from 15m out. Ball carrier must use a step or a dummy to beat the defender to the line. Celebrate every clean break with the whole group.',
      },
      {
        title: '3v1 Attack',
        duration: 25,
        description:
          'Three attackers vs one defender on a short field. Attack must score within four passes. Numbers advantage builds confidence and quick decision-making.',
      },
      {
        title: 'Cool Down',
        duration: 10,
        description: 'Light stretches and a quick chat about what made the best runs work.',
      },
    ],
    coachNotes:
      "Praise the attempt at the step or dummy — even if it doesn't work. You're teaching kids to back themselves. That takes reps and a safe environment to try things.",
  },
  {
    number: 4,
    title: 'Mini Match Day',
    focus: 'CELEBRATION',
    drills: [
      {
        title: 'Favourite Drill Vote',
        duration: 10,
        description:
          "Players vote on their favourite drill from the four weeks and run it together as a warm-up. Their session, their call.",
      },
      {
        title: 'Skill Stations',
        duration: 20,
        description:
          'Three stations of 6 minutes each: passing relay race, try-line catch challenge, 1v1 tag. Rotate on the whistle.',
      },
      {
        title: 'Mini Tournament',
        duration: 25,
        description:
          'Equal teams, mini matches. Coaches celebrate every try from every team. Every player must touch the ball at least once each set.',
      },
      {
        title: 'Finish & Celebrate',
        duration: 10,
        description:
          'Coach gives every player one specific, personal compliment from the four weeks. Name it and mean it.',
      },
    ],
    coachNotes:
      "This session is a celebration. Four weeks of effort deserves a party. Your job today is chief cheerleader — let them play, cheer loudly, and finish on a high.",
  },
]

// ── Youth sessions (U14–U16): skill development, structured ──────────────────

const WEEKS_YOUTH: Week[] = [
  {
    number: 1,
    title: 'Ball Handling & Passing',
    focus: 'FUNDAMENTALS',
    drills: [
      {
        title: 'Dynamic Ball Warm-Up',
        duration: 10,
        description:
          'High knees, sidesteps, and explosive accelerations — every run finishes with a pass to the next player in line. High tempo from minute one.',
      },
      {
        title: 'Pressure Passing Grid',
        duration: 20,
        description:
          '8×8m grids of four. Flat, fast passes stationary first, then on the move. Progress to grids with a defender in the middle who can intercept. Raise the tempo when technique holds up.',
      },
      {
        title: 'Support Play Game',
        duration: 25,
        description:
          '4v3 across a short field. Ball carrier makes contact, offloads to a support runner who must call for the ball before receiving it. Rotate roles after each set. Reward the clean offload.',
      },
      {
        title: 'Cool Down',
        duration: 10,
        description:
          'Stretch and debrief. Players discuss: what makes a pass hard to catch? Build awareness of what they\'re receiving, not just sending.',
      },
    ],
    coachNotes:
      "Flat and fast is the message. If the ball is drifting back or ballooning upward, stop and fix it — that's the habit to break at this age before it becomes automatic.",
  },
  {
    number: 2,
    title: 'Defensive Shape',
    focus: 'DEFENCE',
    drills: [
      {
        title: 'Line Slide Warm-Up',
        duration: 10,
        description:
          "Six players in a line slide left and right on the coach's call, keeping a flat shape. Build speed over five minutes. Turn it into a competition — best line wins.",
      },
      {
        title: 'Flat Line Drill',
        duration: 20,
        description:
          'Two lines of six face each other at 20m. Attack walks forward, defence holds until the trigger and rushes up as one. Inside defender calls the line speed. Nobody rushes early.',
      },
      {
        title: 'Tackle Technique',
        duration: 20,
        description:
          'Pad work first: body position, low entry, leg drive, wrap. Then controlled 50% pace pairs. Build to 80%. Look for the wrap around the hips — not a shoulder charge.',
      },
      {
        title: 'Cool Down',
        duration: 15,
        description:
          'Ask players to explain why one person drifting out of the defensive line affects everyone else. Make sure they can articulate it.',
      },
    ],
    coachNotes:
      "Give them the language: \"hold\", \"slide\", \"up\". Make communication a practised skill, not an afterthought. A loud defensive line is a trusted one.",
  },
  {
    number: 3,
    title: 'Attack Plays',
    focus: 'ATTACK',
    drills: [
      {
        title: 'Quick Hands Circuit',
        duration: 10,
        description:
          'Ball movement circles, then quick hands from dummy half across a stationary line. Emphasise early calling and soft hands at pace.',
      },
      {
        title: 'Set-Piece Walk-Through',
        duration: 25,
        description:
          'Two plays from 30m out: a wide ball shift and a short-side wrap. Walk through each five times at half pace, then run at game speed. Roles assigned before every rep — nobody improvises.',
      },
      {
        title: 'Broken-Field Running',
        duration: 20,
        description:
          'Defenders release from behind as ball carriers identify space and run hard lines. Praise the step and the straighten into the gap.',
      },
      {
        title: 'Small-Sided Game',
        duration: 15,
        description:
          '5v5, full attack rules. Teams must call their play before each set begins. Penalise unannounced plays to lock in the habit.',
      },
    ],
    coachNotes:
      'Give the plays names that stick — "wide left", "short side", "dummy crash". Players who can call plays quickly in real games have internalised the structure. Build the vocabulary.',
  },
  {
    number: 4,
    title: 'Full Run Session',
    focus: 'APPLICATION',
    drills: [
      {
        title: 'Cue Review Warm-Up',
        duration: 10,
        description:
          'Rapid recap of the key cues from weeks 1–3. Passing warm-up with cues called aloud by players throughout. Make it loud.',
      },
      {
        title: 'Defensive Revisit',
        duration: 15,
        description:
          'Run the flat line drill. Look for improvement in communication and line speed compared to Week 2. Name the improvement out loud so players hear it.',
      },
      {
        title: 'Attack Play Run-Through',
        duration: 20,
        description:
          'Both plays from Week 3, building from 50% to full pace. Add live defenders progressively — start passive, build to full resistance.',
      },
      {
        title: 'Full Training Game',
        duration: 20,
        description:
          'Full squad game. Coaches observe and take notes. Minimal intervention. Let them apply what they have learned. Post-game debrief: two points only.',
      },
    ],
    coachNotes:
      "You've given them building blocks. Now step back and let them use them. The game will tell you what needs work in the next block — trust it to do that.",
  },
]

// ── Senior sessions (U18–Open Age): full tactical complexity ──────────────────

const WEEKS_SENIOR: Week[] = [
  {
    number: 1,
    title: 'Ball Handling & Passing',
    focus: 'FUNDAMENTALS',
    drills: [
      {
        title: 'Warm-Up',
        duration: 10,
        description:
          'Dynamic stretches progressing to two-touch ball work in pairs. Players loosen up with the ball in hand from the start — no static stretching.',
      },
      {
        title: 'Passing Grid',
        duration: 20,
        description:
          '5×5m grids. Pass across the grid — receiving, setting, and offloading while stationary then on the move. Flat passes, heads up. Add a passive defender once technique holds.',
      },
      {
        title: 'Hit-Up & Offload Game',
        duration: 30,
        description:
          '4v3 attack vs defence. Ball carrier makes contact, offloads to support. Defensive line resets after each play. Reward the offload — make it the metric of the drill.',
      },
      {
        title: 'Cool Down',
        duration: 10,
        description:
          'Light stretch and team debrief. Review the key passing cues. Players name one technical thing they will focus on next session.',
      },
    ],
    coachNotes:
      "Keep the grid tight early on — too much space hides poor technique. Push players to call for the ball before they receive it. Loud communication is a skill, not a nice-to-have.",
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
          "Five players in a line slide left and right on the coach's call, working on defensive footwork and communication. Progress the speed every two minutes.",
      },
      {
        title: 'Flat Line Drill',
        duration: 20,
        description:
          'Two lines of six face each other across 20m. Attack walks or jogs forward, defence holds position until the trigger, then rushes up together. Penalise any broken line — it is everyone\'s problem.',
      },
      {
        title: 'Tackle Technique',
        duration: 20,
        description:
          'Low pad work first — body position and leg drive. Then live tackle reps in pairs at half pace, building to 80%. Focus on the wrap and driving through the contact, not the crash.',
      },
      {
        title: 'Conditioned Game',
        duration: 20,
        description:
          '6v6 touch, but the defence must be flat and communicate every set. Turnover if the defensive line is broken before the tackle is made.',
      },
    ],
    coachNotes:
      "The line is the team's identity. If one player is late, the whole structure falls apart — and everyone feels it. Make that the message this session. Own the line, own the game.",
  },
  {
    number: 3,
    title: 'Attack Plays & Structure',
    focus: 'ATTACK',
    drills: [
      {
        title: 'Warm-Up: Quick Hands',
        duration: 10,
        description:
          'Ball movement circles, quick hands from dummy half, and a five-pass sequence to open into space. High tempo, encourage early calls and soft hands at full speed.',
      },
      {
        title: 'Set-Piece Play',
        duration: 25,
        description:
          'Walk through your two main attacking plays from 20m out. First rep slow, then game-speed. Assign roles before every rep — hooker, halves, dummy runners. Run each play five times minimum.',
      },
      {
        title: 'Broken-Field Running',
        duration: 20,
        description:
          'Defenders chase from behind as ball carriers find space and run hard lines. Encourage the step, the straighten, and changes of direction. Reward players who back themselves.',
      },
      {
        title: 'Small-Sided Game',
        duration: 20,
        description:
          '5v5 on a short field. Four tackles then attack. Teams call their plays from the line before each set starts. No unannounced plays.',
      },
    ],
    coachNotes:
      'Don\'t just run plays — give your players language. "Squeeze left", "open side", "wrap right". If they can talk it, they can execute it under pressure when it matters.',
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
          'Revisit the key cues from weeks 1–3. Ball warm-up with a passing focus. Players call cues aloud throughout — make it loud and deliberate.',
      },
      {
        title: 'Defensive Line Revisit',
        duration: 15,
        description:
          'Run the flat line drill from Week 2. Look for improvement in communication and line speed. Name the improvement aloud — players need to hear the progress.',
      },
      {
        title: 'Attack Play Run-Through',
        duration: 20,
        description:
          'Both set-piece plays from Week 3 at game speed. Add live defenders progressively — start at 50%, build to full pace. Players call every play.',
      },
      {
        title: 'Full Training Game',
        duration: 30,
        description:
          'Full squad game, all rules. Coaches observe and take notes. Minimal intervention during the game — let the players apply everything they have built. Focused debrief after.',
      },
    ],
    coachNotes:
      "This is the reward session. Trust what you've built over four weeks. Let them play — step back and watch. Your job this session is to observe, not to fix.",
  },
]

const WEEKS_BY_TIER: Record<AgeTier, Week[]> = {
  mini: WEEKS_MINI,
  youth: WEEKS_YOUTH,
  senior: WEEKS_SENIOR,
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  logoSrc?: string
  weekNumber: number
  ageGroup?: string | null
}

export function LeadMagnetSessionPDF({ logoSrc, weekNumber, ageGroup }: Props) {
  const tier = getAgeTier(ageGroup)
  const week = WEEKS_BY_TIER[tier][weekNumber - 1]
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
            {ageGroup ? (
              <View style={s.docMetaItem}>
                <View style={s.docMetaDot} />
                <Text style={s.docMetaText}>{ageGroup}</Text>
              </View>
            ) : null}
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
