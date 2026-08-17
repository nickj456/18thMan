# Player Communication Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, SEO-indexed coaching guide at `/communication` that teaches rugby league communication as a coachable skill via the SEE IT → SAY IT → SOLVE IT framework, a 4-level progression, call vocabulary, drills, and coaching principles — plus a sidebar nav entry and sitemap listing.

**Architecture:** A single Server Component page (`web/src/app/(resources)/communication/page.tsx`) following the exact pattern of `web/src/app/(resources)/skills/page.tsx`: `export const metadata` for SEO, typed in-file content arrays, colour-banded sections rendered directly (no client state, no accordion). A new nav entry is added to `resourceItems` in `web/src/components/app-sidebar.tsx`, and a new URL entry is added to `web/src/app/sitemap.ts`.

**Tech Stack:** Next.js App Router (Server Components), Tailwind CSS, lucide-react icons. No new dependencies, no Supabase/DB changes, no Server Actions.

## Global Constraints

- No new database tables, migrations, or Supabase types — this is a pure content page (per spec's non-goals).
- No linking from this page to real entries in the `drills` or `session_plans` tables — drills/games described here are self-contained write-ups (per spec's non-goals). In-page anchor links between Levels and the Drills & Games section are fine (same static page, not the real library).
- No admin CMS/editing UI — content is hardcoded in the repo (per spec's non-goals).
- Rugby league specific tone throughout — no generic sports-psychology language ("active listening," "growth mindset," "psychological safety") anywhere on the page (per spec's Content Tone section).
- Dark mode is the project default — verify contrast in dark mode (per project CLAUDE.md styling rules).
- Static content page — no unit test file is required for the page itself (matches existing precedent: neither `skills/page.tsx` nor `how-to/page.tsx` has a test file). Verification is `tsc --noEmit`, `npm run test` (regression check), and a manual browser pass.

---

### Task 1: Build the Communication guide page

**Files:**
- Create: `web/src/app/(resources)/communication/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the route `/communication`, which Task 2 links to from the sidebar and Task 3 lists in the sitemap. No exported symbols are consumed by other tasks — this is a leaf page component.

- [ ] **Step 1: Create the page file with full metadata, content data, and layout**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Eye, MessageCircle, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Player Communication Guide — Rugby League Coaching',
  description: 'Teach rugby league communication as a coachable skill. The SEE IT, SAY IT, SOLVE IT framework, a 4-level progression, attacking and defensive call vocabulary, and drills that build confident, talkative players.',
  openGraph: {
    title: 'Player Communication Guide — 18th Man',
    description: 'Teach rugby league communication as a coachable skill. The SEE IT, SAY IT, SOLVE IT framework, a 4-level progression, attacking and defensive call vocabulary, and drills that build confident, talkative players.',
  },
}

interface FrameworkStep {
  id: 'see' | 'say' | 'solve'
  icon: React.ElementType
  title: string
  description: string
}

const frameworkSteps: FrameworkStep[] = [
  {
    id: 'see',
    icon: Eye,
    title: 'See It',
    description: 'Notice something useful — space, numbers, an overlap, a defender shooting out, a mismatch, a short side.',
  },
  {
    id: 'say',
    icon: MessageCircle,
    title: 'Say It',
    description: 'Use a short trigger word, not a sentence, so a teammate can act on it instantly.',
  },
  {
    id: 'solve',
    icon: CheckCircle2,
    title: 'Solve It',
    description: 'The call leads to an action. The aim isn’t noise — it’s a better decision.',
  },
]

const seeItExamples = [
  'Space', 'Numbers', 'An overlap', 'A defender shooting out',
  'A disconnected defender', 'A mismatch', 'A short side', 'A teammate out of position',
]

interface Call {
  call: string
  meaning: string
}

const attackingCalls: Call[] = [
  { call: 'BALL', meaning: 'I’m available — give me the ball.' },
  { call: 'UNDERS', meaning: 'I’m taking the short ball underneath you.' },
  { call: 'OUT', meaning: 'There’s space out wide — move it.' },
  { call: 'LEFT', meaning: 'Space or support is to the left.' },
  { call: 'RIGHT', meaning: 'Space or support is to the right.' },
  { call: 'SHORT', meaning: 'Play it short — the defence is spread or rushing.' },
  { call: 'HOLD', meaning: 'Hold the ball, don’t force it — reset.' },
  { call: 'ONE MORE', meaning: 'We’ve got a play left — take it before the kick.' },
]

const defensiveCalls: Call[] = [
  { call: 'SET', meaning: 'Get into your defensive line position now.' },
  { call: 'UP', meaning: 'Push up together on the next play.' },
  { call: 'HOLD', meaning: 'Hold the line — don’t rush, don’t retreat.' },
  { call: 'PUSH', meaning: 'Push across to cover the overlap.' },
  { call: 'TIGHT', meaning: 'Come in tight — cover the middle.' },
  { call: 'MINE', meaning: 'I’ve got this tackle — claim it clearly.' },
  { call: 'LEFT', meaning: 'Cover or threat is to the left.' },
  { call: 'RIGHT', meaning: 'Cover or threat is to the right.' },
]

type LevelColour = 'sky' | 'emerald' | 'amber' | 'rose'

interface Level {
  id: string
  number: 1 | 2 | 3 | 4
  title: string
  summary: string
  exampleCalls: string[]
  whoItsFor: string
  ageNote: string
  relatedDrillIds: string[]
  colour: LevelColour
}

const levels: Level[] = [
  {
    id: 'find-your-voice',
    number: 1,
    title: 'Find Your Voice',
    summary: 'Players learn to communicate for themselves before they’re asked to communicate for anyone else.',
    exampleCalls: ['BALL', 'UNDERS', 'OUT'],
    whoItsFor: 'Every player, every age — the starting point for all communication coaching.',
    ageNote: 'This is the entire target for juniors. Don’t push further until calling for yourself is automatic and confident.',
    relatedDrillIds: ['information-before-possession'],
    colour: 'sky',
  },
  {
    id: 'share-information',
    number: 2,
    title: 'Share Information',
    summary: 'Players start telling teammates what they can see, not just what they want.',
    exampleCalls: ['LEFT', 'RIGHT', 'SHORT', 'NUMBERS'],
    whoItsFor: 'Players who’ve mastered Level 1 and are ready to look outward at the game around them.',
    ageNote: 'Introduce once a player calls confidently for themselves without prompting — any age, once Level 1 is solid.',
    relatedDrillIds: ['no-call-no-pass', 'information-before-possession'],
    colour: 'emerald',
  },
  {
    id: 'organise-others',
    number: 3,
    title: 'Organise Others',
    summary: 'Players start directing teammates, not just informing them.',
    exampleCalls: ['GET DEEP', 'HOLD WIDTH', 'PUSH', 'SET HERE', 'ONE MORE'],
    whoItsFor: 'Particularly important for halfbacks, hookers, and fullbacks — the organising spine of the team — but any confident Level 2 player can be developed here.',
    ageNote: 'Realistic from open-age teens upward. Don’t force it onto players who haven’t found their voice yet.',
    relatedDrillIds: ['silent-game', 'communication-bonus'],
    colour: 'amber',
  },
  {
    id: 'lead',
    number: 4,
    title: 'Lead',
    summary: 'Players communicate before problems happen — organising shape, defensive numbers, and the next play ahead of time rather than reacting to it.',
    exampleCalls: [],
    whoItsFor: 'Senior organisers and captains-in-waiting. The ceiling of the framework, not a requirement for every player.',
    ageNote: 'Generally open age or representative level.',
    relatedDrillIds: ['silent-game', 'communication-bonus'],
    colour: 'rose',
  },
]

type DrillColour = 'indigo' | 'amber' | 'rose'

interface Drill {
  id: string
  title: string
  format: string
  setup: string
  rule: string
  coachingPoints: string[]
  targetLevel: string
  colour: DrillColour
}

const drills: Drill[] = [
  {
    id: 'no-call-no-pass',
    title: 'No Call, No Pass',
    format: '2v1 and 3v2 attacking situations.',
    setup: 'Standard 2v1 / 3v2 grid, attackers start with the ball at one end.',
    rule: 'The support player must make a clear call (what they see — e.g. OUT, SHORT, NUMBERS) before they can receive the ball. A pass to a silent support player doesn’t count.',
    coachingPoints: [
      'Reward the call, not just the try.',
      'A wrong-but-clear call still gets praised for effort — voice first, precision second.',
    ],
    targetLevel: 'Levels 1–2',
    colour: 'indigo',
  },
  {
    id: 'silent-game',
    title: 'Silent Game',
    format: 'Small-sided game (4v4 or similar).',
    setup: 'Normal rules, ball in play, but no talking allowed at all.',
    rule: 'Play a set period in total silence, then stop and ask the group what information they were missing and what mistakes it caused. Replay the same scenario with communication allowed and compare.',
    coachingPoints: [
      'This is a contrast drill — the debrief matters as much as the play itself.',
      'Let players articulate the gap themselves rather than telling them.',
    ],
    targetLevel: 'Levels 2–4',
    colour: 'amber',
  },
  {
    id: 'communication-bonus',
    title: 'Communication Bonus',
    format: 'Any normal small-sided or full training game.',
    setup: 'Standard game rules and scoring.',
    rule: 'A normal try scores 1 point. A try that involved several clear, useful communication calls (coach’s judgement, called out live) scores 2 points.',
    coachingPoints: [
      'The coach must actively listen and call out qualifying tries in the moment.',
      'The bonus only works if players hear it recognised immediately, not at the end.',
    ],
    targetLevel: 'Levels 3–4',
    colour: 'rose',
  },
  {
    id: 'information-before-possession',
    title: 'Information Before Possession',
    format: 'Any drill involving a pass or handover.',
    setup: 'No special grid required — a rule layered over existing drills.',
    rule: 'Before a player can receive the ball, they must state what they see — not just call for the ball. Not just BALL, but BALL, OVERLAP LEFT.',
    coachingPoints: [
      'Good for retrofitting onto drills the club already runs.',
      'Forces the SEE IT step to happen out loud instead of staying silent in the player’s head.',
    ],
    targetLevel: 'Levels 1–2',
    colour: 'indigo',
  },
]

interface Principle {
  title: string
  description: string
}

const principles: Principle[] = [
  { title: 'Say the obvious.', description: 'Players often stay quiet because they assume everyone else can already see what they see. Tell them: if you can see it, say it — assume nobody else has.' },
  { title: 'Short beats clever.', description: 'One or two words a teammate can act on instantly beats a full sentence they have to process mid-play.' },
  { title: 'Early beats loud.', description: 'Information delivered early and calmly is more useful than the same information shouted too late to act on.' },
  { title: 'Communication must help somebody act.', description: 'If a call doesn’t change what a teammate does, it’s noise, not communication — hold every call to that bar.' },
  { title: 'Don’t write off quiet players as poor communicators.', description: 'Give them simple language and low-pressure reps before judging their communication — most “quiet” players are missing vocabulary and confidence, not willingness.' },
]

const levelColourMap: Record<LevelColour, { badge: string; ring: string }> = {
  sky: { badge: 'bg-sky-500/10 border-sky-500/20 text-sky-300', ring: 'text-sky-400' },
  emerald: { badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', ring: 'text-emerald-400' },
  amber: { badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300', ring: 'text-amber-400' },
  rose: { badge: 'bg-rose-500/10 border-rose-500/20 text-rose-300', ring: 'text-rose-400' },
}

const drillColourMap: Record<DrillColour, { badge: string; heading: string }> = {
  indigo: { badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300', heading: 'text-indigo-400' },
  amber: { badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300', heading: 'text-amber-400' },
  rose: { badge: 'bg-rose-500/10 border-rose-500/20 text-rose-300', heading: 'text-rose-400' },
}

export default function CommunicationPage() {
  return (
    <div className="max-w-3xl space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="app-heading text-2xl">Player Communication Guide</h1>
        <p className="text-sm font-medium text-zinc-200">
          Don’t tell players to communicate. Teach them the language.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
          Young players are often told to “communicate more,” but many stay quiet because they
          feel stupid, lack confidence, or genuinely don’t know what they’re supposed to say.
          Treat communication as a coachable skill — just like passing, tackling, or decision-making —
          and it becomes something you can actually teach.
        </p>
      </div>

      {/* Framework strip */}
      <div className="grid sm:grid-cols-3 gap-3">
        {frameworkSteps.map(step => {
          const Icon = step.icon
          return (
            <div key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/60 flex items-center justify-center text-zinc-300">
                <Icon size={15} />
              </div>
              <h2 className="text-sm font-semibold text-white">{step.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
            </div>
          )
        })}
      </div>

      {/* SEE IT detail */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">See It</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Before players can say anything useful, they need to know what’s worth noticing. Teach
          them to actively scan for:
        </p>
        <div className="flex flex-wrap gap-2">
          {seeItExamples.map(example => (
            <span key={example} className="text-xs font-medium px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800/60 text-zinc-300">
              {example}
            </span>
          ))}
        </div>
      </div>

      {/* SAY IT detail */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Say It</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Short trigger words beat long sentences. A call has to be processed and acted on in a
          split second — teach a shared vocabulary, not eloquence.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Attacking Calls</h3>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {attackingCalls.map(c => (
                <div key={c.call} className="px-4 py-2.5 flex items-baseline gap-3">
                  <span className="text-xs font-bold text-zinc-100 shrink-0 font-mono">{c.call}</span>
                  <span className="text-xs text-zinc-500 leading-relaxed">{c.meaning}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">Defensive Calls</h3>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {defensiveCalls.map(c => (
                <div key={c.call} className="px-4 py-2.5 flex items-baseline gap-3">
                  <span className="text-xs font-bold text-zinc-100 shrink-0 font-mono">{c.call}</span>
                  <span className="text-xs text-zinc-500 leading-relaxed">{c.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SOLVE IT detail */}
      <div className="px-4 py-3 rounded-lg border border-indigo-500/15 bg-indigo-500/5 text-indigo-300/80 text-xs leading-relaxed">
        <span className="font-semibold">Solve it: </span>
        If it didn’t help someone act, it wasn’t communication — it was noise. The aim is never volume, it’s better decisions.
      </div>

      {/* Levels */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">The 4 Levels</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Communication develops in stages. Don’t skip ahead — a player who can’t reliably do
            Level 1 isn’t ready for Level 3.
          </p>
        </div>

        {levels.map(level => {
          const c = levelColourMap[level.colour]
          return (
            <div key={level.id} id={level.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${c.badge}`}>
                  {level.number}
                </span>
                <h3 className="text-sm font-semibold text-white">{level.title}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-zinc-400 leading-relaxed">{level.summary}</p>
                {level.exampleCalls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {level.exampleCalls.map(call => (
                      <span key={call} className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${c.badge}`}>
                        {call}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Who it’s for</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{level.whoItsFor}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Age note</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{level.ageNote}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  {level.relatedDrillIds.map(drillId => {
                    const drill = drills.find(d => d.id === drillId)
                    if (!drill) return null
                    return (
                      <a key={drillId} href={`#${drillId}`} className={`text-xs font-medium hover:underline ${c.ring}`}>
                        Drill: {drill.title} →
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Drills & Games */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Drills &amp; Games</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Practical ways to build communication naturally, without turning training into a lecture.
          </p>
        </div>

        {drills.map(drill => {
          const c = drillColourMap[drill.colour]
          return (
            <div key={drill.id} id={drill.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{drill.title}</h3>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${c.badge}`}>
                  {drill.targetLevel}
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-zinc-500">{drill.format}</p>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${c.heading}`}>Setup</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{drill.setup}</p>
                </div>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${c.heading}`}>Rule</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{drill.rule}</p>
                </div>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${c.heading}`}>Coaching points</p>
                  <ul className="space-y-1 list-disc list-inside">
                    {drill.coachingPoints.map((point, i) => (
                      <li key={i} className="text-sm text-zinc-400 leading-relaxed">{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Coaching Principles */}
      <div className="space-y-5">
        <h2 className="text-lg font-bold text-white">Coaching Principles</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <ol className="space-y-3">
            {principles.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-zinc-400 leading-relaxed">
                  <span className="text-zinc-200 font-medium">{p.title} </span>
                  {p.description}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white">Helping Quiet Players</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Start every quiet player at Level 1, regardless of age or ability elsewhere. Give them
            one or two words to own — just BALL is a win — before asking for more. Praise the
            attempt, not the volume or correctness. Use low-pressure reps like 2v1s, not full games,
            to build the habit before it’s tested under pressure.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white">Developing Leaders</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Level 3 and 4 communicators are grown deliberately, not discovered by accident. Identify
            players — especially halfbacks, hookers, and fullbacks — who are solid at Level 2, and
            give them specific organising responsibilities in training (“you make the width call
            this set”). Use Silent Game debriefs to let them articulate what the team needed to
            hear. Build Level 4 by asking organisers to predict the next problem before it happens,
            not just react to the current one.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Ready to build communication into your next session?</p>
        <p className="text-sm text-zinc-500">
          Plan it in the{' '}
          <Link href="/sessions" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            session planner
          </Link>
          , or ask the{' '}
          <Link href="/chat/ai" className="text-amber-400 hover:text-amber-300 transition-colors">
            AI coaching assistant
          </Link>
          {' '}for a session focused on one of the four levels above.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors related to `src/app/(resources)/communication/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(resources)/communication/page.tsx"
git commit -m "feat(communication): add player communication guide page"
```

---

### Task 2: Add sidebar nav entry

**Files:**
- Modify: `web/src/components/app-sidebar.tsx:24-82`

**Interfaces:**
- Consumes: the `/communication` route produced by Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Import the icon**

In `web/src/components/app-sidebar.tsx`, add `MessagesSquare` to the existing `lucide-react` import block (it currently starts `LayoutDashboard, BookOpen, PenTool, ...` around line 8):

```ts
  MessagesSquare,
```

Insert it alphabetically-adjacent to the other icons is not required by the codebase's convention (the existing list isn't alphabetized) — add it on its own line anywhere in the existing import list, e.g. directly after `Dumbbell,`.

- [ ] **Step 2: Add the nav item**

In the same file, `resourceItems` currently reads:

```ts
const resourceItems = [
  { href: '/positions', label: 'Positions Guide', icon: Shirt },
  { href: '/age-groups', label: 'Age Groups Guide', icon: Users },
  { href: '/skills', label: 'Fundamental Skills', icon: Dumbbell },
  { href: '/tag-rugby', label: 'Tag Rugby Rules', icon: Tag },
  { href: '/how-to', label: 'How-to & FAQ', icon: BookMarked },
]
```

Change it to:

```ts
const resourceItems = [
  { href: '/positions', label: 'Positions Guide', icon: Shirt },
  { href: '/age-groups', label: 'Age Groups Guide', icon: Users },
  { href: '/skills', label: 'Fundamental Skills', icon: Dumbbell },
  { href: '/communication', label: 'Player Communication', icon: MessagesSquare },
  { href: '/tag-rugby', label: 'Tag Rugby Rules', icon: Tag },
  { href: '/how-to', label: 'How-to & FAQ', icon: BookMarked },
]
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/app-sidebar.tsx
git commit -m "feat(communication): add sidebar nav entry"
```

---

### Task 3: Add sitemap entry

**Files:**
- Modify: `web/src/app/sitemap.ts:65-70`

**Interfaces:**
- Consumes: the `/communication` route produced by Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the sitemap entry**

In `web/src/app/sitemap.ts`, the static entries currently include (around line 65):

```ts
    {
      url: `${siteUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
```

Add a new entry directly after it, before the `...drillUrls,` spread:

```ts
    {
      url: `${siteUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/communication`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/sitemap.ts
git commit -m "feat(communication): list guide in sitemap"
```

---

### Task 4: Full verification pass

**Files:** none (verification only — may produce follow-up fix commits if issues are found).

**Interfaces:**
- Consumes: the completed page, nav entry, and sitemap entry from Tasks 1–3.
- Produces: nothing (terminal task).

- [ ] **Step 1: Run the full test suite**

Run: `cd web && npm run test`
Expected: all existing tests still pass (no regressions from the sidebar or sitemap edits).

- [ ] **Step 2: Start the dev server**

Run: `cd web && npm run dev` (background)
Expected: server starts without errors on the configured port.

- [ ] **Step 3: Manual browser check — desktop**

Navigate to `http://localhost:3000/communication` in a desktop viewport. Verify:
- Page renders with no console errors.
- All sections present in order: header, framework strip, See It / Say It / Solve It, all 4 levels, all 4 drills, coaching principles, Helping Quiet Players, Developing Leaders, footer CTA.
- Dark mode contrast is readable on every colour-banded card (sky, emerald, amber, rose, indigo).
- Clicking a "Drill: ... →" link under a Level scrolls to the matching drill card via its `#id` anchor.
- Footer links to `/sessions` and `/chat/ai` are correct.

- [ ] **Step 4: Manual browser check — mobile viewport and sidebar**

Resize to a mobile width (e.g. 390px). Verify:
- No horizontal scroll, cards stack to a single column, call glossary tables remain readable.
- Open the app sidebar (as a logged-in coach) and confirm "Player Communication" appears in the Resources group, between "Fundamental Skills" and "Tag Rugby Rules," and navigates to `/communication`.
- Visit `/communication` while logged out and confirm the public `(resources)` header renders (logo + Log in / Sign up, no "Back to app" link) and the page content is fully visible.

- [ ] **Step 5: Fix any issues found, then commit**

If any visual, contrast, or navigation issue is found in Steps 3–4, fix it directly in `web/src/app/(resources)/communication/page.tsx` (or `app-sidebar.tsx` if the nav entry is wrong), re-run Steps 3–4 to confirm, then:

```bash
git add "web/src/app/(resources)/communication/page.tsx" web/src/components/app-sidebar.tsx
git commit -m "fix(communication): address browser verification findings"
```

If no issues are found, no commit is needed for this task.
