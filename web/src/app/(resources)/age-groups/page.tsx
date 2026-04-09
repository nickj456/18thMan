import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Age Groups Guide — Rugby League Skill Development',
  description: 'What to teach at every age in rugby league — skill objectives, development focus areas, and coaching priorities from Under 7s through to Under 18s.',
  openGraph: {
    title: 'Rugby League Age Groups Guide — 18th Man',
    description: 'What to teach at every age in rugby league — skill objectives, development focus areas, and coaching priorities from Under 7s through to Under 18s.',
  },
}

interface AgeGroup {
  id: string
  label: string
  format: string
  theme: string
  colour: string
  intro: string
  minor: string[]
  major: string[]
  emphasis: string
}

const ageGroups: AgeGroup[] = [
  {
    id: 'u7-u8',
    label: 'Under 7s & 8s',
    format: 'Mini League',
    theme: 'Fun first, fundamentals second',
    colour: 'emerald',
    intro: 'The priority at this age is simple: make sure they enjoy it and want to come back. Every drill and game should be built around that. Skill learning happens naturally when kids are having fun — don\'t sacrifice the environment chasing technique.',
    minor: [
      'Basic understanding of the rules of the game',
      'Introduction to catching, passing, and carrying technique',
      'Correct play-the-ball technique',
      'Introduction to tackle technique',
      'Basic understanding of defensive line direction',
    ],
    major: [
      'Progress from basic pass/carry to catch/pass running onto the ball',
      'Understanding the roles of dummy half and first receiver',
      'Progression of front-on and side-on tackle technique',
    ],
    emphasis: 'Winning games is irrelevant at this age. A coach\'s job is to create a positive environment and make sure every player leaves training wanting to come back.',
  },
  {
    id: 'u9-u10',
    label: 'Under 9s & 10s',
    format: 'Mid League',
    theme: 'Building the foundation',
    colour: 'sky',
    intro: 'Players at this age are ready to start connecting individual skills into simple team concepts. Begin introducing support play and the idea of going forward — but keep the emphasis firmly on skill development and enjoyment. Winning still doesn\'t matter.',
    minor: [
      'Thorough knowledge of Mid League rules',
      'Continued progression of the basic skills from Mini League',
      'Basic understanding of player positions',
      'Introduction to basic kicking technique',
      'Basic introduction of defensive roles (markers)',
      'Scrummage technique where applicable',
    ],
    major: [
      'Introduction to go-forward and what it means in attack',
      'Introduction to support players and their role',
      'Progression of kicking technique',
      'Progression of defensive roles',
      'Basic introduction of draw and pass — 2v1',
    ],
    emphasis: 'Players need to be ready to progress to Mod League. Focus on skill development and making sure every player is engaged. Winning is of no importance.',
  },
  {
    id: 'u11-u12',
    label: 'Under 11s & 12s',
    format: 'Mod League',
    theme: 'Connecting skills to game situations',
    colour: 'indigo',
    intro: 'Mod League is where players start to see how individual skills join together in a game. Draw and pass, go-forward, support play — these concepts can now be practised in small-sided game environments that mimic real match situations.',
    minor: [
      'Thorough understanding of Mod League rules',
      'Continued progression of catch, pass, and carry',
      'Progression of draw and pass — 2v1',
      'Progression of go-forward and support play',
      'Continued progression of defensive roles',
      'Introduction to kick and chase',
      'Progression of scrummage technique',
    ],
    major: [
      'Introduction of skill games showing the importance of fitness',
      'Progression of draw and pass — 2v1 and 3v2',
      'Introduction to line running',
      'Progression of tackle technique',
      'Introduction of backline formation',
    ],
    emphasis: 'Focus on enjoyment while fully preparing players for International Rules. Small-sided games are your best tool — they replicate match scenarios and keep training competitive and fun.',
  },
  {
    id: 'u13-u14',
    label: 'Under 13s & 14s',
    format: 'International Rules',
    theme: 'Structure and decision-making',
    colour: 'amber',
    intro: 'This is the transition into the full game. Players need to start understanding team structure, defensive systems, and decision-making under pressure. Skill refinement continues — but now those skills are tested inside game-realistic scenarios.',
    minor: [
      'Introduction to ruck plays',
      'Progression of backline formation',
      'Continued progression of draw and pass — 3v2 and 3v3',
      'Continued progression of line running and support play',
      'Introduction of footwork and evasion skills',
      'Introduction of defensive left/right/ruck units',
      'Introduction of double marker defence',
      'Continued scrummage technique',
    ],
    major: [
      'Introduce the importance of slowing the play-the-ball in defence',
      'Introduce the importance of quick play-the-ball in attack',
      'Introduction to body weight exercises — technique only',
      'Progression on the importance of fitness',
      'Introduction to nutrition and its role in performance',
    ],
    emphasis: 'Fine-tune the basics while introducing game structure. Sportsmanship must be shown at all times — this age group sets habits that carry through to senior football.',
  },
  {
    id: 'u15-u16',
    label: 'Under 15s & 16s',
    format: 'International Rules',
    theme: 'Game plans and leadership',
    colour: 'orange',
    intro: 'Players at this level are ready for game plans and more complex team structures. Short-side plays, kicking tactics, and defensive systems can all be introduced. Importantly, this is also the age to start developing players as people — leadership, goal-setting, and values.',
    minor: [
      'Continued progression on the importance of fitness',
      'Progression of nutrition knowledge',
      'Progression of formation and ruck plays',
      'Introduction to short-side plays',
      'Progression of play-the-ball speed in attack',
      'Progression of slowing the play-the-ball in defence',
      'Fine-tuning of catch/pass and draw/pass',
      'Fine-tuning defensive roles — kick chase, trail, slide',
      'Introduction to weight training — technique only',
      'Introduction to the value of extra training',
      'Introduction to game plans',
    ],
    major: [
      'Introduction of leadership roles within the team',
      'Introduction of goal setting for individuals and the team',
      'Introduction to life values and the importance of teamwork',
    ],
    emphasis: 'Sportsmanship and fine-tuning the major skill areas. Start developing leaders within your squad — this is the age where team culture is formed.',
  },
  {
    id: 'u18',
    label: 'Under 18s',
    format: 'International Rules',
    theme: 'Preparing for senior football',
    colour: 'rose',
    intro: 'The focus shifts to preparing players for the step up to senior football. Game plans become more sophisticated, fitness expectations rise, and the mental side of the game — motivation, resilience, and values — becomes a primary coaching responsibility.',
    minor: [
      'Progression of extra training expectations',
      'Progression of game plans and team structures',
      'Continued progression of nutrition',
      'Continued progression of winning the ruck area and play-the-ball speed',
      'Continued progression of running to space, not to players, and running angles',
    ],
    major: [
      'Continued emphasis on life and team values',
      'Focus on being a better person as well as a better player',
    ],
    emphasis: 'Prepare players for senior football while keeping them motivated. The best coaches at this level develop the whole person — players who leave your program ready for the next level, in rugby league and in life.',
  },
]

