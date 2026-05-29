import Link from 'next/link'
import { Target, ChevronRight, ArrowRight } from 'lucide-react'

const CATEGORY_COLOUR: Record<string, string> = {
  Attacking: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Defensive: 'text-red-400 bg-red-500/10 border-red-500/20',
  'Ball Handling': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'Set Piece & Kicking': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Fitness & Game Sense': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const TOPIC_CATEGORY: Record<string, string> = {
  'Offloading': 'Attacking', 'Support Play': 'Attacking', 'Line Breaks & Edge Play': 'Attacking', 'Dummy Half Play': 'Attacking',
  'Tackle Technique': 'Defensive', 'Line Speed & Drift Defence': 'Defensive', 'Marker Defence': 'Defensive', 'Goal Line Defence': 'Defensive',
  'Edge Defence': 'Defensive', 'Rush Defence': 'Defensive', 'Blitz Defence': 'Defensive',
  'Pass Accuracy': 'Ball Handling', 'Handling Under Pressure': 'Ball Handling', 'Catching High Balls': 'Ball Handling',
  'Kick-Off Receipts': 'Set Piece & Kicking', 'Grubber Kicks': 'Set Piece & Kicking', 'Bomb Kicks': 'Set Piece & Kicking', 'Scrum Technique': 'Set Piece & Kicking',
  'Agility & Conditioning': 'Fitness & Game Sense', 'Decision Making': 'Fitness & Game Sense', 'Game Management': 'Fitness & Game Sense',
}

export function FocusWidget({
  focus,
}: {
  focus: { id: string; topic: string; description: string; next_topic: string | null; drill_ids: string[] } | null
}) {
  if (!focus) {
    return (
      <Link
        href="/weekly-focus"
        className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
      >
        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
          <Target size={16} className="text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 font-medium">Weekly Focus</p>
          <p className="text-sm text-zinc-600">Not set this week</p>
        </div>
        <ArrowRight size={14} className="text-zinc-700 group-hover:text-indigo-400 transition-colors shrink-0" />
      </Link>
    )
  }

  const category = TOPIC_CATEGORY[focus.topic] ?? null
  const colour = category ? CATEGORY_COLOUR[category] : null

  return (
    <Link
      href="/weekly-focus"
      className="block rounded-xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all overflow-hidden group"
    >
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-indigo-400" />
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Weekly Focus</span>
          </div>
          {colour && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colour}`}>
              {category}
            </span>
          )}
        </div>
        <p className="text-base font-bold text-white">{focus.topic}</p>
        <p className="text-xs text-zinc-500 line-clamp-2">{focus.description}</p>
      </div>
      {focus.next_topic && (
        <div className="border-t border-zinc-800 px-4 py-2 bg-zinc-800/30 flex items-center gap-1.5">
          <ChevronRight size={11} className="text-zinc-600" />
          <span className="text-[11px] text-zinc-500">Next week:</span>
          <span className="text-[11px] text-zinc-400">{focus.next_topic}</span>
          <ArrowRight size={11} className="text-zinc-700 group-hover:text-indigo-400 transition-colors ml-auto" />
        </div>
      )}
    </Link>
  )
}
