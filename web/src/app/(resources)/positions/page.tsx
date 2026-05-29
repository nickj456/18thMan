import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Rugby League Positions Guide',
  description: 'A coach\'s breakdown of every rugby league position — what each role demands, what to look for in training, and the key areas to develop in your players.',
  openGraph: {
    title: 'Rugby League Positions Guide — 18th Man',
    description: 'A coach\'s breakdown of every rugby league position — what each role demands, what to look for in training, and the key areas to develop in your players.',
  },
}

interface Position {
  number: number | string
  name: string
  shortName: string
  area: 'back' | 'half' | 'forward'
  coachingFocus: string
  responsibilities: string[]
  developmentTip: string
}

const positions: Position[] = [
  {
    number: 1,
    name: 'Fullback',
    shortName: 'FB',
    area: 'back',
    coachingFocus: 'Decision-making and field vision',
    responsibilities: [
      'Sweep defence — constantly reading the line and plugging gaps on either side of the ruck.',
      'Kick receipt — catch everything on the full and work in a pendulum with the wingers to cover the back field.',
      'Organise the defensive line — the fullback sees more of the field than anyone. Coach them to call splits, point, and direct.',
      'Link play — ball skills under pressure, dummy half reads, and the ability to join the line at pace.',
      'Voice — the fullback should be your loudest communicator. If they\'re quiet, they\'re not doing their job.',
    ],
    developmentTip: 'Drill kick receipt under pressure early. A fullback who fumbles routine kicks costs you field position every game.',
  },
  {
    number: '2 & 5',
    name: 'Wingers',
    shortName: 'WG',
    area: 'back',
    coachingFocus: 'Effort, positioning, and edge execution',
    responsibilities: [
      'Carry with purpose — strong, direct runs that earn tough metres and set clean plays-the-ball.',
      'Back-field cover — pendulum movement with the fullback. One pushes wide, one covers in-field. Teach this pattern relentlessly.',
      'Defensive line lead — wingers must push their line forward and mirror their centre in the defensive pattern.',
      'Connection — the winger-centre relationship is the edge. Constant communication between the two is non-negotiable.',
      'Compete at kick receipt — don\'t coach wingers to simply field kicks. Coach them to contest.',
    ],
    developmentTip: 'Work on the winger-centre defensive pairing as a unit. They should know each other\'s tendencies instinctively.',
  },
  {
    number: '3 & 4',
    name: 'Centres',
    shortName: 'CTR',
    area: 'back',
    coachingFocus: 'One-on-one dominance and edge leadership',
    responsibilities: [
      'Win the 1v1 — the centre\'s primary job in attack is to beat their opposite number. Develop their footwork, fend, and step.',
      'Organise the edge — centres need to be vocal, marshalling the winger and communicating with the halves.',
      'Quality carries — controlled play-the-balls set the pace for your whole set. Demand this standard from your centres.',
      'Shut down the edge in defence — force a drop ball or a chip-kick. Winning that contest can swing a game.',
      'Halves relationship — centres need to trust when the ball is coming and know their role in the halves\' play selection.',
    ],
    developmentTip: 'If your centre can\'t beat a one-on-one, your edge attack will stall. Prioritise evasion skills in training.',
  },
  {
    number: '6 & 7',
    name: 'Halfback & Five-Eighth',
    shortName: '½ & 5/8',
    area: 'half',
    coachingFocus: 'Game management and tactical control',
    responsibilities: [
      'Play on the front foot — halves who play behind the line give the defence time to reset. Demand they attack the line.',
      'Communicate constantly — clear, calm instructions to every player around them. Under pressure is when it matters most.',
      'Short-side awareness — coach them to play together around the ruck, recognising when the short side is on.',
      'Last-tackle control — the 4th and 5th tackle are owned by the halves. They should have a plan before they happen.',
      'Tactical kicking — not just bombing it down field. Grubbers, chips, cross-field kicks. Variety creates pressure.',
    ],
    developmentTip: 'Halves who only think one play ahead will be read quickly. Develop their ability to set traps across multiple tackles.',
  },
  {
    number: 9,
    name: 'Hooker',
    shortName: 'HK',
    area: 'forward',
    coachingFocus: 'Ruck speed and middle leadership',
    responsibilities: [
      'Control ruck speed — the hooker sets the tempo of the whole set. Slow service kills momentum before the play starts.',
      'Lead the middle — roll the ruck, drive line speed in defence, and set the standard for your forward group.',
      'Defence — dual contact, lock and squeeze. The hooker should be the hardest worker in the defensive line.',
      'Service quality — tight, accurate spirals and a consistent six o\'clock release. Inconsistent passing disrupts your halves.',
      'Short-side management — always counting numbers. A hooker who spots the short-side opportunity changes games.',
    ],
    developmentTip: 'Dummy half skills are easily neglected at junior level. Invest time — a strong hooker is a genuine point of difference.',
  },
  {
    number: '11 & 12',
    name: 'Second Row',
    shortName: '2R',
    area: 'forward',
    coachingFocus: 'Edge attack and defensive width',
    responsibilities: [
      'Target the halves — second rowers running under lines at the opposition half create the most damage in the middle third.',
      'Tackle with intent — physicality and technique combined. Win your individual contest.',
      'Kick chase leadership — when the halves kick, a second rower leads the chase and recruits a middle to form the wall.',
      'Hold the width — second rows are the bridge between the middle and the edge. Teach them when to hold and when to drift.',
      'Halves support — second rowers need to read their halves and offer reliable carries on cue.',
    ],
    developmentTip: 'Running under-lines is a skill. Drill the timing and the angle — a second rower who can draw two defenders and pass is invaluable.',
  },
  {
    number: '8, 10 & 13',
    name: 'Middle Forwards',
    shortName: 'FWD',
    area: 'forward',
    coachingFocus: 'Dominance, physicality, and skill under fatigue',
    responsibilities: [
      'Run hard and run straight — hard metres through the middle set the platform for everything else. Bumpers, leg speed, late footwork.',
      'Dual contact in defence — stop, lock, and squeeze. Coach your middles to defend as a unit, not individually.',
      'Combination plays — combos with the hooker and other forwards create space. The lock is the link between your forwards and backs.',
      'Hustle — kick chase, go-get, and tie in. Effort has to be unconditional.',
      'Skill under fatigue — middles are on the field for long stretches. Their skills have to hold up when tired.',
    ],
    developmentTip: 'The lock (13) is your most complete forward. Develop their pass, their read, and their leadership — they connect every unit on the field.',
  },
]

