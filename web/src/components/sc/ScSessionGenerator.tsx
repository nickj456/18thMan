'use client'

import { Dumbbell, Zap, RefreshCw, Trophy, Flame, Activity } from 'lucide-react'

interface QuickPrompt {
  label: string
  icon: React.ElementType
  prompt: string
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Pre-season strength block',
    icon: Dumbbell,
    prompt: 'Design a 6-week pre-season strength block for a semi-professional rugby league squad. Include full squad, gym access, 2 sessions per week. Focus on building max strength through the key movement patterns.',
  },
  {
    label: 'In-season gym session',
    icon: Zap,
    prompt: 'Give me a 45-minute in-season gym session for forwards. We play on Saturday so this is mid-week. Focus on maintaining strength without accumulating fatigue.',
  },
  {
    label: 'Conditioning finisher',
    icon: Flame,
    prompt: 'Design a 15-minute conditioning finisher for the end of a gym session that replicates rugby league game demands — repeated short sprints with brief recovery periods.',
  },
  {
    label: 'Off-season GPP block',
    icon: RefreshCw,
    prompt: 'Build an 8-week off-season general physical preparation (GPP) block. Goal is to build aerobic base, address movement quality, and start hypertrophy work. Full squad, gym and field access.',
  },
  {
    label: 'Speed & power session',
    icon: Trophy,
    prompt: 'Design a speed and power session for outside backs and halves. Include sprint mechanics work, plyometrics, and power lifts. 60 minutes total.',
  },
  {
    label: 'Weekly S&C schedule',
    icon: Activity,
    prompt: 'Create a full weekly S&C schedule for an amateur rugby league club during the in-season. We train Tuesday and Thursday evenings with a Saturday game. Show how to fit gym sessions around field sessions without overloading players.',
  },
]

interface ScSessionGeneratorProps {
  onSelectPrompt: (prompt: string) => void
}

export function ScSessionGenerator({ onSelectPrompt }: ScSessionGeneratorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Quick generate</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
          <button
            key={label}
            onClick={() => onSelectPrompt(prompt)}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 px-4 py-3 text-left transition-colors group"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
              <Icon size={15} className="text-orange-400" />
            </div>
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
