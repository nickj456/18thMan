import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fundamental Skills Guide — Rugby League',
  description: 'How to teach the core rugby league skills — grip, catch and pass, draw and pass (2v1), and tackle technique. Coaching points, technique breakdowns, and the why behind each.',
  openGraph: {
    title: 'Rugby League Fundamental Skills Guide — 18th Man',
    description: 'How to teach the core rugby league skills — grip, catch and pass, draw and pass (2v1), and tackle technique. Coaching points, technique breakdowns, and the why behind each.',
  },
}

interface TechniquePoint {
  how: string
  why: string
}

interface SkillSection {
  id: string
  title: string
  subtitle: string
  intro: string
  phases: {
    label: string
    points: TechniquePoint[]
  }[]
  coachingNote: string
}

const skills: SkillSection[] = [
  {
    id: 'grip-catch-pass',
    title: 'Grip, Catch & Pass',
    subtitle: 'The most-executed skill in the game',
    intro: 'Every attacking set in rugby league involves multiple catch and pass sequences. A player who can receive the ball cleanly and deliver it accurately under pressure is worth their weight in gold. Teach this skill in three distinct phases — grip, catch, then pass — before combining them.',
    phases: [
      {
        label: 'Grip',
        points: [
          {
            how: 'Carry the ball with two hands at all times. Thumbs on top, fingers spread underneath, pull thumbs back into the ball.',
            why: 'Two hands gives the player every option — run, pass, kick, or offload — without telegraphing their intention to the defence.',
          },
          {
            how: 'The grip should feel firm but not tight. The ball sits in the fingers, not the palms.',
            why: 'A palm grip restricts wrist movement and makes accurate passing much harder. Finger control gives players the ability to weight and direct the ball.',
          },
        ],
      },
      {
        label: 'Catch',
        points: [
          {
            how: 'Hands up and in front of the body, thumbs in close, fingers spread. Elbows off the chest, arms flexed. Catch the ball in the hands — away from the chest.',
            why: 'Catching away from the chest means players can adjust to high or low passes. A chest catch gives no margin for error.',
          },
          {
            how: 'Watch the ball all the way into the hands. Eyes on the ball, not on the defence.',
            why: 'The most common catch error is looking up too early. The ball has to be watched right into the hands before the player shifts their focus.',
          },
        ],
      },
      {
        label: 'Pass',
        points: [
          {
            how: 'Start the ball from outside the hip on the opposite side to the direction of the pass. The ball travels underneath the body — not around it. Point the ball toward the ground (thumbs and fingers down) at the start of the movement.',
            why: 'Starting outside the hip generates power from the shoulders and arms. If the ball travels under the body there is much less margin for error — an early release goes low, a late release goes high, but both still travel toward the target. A ball carried around the body will go forward if released early and behind the receiver if released late.',
          },
          {
            how: 'Keep feet and hips square down the field throughout the pass. Pass off the outside leg — if passing left, right foot is forward.',
            why: 'Square hips force defenders to make a decision. A player who turns their hips when passing tells the defence exactly what is coming and takes themselves out of the play.',
          },
          {
            how: 'Follow through with the arms toward the receiver. Release the ball with no rotation. Weight the ball so it arrives at the receiver\'s eyes — travelling upward as it reaches them.',
            why: 'A spinning pass is hard to catch clean, especially under pressure. A ball arriving at eye height means the receiver can catch it with clear sightlines on the defence in front of them.',
          },
        ],
      },
    ],
    coachingNote: 'Teach each phase in isolation before combining them. Don\'t move to the next coaching point until the current one is being executed consistently. Small-sided passing games are the best way to test whether the skill holds up under pressure.',
  },
  {
    id: 'draw-and-pass',
    title: 'Draw & Pass — 2v1',
    subtitle: 'Creating an advantage and using it',
    intro: 'The 2v1 is the foundation of all attacking play in rugby league. Every time a player beats their man or a defender is drawn in, a 2v1 exists somewhere on the field. Coaches who develop players with the ability to recognise and execute 2v1s will see their attack improve at every level.',
    phases: [
      {
        label: 'Ball Carrier',
        points: [
          {
            how: 'First movements are straight — attack the inside shoulder of the defender at speed. Keep two hands on the ball at all times.',
            why: 'A straight line forces the defender to commit to a decision. Two hands creates doubt — the defender cannot read pass or run.',
          },
          {
            how: 'Slow down as the defender commits or turns to make the tackle. Fast then slow — not slow then fast.',
            why: 'Slowing down as the defender commits gives the best opportunity to deliver an accurate, catchable pass. A ball thrown at full pace is hard to control for the support runner.',
          },
          {
            how: 'Make the pass no more than a couple of metres from the defender. Pass off the outside leg — if passing left, right foot is forward, feet and hips square to the try line.',
            why: 'Too early a pass and the defender recovers. Too late and the tackle is made. Getting close before passing fixes the defender and gives the support runner the clearest possible run.',
          },
        ],
      },
      {
        label: 'Support Runner',
        points: [
          {
            how: 'Start opposite to the ball carrier. Come into the play slowly at first — hold the defender square for as long as possible. Slow then fast.',
            why: 'A support runner who attacks the hole too early gives the defender time to cover both options. Holding up forces the defender to stay honest before committing.',
          },
          {
            how: 'When the ball carrier prepares to pass, that is the cue to change direction and accelerate into the hole at speed. Aim for the space closest to the ball carrier — draw a line between the two defenders and hit the near side.',
            why: 'Accelerating late maximises the angle and speed of attack through the hole. A genuine change of direction — not a soft drift — is what turns a 2v1 into metres or points.',
          },
        ],
      },
    ],
    coachingNote: 'Most players learn the 2v1 too passively — they drift rather than commit. The ball carrier needs to genuinely threaten the line, and the support runner needs to genuinely threaten the hole. Both need to believe they are the primary attacking threat for the skill to work.',
  },
  {
    id: 'tackle-technique',
    title: 'Front-On Tackle Technique',
    subtitle: 'Defence built on attitude and technique',
    intro: 'Good defence starts with attitude — the belief that every tackle can be made. Technique is what gives that belief a foundation. A player with great attitude and poor technique will get hurt. A player with great technique and poor attitude will miss tackles. Coach both.',
    phases: [
      {
        label: 'Attitude & Target',
        points: [
          {
            how: 'The defender\'s job begins before contact. Body square to the attacking runner, eyes up, read the play in front — not just the ball carrier.',
            why: 'Most defenders only watch the play-the-ball. Looking up and adjusting early means the defender is always in the right position before the tackle situation arrives.',
          },
          {
            how: 'Target the bottom of the ball, the ball carrier\'s belly button, or the base of their arm. This is the body\'s centre of gravity.',
            why: 'Targeting the centre of gravity is the most effective point of contact for a front-on tackle. Too high and the ball carrier stays on their feet. Too low and the defender loses control of the tackle.',
          },
        ],
      },
      {
        label: 'Reaction Zone & Drop',
        points: [
          {
            how: 'Stay upright for as long as possible — do not drop early. Get one foot forward in the reaction zone, feet and hips square to the target.',
            why: 'Dropping too early gives the ball carrier time to step or change direction. Staying upright means the defender can shift if the ball carrier moves.',
          },
          {
            how: 'Drop the hips to lower the shoulder below the ball carrier\'s shoulders. Back flat, eyes up. Arms and elbows in close to the chest at shoulder width.',
            why: 'A flat back protects the defender and generates power. Arms close to the chest signal where contact will be made and prepare for a clean hit.',
          },
        ],
      },
      {
        label: 'Drive & Lock On',
        points: [
          {
            how: 'Lead with the head tight to the target zone, eyes up. Hit with the shoulder and drive upward through the contact — not through the ball carrier.',
            why: 'Driving up dislodges the ball carrier from their feet and prevents offloads. Driving through keeps the ball carrier balanced and gives them the opportunity to offload.',
          },
          {
            how: 'Fast feet into contact. Leg drive throughout. Use the arms to wrap and lock on — underhooks driving up under the armpits to get as tight as possible after contact.',
            why: 'Fast feet stop the defender from planting and losing power. Leg drive through the tackle completes it. Locking on through the armpits takes away the offload and controls the ball carrier to the ground.',
          },
        ],
      },
    ],
    coachingNote: 'Never skip tackle technique in training. Even experienced players benefit from repetition — technique breaks down under fatigue and pressure. The best time to reinforce it is in controlled drill environments before the fatigue kicks in.',
  },
]