const colourMap: Record<string, { badge: string; dot: string; card: string; minor: string; major: string; tip: string }> = {
  emerald: {
    badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-500',
    card: 'border-zinc-800',
    minor: 'text-emerald-400',
    major: 'text-white',
    tip: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300/80',
  },
  sky: {
    badge: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
    dot: 'bg-sky-500',
    card: 'border-zinc-800',
    minor: 'text-sky-400',
    major: 'text-white',
    tip: 'bg-sky-500/5 border-sky-500/15 text-sky-300/80',
  },
  indigo: {
    badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
    dot: 'bg-indigo-500',
    card: 'border-zinc-800',
    minor: 'text-indigo-400',
    major: 'text-white',
    tip: 'bg-indigo-500/5 border-indigo-500/15 text-indigo-300/80',
  },
  amber: {
    badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    dot: 'bg-amber-500',
    card: 'border-zinc-800',
    minor: 'text-amber-400',
    major: 'text-white',
    tip: 'bg-amber-500/5 border-amber-500/15 text-amber-300/80',
  },
  orange: {
    badge: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
    dot: 'bg-orange-500',
    card: 'border-zinc-800',
    minor: 'text-orange-400',
    major: 'text-white',
    tip: 'bg-orange-500/5 border-orange-500/15 text-orange-300/80',
  },
  rose: {
    badge: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    dot: 'bg-rose-500',
    card: 'border-zinc-800',
    minor: 'text-rose-400',
    major: 'text-white',
    tip: 'bg-rose-500/5 border-rose-500/15 text-rose-300/80',
  },
}

export default function AgeGroupsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="app-heading text-2xl">Age Groups Guide</h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
          Skill objectives and development priorities for every age group — from first-time
          Mini Leaguers to players ready for senior football. Use this as a curriculum
          framework when planning your{' '}
          <Link href="/sessions" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            training sessions
          </Link>
          .
        </p>
      </div>

      {/* Age group cards */}
      {ageGroups.map(group => {
        const c = colourMap[group.colour]
        return (
          <div key={group.id} className={`rounded-xl border ${c.card} bg-zinc-900/50 overflow-hidden`}>
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-zinc-800">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-white">{group.label}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${c.badge}`}>
                    {group.format}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 italic">{group.theme}</p>
              </div>
            </div>

            {/* Intro */}
            <div className="px-5 pt-4">
              <p className="text-sm text-zinc-400 leading-relaxed">{group.intro}</p>
            </div>

            {/* Objectives */}
            <div className="px-5 py-4 grid sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${c.minor}`}>
                  Skills to introduce
                </h3>
                <ul className="space-y-1.5">
                  {group.minor.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-zinc-400 leading-snug">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 opacity-60 ${c.dot}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2.5">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${c.minor}`}>
                  Key development goals
                </h3>
                <ul className="space-y-1.5">
                  {group.major.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-zinc-400 leading-snug">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Coaching emphasis */}
            <div className={`mx-5 mb-4 px-4 py-3 rounded-lg border text-xs leading-relaxed ${c.tip}`}>
              <span className="font-semibold">Coaching emphasis: </span>
              {group.emphasis}
            </div>
          </div>
        )
      })}

      {/* Footer CTA */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Building a session for your age group?</p>
        <p className="text-sm text-zinc-500">
          Browse the{' '}
          <Link href="/drills" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            drill library
          </Link>
          {' '}or ask the{' '}
          <Link href="/chat/ai" className="text-amber-400 hover:text-amber-300 transition-colors">
            AI coaching assistant
          </Link>
          {' '}to suggest age-appropriate drills and session structures.
        </p>
      </div>
    </div>
  )
}
