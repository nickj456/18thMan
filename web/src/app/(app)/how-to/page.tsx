'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  PenTool, CalendarDays, MessageSquare, Sparkles, Users, Users2,
  BookOpen, ChevronDown, FileDown, Lock, Lightbulb, RotateCcw,
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ElementType
  colour: string
  title: string
  items: { q: string; a: string | React.ReactNode }[]
}

const sections: Section[] = [
  {
    id: 'drills',
    icon: PenTool,
    colour: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    title: 'Drill Designer',
    items: [
      {
        q: 'How do I create a drill?',
        a: 'Go to Drill Designer in the sidebar. Give your drill a title, pick a category and difficulty, then use the canvas to draw it up. You can add players, cones, arrows, and movement paths. Hit Save when you\'re done.',
      },
      {
        q: 'What do the canvas tools do?',
        a: 'Select (arrow) — move and resize elements. Player (circle) — adds a player marker. Cone — adds a cone. Arrow — draws a movement or pass line. Text — adds a label. Use the colour swatches to change the colour of any element before placing it.',
      },
      {
        q: 'Can I add a YouTube video to a drill?',
        a: 'Yes — paste a YouTube URL into the Video URL field when saving. The video thumbnail becomes the drill\'s preview image, and the channel name is shown as attribution. An AI coaching guide is generated automatically from the video.',
      },
      {
        q: 'What is a club-only drill?',
        a: 'When saving a drill, set visibility to "Club only". The drill is hidden from the public library and only visible to members of your club. Requires a club subscription.',
      },
      {
        q: 'What is the AI guide on a drill?',
        a: 'For drills with a YouTube video, 18th Man uses AI to generate a coaching guide: how to perform the drill, key coaching points, cues to give players, variations, and equipment needed. It generates in the background after you save.',
      },
    ],
  },
  {
    id: 'sessions',
    icon: CalendarDays,
    colour: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title: 'Session Planner',
    items: [
      {
        q: 'How do I build a session plan?',
        a: 'Go to Sessions → New Session. Give it a title, then search for drills to add. Set a duration for each drill. The total session time is calculated automatically. You can reorder drills by dragging them.',
      },
      {
        q: 'How do I share a session plan?',
        a: 'Open a session and click Share. This generates a private link anyone can view without logging in — useful for sending to assistant coaches or printing before training.',
      },
      {
        q: 'How do I export a session as a PDF?',
        a: 'Open a session and click Export PDF. A clean printable PDF is generated with all drills, durations, canvas drawings, and coaching notes. Requires a club subscription.',
      },
      {
        q: 'What is AI Session Summary?',
        a: 'On the session detail page, you can generate an AI summary. This produces a brief overview of the session\'s focus areas, key themes across the drills, and suggested talking points for your pre-training team talk.',
      },
    ],
  },
  {
    id: 'clubs',
    icon: Users,
    colour: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: 'Clubs',
    items: [
      {
        q: 'How do I join a club?',
        a: 'Go to My Club in the sidebar. Search for your club by name and send a join request. A club admin or coach needs to accept your request before you gain access to club features.',
      },
      {
        q: 'How do I create a club?',
        a: 'Go to My Club → Create Club. Enter a name for your club. You become the first member with coach permissions. You can then invite other coaches.',
      },
      {
        q: 'Can I be in multiple clubs?',
        a: 'Currently each user can be a member of one club at a time. If you need to switch clubs, leave your current club first.',
      },
    ],
  },
  {
    id: 'groups',
    icon: Users2,
    colour: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    title: 'Coaching Groups',
    items: [
      {
        q: 'What are coaching groups?',
        a: 'Groups let you collaborate with a subset of coaches within your club — for example, a Forwards Unit group or an Attack Coaches group. Groups have their own shared session plans that all members can view and edit. Requires a club subscription.',
      },
      {
        q: 'How do I create a group?',
        a: 'Go to My Groups → New Group. You must be a member of a club first. Give the group a name and invite coaches from your club.',
      },
      {
        q: 'What is collaborative session editing?',
        a: 'Multiple coaches in a group can edit the same session plan. To prevent conflicts, one coach can lock a session while editing — others see who has it locked and can request access.',
      },
      {
        q: 'What is AI Session Guidance (GameSense)?',
        a: 'On a group page, the AI Guidance tool analyses your recent training history and suggests a focus area for your next session. It produces a full session structure: warm-up, two modified games, a competition, and review points — all tailored to what your group has been working on.',
      },
    ],
  },
  {
    id: 'chat',
    icon: MessageSquare,
    colour: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    title: 'Coach Chat',
    items: [
      {
        q: 'What is the AI coaching assistant?',
        a: 'The AI coach is a rugby league specialist you can ask anything — technique questions, session ideas, player development advice, rules queries. Free accounts get 20 messages per day.',
      },
      {
        q: 'What is the Community section?',
        a: 'Community is a shared forum for all coaches on 18th Man. Start a discussion, ask questions, or share ideas. Threads are visible to all users.',
      },
    ],
  },
  {
    id: 'subscription',
    icon: Lock,
    colour: 'text-zinc-400 bg-zinc-500/10 border-zinc-700',
    title: 'Free vs Club',
    items: [
      {
        q: 'What do I get for free?',
        a: 'Up to 20 drills, unlimited access to the public drill library, unlimited session planning, 20 AI coaching messages per day, full community access, and your profile page.',
      },
      {
        q: 'What does the club subscription unlock?',
        a: 'Unlimited drills, club-private drills, coaching groups, collaborative sessions, AI session guidance (GameSense), PDF export, and unlimited AI coaching chat. One subscription covers your whole club.',
      },
      {
        q: 'What is the 48-hour trial?',
        a: 'After you create your 3rd drill, 18th Man automatically unlocks all premium features for 48 hours so you can experience the full platform before committing. No credit card required.',
      },
    ],
  },
  {
    id: 'tips',
    icon: Lightbulb,
    colour: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    title: 'Tips & Tricks',
    items: [
      {
        q: 'How do I rate a drill?',
        a: 'Open any drill from the library and scroll to the ratings section at the bottom. Leave a star rating and an optional comment. The drill author is notified when you rate their drill.',
      },
      {
        q: 'Can I save drills from the public library?',
        a: 'Yes — hit the bookmark icon on any drill card to save it to your collection. View your saved drills from the Drill Library with the Saved filter.',
      },
      {
        q: 'How do I get the most from the AI coach?',
        a: 'Be specific. Instead of "give me a drill", try "give me a 15-minute passing drill for 12 players under-16s focusing on ball movement across the ruck". The more context you give, the better the response.',
      },
      {
        q: 'Where can I suggest new features?',
        a: 'The platform is actively being developed. Get in touch via the community chat or email hello@18thman.app — your feedback directly shapes what gets built next.',
      },
    ],
  },
]

function AccordionItem({ q, a }: { q: string; a: string | React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function HowToPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="app-heading text-2xl">How to use 18th Man</h1>
        <p className="text-sm text-zinc-500">Guides and answers to common questions about every part of the platform.</p>
      </div>

      {sections.map(section => {
        const Icon = section.icon
        return (
          <div key={section.id} className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className={`flex items-center gap-3 px-5 py-4 border-b border-zinc-800`}>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${section.colour}`}>
                <Icon size={15} />
              </div>
              <h2 className="text-sm font-semibold text-white">{section.title}</h2>
            </div>
            <div className="bg-zinc-900">
              {section.items.map(item => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        )
      })}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-1.5">
        <p className="text-sm font-medium text-zinc-300">Still have a question?</p>
        <p className="text-sm text-zinc-500">
          Ask in the <Link href="/chat/community" className="text-indigo-400 hover:text-indigo-300">community</Link> or start a conversation with the <Link href="/chat/ai" className="text-amber-400 hover:text-amber-300">AI coach</Link>.
        </p>
      </div>
    </div>
  )
}