export default function SkillsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="app-heading text-2xl">Fundamental Skills Guide</h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
          The core skills every rugby league player needs — broken down into coaching
          points with the technique and the reason behind it. Master these before
          introducing any attacking structure or game plan.
        </p>
      </div>

      {/* How to use this guide */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">How to run a skills session</h2>
        <ol className="space-y-2">
          {[
            ['Explain the drill', 'Organise the group and explain the mechanics only — no skill teaching yet. Players need to understand what they\'re doing before they can learn how to do it.'],
            ['Get them active quickly', 'Start moving as soon as possible. Don\'t over-communicate before the first rep.'],
            ['Coach the skill in stages', 'Stop the drill, demonstrate and explain one coaching point, then let them practice it before moving to the next.'],
            ['Give them time to practice', 'Players need repetitions with correct technique. Give feedback, but also give them space to problem-solve.'],
            ['Test it in a small-sided game', 'The skill is only learned when it can be executed under pressure. Small-sided games replicate match scenarios and show you what\'s actually stuck.'],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-zinc-400 leading-relaxed">
                <span className="text-zinc-200 font-medium">{title} — </span>
                {desc}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Skill sections */}
      {skills.map((skill, skillIdx) => {
        const colours = ['indigo', 'amber', 'rose'] as const
        const colour = colours[skillIdx % colours.length]
        const colMap = {
          indigo: { badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300', phase: 'text-indigo-400', dot: 'bg-indigo-500', tip: 'bg-indigo-500/5 border-indigo-500/15 text-indigo-300/80' },
          amber:  { badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300',   phase: 'text-amber-400',  dot: 'bg-amber-500',  tip: 'bg-amber-500/5 border-amber-500/15 text-amber-300/80'   },
          rose:   { badge: 'bg-rose-500/10 border-rose-500/20 text-rose-300',       phase: 'text-rose-400',   dot: 'bg-rose-500',   tip: 'bg-rose-500/5 border-rose-500/15 text-rose-300/80'       },
        }
        const c = colMap[colour]

        return (
          <div key={skill.id} className="space-y-5">
            {/* Section header */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{skill.title}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${c.badge}`}>
                  {skill.subtitle}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{skill.intro}</p>
            </div>

            {/* Phases */}
            {skill.phases.map(phase => (
              <div key={phase.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${c.phase}`}>
                    {phase.label}
                  </h3>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {phase.points.map((point, i) => (
                    <div key={i} className="grid sm:grid-cols-2 gap-0">
                      <div className="px-5 py-4 sm:border-r border-zinc-800/60">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">How</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{point.how}</p>
                      </div>
                      <div className="px-5 py-4 bg-zinc-900/30">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Why</p>
                        <p className="text-sm text-zinc-400 leading-relaxed">{point.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Coaching note */}
            <div className={`px-4 py-3 rounded-lg border text-xs leading-relaxed ${c.tip}`}>
              <span className="font-semibold">Coaching note: </span>
              {skill.coachingNote}
            </div>
          </div>
        )
      })}

      {/* Footer CTA */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Ready to build a session around these skills?</p>
        <p className="text-sm text-zinc-500">
          Find drills in the{' '}
          <Link href="/drills" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            drill library
          </Link>
          , or ask the{' '}
          <Link href="/chat/ai" className="text-amber-400 hover:text-amber-300 transition-colors">
            AI coaching assistant
          </Link>
          {' '}to design a fundamentals session for your age group.
        </p>
      </div>
    </div>
  )
}
