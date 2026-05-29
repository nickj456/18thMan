import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fundamental Skills Guide — Rugby League',
  description: 'How to teach the core rugby league skills — grip, catch and pass, draw and pass (2v1), tackle technique, play the ball, grubber kick, punt kick, and fend. Coaching points, technique breakdowns, and the why behind each.',
  openGraph: {
    title: 'Rugby League Fundamental Skills Guide — 18th Man',
    description: 'How to teach the core rugby league skills — grip, catch and pass, draw and pass (2v1), tackle technique, play the ball, grubber kick, punt kick, and fend. Coaching points, technique breakdowns, and the why behind each.',
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
  {
    id: 'play-the-ball',
    title: 'Play the Ball',
    subtitle: 'The reset that drives the game',
    intro: 'The play the ball is the most repeated skill in rugby league — it happens after every tackle. Done well, it gives the acting half a clean ball quickly and puts the attacking team in control of the set. Done poorly, it slows everything down and hands the defence time to reset. Teach it from the ground up.',
    phases: [
      {
        label: 'Placement',
        points: [
          {
            how: 'When brought to ground, place the ball directly underneath the body — between the feet and the chest. Roll onto the knees, not the side.',
            why: 'Placing the ball under the body ensures it comes out directly in front of the player when they roll it back. A ball placed to the side forces the acting half to reach or adjust, costing time.',
          },
          {
            how: 'Keep hold of the ball until it is on the ground. Do not drop it early or let it go before the roll begins.',
            why: 'Dropping the ball early gives the marker a chance to interfere. The ball carrier controls the speed of the play the ball — they should use that control.',
          },
        ],
      },
      {
        label: 'Roll & Present',
        points: [
          {
            how: 'From the knees, roll the ball back with both hands along the ground — directly backward between the legs. The movement should be deliberate and consistent.',
            why: 'A consistent roll every time means the acting half can be in position before the ball arrives. Variation in the roll forces the acting half to adjust and slows the play.',
          },
          {
            how: 'Get to the feet quickly after presenting the ball. The play the ball is not the end of a tackle — the ball carrier needs to be ready to re-enter the play.',
            why: 'A ball carrier who stays on the ground blocks the acting half\'s running lines and clogs the ruck. Getting up quickly keeps the play fluid.',
          },
        ],
      },
      {
        label: 'Acting Half',
        points: [
          {
            how: 'The acting half positions themselves directly behind the play the ball, low and on their toes, before the ball is rolled. Their eyes should be up on the defence, not on the ball.',
            why: 'Being set up before the ball arrives means the acting half can make their decision and move on receipt, not after. Eyes on the defence rather than the ball means they read the defensive gaps, not just collect the ball.',
          },
          {
            how: 'Receive the ball cleanly and move immediately — there is no time to look down. The options are: pass wide, hit a runner, kick, or sneak from dummy half.',
            why: 'The advantage of dummy half is speed of play. Every second spent stationary after receiving gives the defence time to reorganise. The best dummy halves make decisions before the ball arrives.',
          },
        ],
      },
    ],
    coachingNote: 'Practice the play the ball in isolation before adding the acting half. Once both players are performing consistently, add a marker — first passive, then active. The habit of a clean, fast play the ball is one of the highest-value skills in the game and one of the most undercoached.',
  },
  {
    id: 'side-on-tackle',
    title: 'Side-On Tackle',
    subtitle: 'Stopping the offload before it happens',
    intro: 'The side-on tackle is the most common tackle in the game. Most ball carriers are running across the defender\'s field of view, not straight at them. A defender who can only make front-on tackles will be beaten regularly in open play. The side-on technique is about angle, contact point, and pinning the arms before an offload can happen.',
    phases: [
      {
        label: 'Approach & Angle',
        points: [
          {
            how: 'Cut the ball carrier off — don\'t chase them. Take an angle that puts you in front of them, targeting the inside channel.',
            why: 'A defender who runs beside the ball carrier or chases from behind cannot make a controlled tackle. An angle that intercepts the ball carrier\'s path means the defender is in control of the contact.',
          },
          {
            how: 'Stay low and square the hips to the contact point as you close in. Keep the eyes up on the ball carrier\'s body, not the ball.',
            why: 'Low hips generate power. Watching the body (not the ball or the feet) means step and direction changes don\'t fool the defender — the body always goes where the feet go.',
          },
        ],
      },
      {
        label: 'Contact Point',
        points: [
          {
            how: 'Aim to make contact into the ball carrier\'s near lat or ribs — not the hip, not the shoulder. Get the tackling shoulder into the ball or the arm carrying the ball.',
            why: 'Contact into the ribs or lat removes the offload. A defender who hits too high or too low leaves the ball carrier\'s arms free. Getting the shoulder into the carrying arm directly prevents the pass or offload from being released.',
          },
          {
            how: 'Lead with the shoulder nearest to the ball carrier\'s body. Head behind the ball carrier — not in front.',
            why: 'Head behind the ball carrier is the safe position in a side-on tackle. Head in front puts the defender at risk of a knee to the head if the ball carrier twists or steps.',
          },
        ],
      },
      {
        label: 'Drive & Completion',
        points: [
          {
            how: 'On contact, wrap both arms tight and drive the near arm up and under the ball carrier\'s arms. Fast feet through the tackle. Drive the ball carrier toward the ground — not laterally.',
            why: 'Wrapping tight prevents the offload. Driving toward the ground means the ball carrier loses metres, not just lateral momentum. Lateral drives allow the ball carrier to stay on their feet and play on.',
          },
          {
            how: 'Compete for the ball at the completion. If the wrap is tight, apply pressure on the ball. Don\'t release until the referee calls held.',
            why: 'A tackle that pins the arms and competes for the ball gives the defence a chance of a turnover. Releasing early hands the ball carrier every opportunity to offload on the ground.',
          },
        ],
      },
    ],
    coachingNote: 'Pair a ball carrier and a defender. Have the ball carrier run across the defender at 45 degrees — first at half-pace, then three-quarter pace. Focus on the contact point and arm wrap before building to full pace. The side-on tackle is more technically demanding than the front-on and needs specific practice time, not just general tackle drills.',
  },
  {
    id: 'grubber-kick',
    title: 'Grubber Kick',
    subtitle: 'Putting the ball behind a flat defence',
    intro: 'The grubber kick is rugby league\'s most precise attacking kick. It travels low along the ground — or with one bounce — into the space behind a flat defensive line. Used at the right moment, it puts the defence in a footrace on their own try line. Teach it as a skill first, then as a tactical decision.',
    phases: [
      {
        label: 'Ball Placement & Drop',
        points: [
          {
            how: 'Hold the ball vertically — laces or seam facing forward, point of the ball down. Drop the ball to the foot; do not throw it down.',
            why: 'A vertical ball gives the kicker a consistent contact point. Throwing the ball down introduces variation in bounce and makes clean contact harder. The ball should leave the hands and be struck before it reaches the ground.',
          },
          {
            how: 'Contact the ball at the bottom third — below the mid-point. The foot should be flat and relaxed, not tensed.',
            why: 'Striking the bottom third of the ball sends it low and fast along the ground. Contact too high sends it in the air; too low sends it into the ground and produces an unpredictable bounce.',
          },
        ],
      },
      {
        label: 'Contact & Follow Through',
        points: [
          {
            how: 'Follow through low — the kicking foot should finish pointing at the target, close to the ground. The non-kicking foot stays planted and slightly bent.',
            why: 'A low follow-through keeps the ball on its intended line. A high follow-through sends the ball up. The non-kicking leg acts as the balance point — bending it keeps the hips over the ball through contact.',
          },
          {
            how: 'Strike through the ball, not at it. The foot should contact and continue forward in one smooth movement.',
            why: 'Stabbing at the ball produces a hard-to-control contact. A smooth follow-through gives the kicker control over distance and direction.',
          },
        ],
      },
      {
        label: 'Timing & Targeting',
        points: [
          {
            how: 'Kick through a gap in the defensive line, not at a defender. The target is the space, not a person.',
            why: 'A grubber kicked directly at a defender is easily fielded. A grubber through a gap between two defenders forces both to turn and chase — neither has a clear run to the ball.',
          },
          {
            how: 'Use the grubber when the defence is flat and rushing up. Don\'t use it when the defence is deeper — that is a kicking game situation, not a grubber situation.',
            why: 'The grubber works because a flat, rushing defence has no time to turn and chase. Against a deeper defence the ball can be fielded cleanly before the attacking team arrives.',
          },
        ],
      },
    ],
    coachingNote: 'Practise the grubber at walking pace first — contact point and follow-through before adding distance or pace. The most common error is throwing the ball down rather than dropping it. Fix that habit early. Once the technique is consistent, add a passive defender to teach the targeting decision.',
  },
  {
    id: 'punt-kick',
    title: 'Punt Kick',
    subtitle: 'Distance and field position',
    intro: 'The punt kick is the attacking team\'s most important field position tool. A well-struck punt on the last tackle sends the defence to their own 20 and resets the pressure. A poor one hands the ball back in good field position for the opposition. Every player should be able to punt — not just the halfback.',
    phases: [
      {
        label: 'Drop & Contact',
        points: [
          {
            how: 'Hold the ball at waist height, laces up, slightly angled — the nose of the ball pointing slightly down toward the kicking foot. Drop the ball to the foot; do not throw it.',
            why: 'A consistent drop is the foundation of a consistent punt. Throwing the ball introduces movement that changes where the foot makes contact. The ball should be released and struck in a single smooth action.',
          },
          {
            how: 'Contact is made on the laces — the top of the foot. The ankle is locked and the toes pointed down through contact.',
            why: 'Contact on the laces gives the cleanest transfer of power and the most accurate flight. A loose ankle means the contact point changes on every kick. Toes down ensures the foot is in a consistent position at the moment of contact.',
          },
        ],
      },
      {
        label: 'Body Position',
        points: [
          {
            how: 'Lean into the kick — the body weight transfers forward onto the non-kicking leg through and after contact. The kicking leg follows through high, toward the target.',
            why: 'Leaning forward keeps the ball on a low, penetrating trajectory that travels further. Leaning back produces a high, short kick — useful sometimes, but not the default.',
          },
          {
            how: 'The non-kicking leg is slightly bent and planted. Use the arms for balance — extend the non-kicking arm toward the target.',
            why: 'A planted, bent non-kicking leg acts as a pivot point and keeps the hips through the ball. A straight non-kicking leg locks the hips and reduces power and follow-through.',
          },
        ],
      },
      {
        label: 'Direction & Variation',
        points: [
          {
            how: 'To kick across the body (cross-field), keep the ball aligned with the kicking foot and open the hips slightly toward the target. Do not try to hook the foot around the ball.',
            why: 'Opening the hips creates the angle; there is no need to adjust the contact point. Trying to curve the foot around the ball produces inconsistent contact and reduces distance.',
          },
          {
            how: 'To vary height and distance, adjust the angle of the ball at the drop — more vertical for a taller kick, more horizontal for a flat, driving kick.',
            why: 'Most kicking variation comes from the ball angle, not from changing technique entirely. Consistent contact on a differently angled ball gives the kicker a repertoire without requiring multiple fundamentally different techniques.',
          },
        ],
      },
    ],
    coachingNote: 'The single biggest improvement in most players\' kicking is fixing the drop. Have them practise the drop without kicking — just release the ball consistently to the same point every time. Add the contact once the drop is automatic. All other elements of the punt follow from a clean, consistent drop.',
  },
  {
    id: 'fend',
    title: 'Fend',
    subtitle: 'Creating separation at the point of contact',
    intro: 'The fend is one of the few legal ways a ball carrier can create separation from a defender in the tackle. Done correctly, it buys the ball carrier a metre or two of space and keeps them on their feet. Done incorrectly, it is a penalty or it stops the player in their tracks. Teach it as a timing skill, not a strength skill.',
    phases: [
      {
        label: 'Timing',
        points: [
          {
            how: 'The fend happens when the defender is committed to the tackle — not early, and not after they have their arms around the ball carrier. The trigger is the defender\'s final step into contact.',
            why: 'A fend too early is easily ducked under or stepped around. A fend too late is after the tackle has been made. The window is the moment the defender leans in — that is when their balance is most vulnerable.',
          },
          {
            how: 'Keep two hands on the ball until the fend is executed. Fend with the hand furthest from the ball carrier — the outside arm.',
            why: 'Two hands until the last moment keeps all options open. The outside arm fend creates space without exposing the ball to the defender\'s reaching hand.',
          },
        ],
      },
      {
        label: 'Technique',
        points: [
          {
            how: 'Extend the arm straight into the defender\'s shoulder or chest — not toward the head or neck. Palm out, fingers up. Drive through the shoulder, not a push with the wrist.',
            why: 'Contact into the shoulder and chest is legal and effective. Contact to the head or neck is a penalty. Driving through the shoulder uses the whole arm and torso — a wrist push has no power and often jams the ball carrier\'s arm.',
          },
          {
            how: 'The body continues forward through the fend — the fending arm extends but the hips and legs keep driving toward the line.',
            why: 'Stopping to fend gives the defender time to recover. The fend only works if the ball carrier\'s momentum carries them past the point of contact. The arm creates the separation; the legs finish the play.',
          },
        ],
      },
      {
        label: 'Recovery',
        points: [
          {
            how: 'After the fend, bring the fending hand back to the ball immediately — two hands on the ball within two steps.',
            why: 'A one-handed ball carry after the fend is a turnover risk. Defenders trailing the play will target the exposed side. Getting back to two hands secures the ball and prepares for the next contact.',
          },
          {
            how: 'Stay low after the fend. The natural tendency is to straighten up — resist it. Keep the hips low and continue driving forward.',
            why: 'Straightening up after the fend gives the second defender a better tackle height. Staying low means any secondary contact is at the defender\'s worst angle.',
          },
        ],
      },
    ],
    coachingNote: 'Introduce the fend in a one-on-one walk-through before adding pace. The key habit to build is the timing — fend too early in the drill and reset. Players who use the fend as a reflex rather than a timed decision will get the technique right eventually; players who never practise the timing will always fend at the wrong moment.',
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
        const colours = ['indigo', 'amber', 'rose', 'indigo', 'amber', 'rose', 'indigo', 'amber'] as const
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