const areaColour: Record<Position['area'], string> = {
  back: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  half: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  forward: 'bg-[#e8560a]/10 border-[#e8560a]/20 text-[#e8560a]',
}

const areaLabel: Record<Position['area'], string> = {
  back: 'Backs',
  half: 'Halves',
  forward: 'Forwards',
}

const numberColour: Record<Position['area'], string> = {
  back: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  half: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  forward: 'bg-[#e8560a]/20 text-[#e8560a] border-[#e8560a]/30',
}

export default function PositionsPage() {
  const grouped = [
    { label: 'Backs', area: 'back' as const },
    { label: 'Halves', area: 'half' as const },
    { label: 'Forwards', area: 'forward' as const },
  ]

  return (
    <div className="max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="app-heading text-2xl">Rugby League Positions Guide</h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
          A coach&apos;s breakdown of every position — what the role demands, the key responsibilities
          to develop, and a coaching tip for each. Use this alongside your{' '}
          <Link href="/drills" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            drill library
          </Link>{' '}
          to target your training at specific positions.
        </p>
      </div>

      {/* Position groups */}
      {grouped.map(({ label, area }) => {
        const group = positions.filter(p => p.area === area)
        return (
          <div key={area} className="space-y-4">
            {/* Group header */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${areaColour[area]}`}>
                {label}
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Position cards */}
            <div className="space-y-4">
              {group.map(pos => (
                <div key={pos.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 font-bold text-sm ${numberColour[pos.area]}`}>
                      {pos.shortName}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-white">{pos.name}</h2>
                        <span className="text-xs text-zinc-500">#{pos.number}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        <span className="text-zinc-400 font-medium">Coaching focus:</span> {pos.coachingFocus}
                      </p>
                    </div>
                  </div>

                  {/* Responsibilities */}
                  <div className="px-5 py-4 space-y-2">
                    <ul className="space-y-2.5">
                      {pos.responsibilities.map((r, i) => (
                        <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                            area === 'back' ? 'bg-indigo-500' : area === 'half' ? 'bg-amber-500' : 'bg-[#e8560a]'
                          }`} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Coaching tip */}
                  <div className={`mx-5 mb-4 px-4 py-3 rounded-lg border text-xs leading-relaxed ${
                    area === 'back'
                      ? 'bg-indigo-500/5 border-indigo-500/15 text-indigo-300/80'
                      : area === 'half'
                      ? 'bg-amber-500/5 border-amber-500/15 text-amber-300/80'
                      : 'bg-[#e8560a]/5 border-[#e8560a]/15 text-[#e8560a]/80'
                  }`}>
                    <span className="font-semibold">Coaching tip: </span>
                    {pos.developmentTip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Footer CTA */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Looking for drills to develop these skills?</p>
        <p className="text-sm text-zinc-500">
          Browse the{' '}
          <Link href="/drills" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            drill library
          </Link>{' '}
          or ask the{' '}
          <Link href="/chat/ai" className="text-amber-400 hover:text-amber-300 transition-colors">
            AI coaching assistant
          </Link>{' '}
          for position-specific session ideas.
        </p>
      </div>
    </div>
  )
}
