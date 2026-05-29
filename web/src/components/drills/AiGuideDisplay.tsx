import { Sparkles, CheckSquare, MessageSquare, Zap, RefreshCw, Package } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import type { AiGuide } from '@/lib/supabase/types'

interface AiGuideDisplayProps {
  guide: AiGuide
}

const sections = [
  {
    key: 'how_to_perform' as const,
    label: 'How to Perform',
    icon: CheckSquare,
    ordered: true,
  },
  {
    key: 'coaching_points' as const,
    label: 'Coaching Points',
    icon: MessageSquare,
    ordered: false,
  },
  {
    key: 'key_cues' as const,
    label: 'Key Cues',
    icon: Zap,
    ordered: false,
  },
  {
    key: 'variations' as const,
    label: 'Progressions & Variations',
    icon: RefreshCw,
    ordered: false,
  },
  {
    key: 'equipment' as const,
    label: 'Equipment',
    icon: Package,
    ordered: false,
  },
]

export function AiGuideDisplay({ guide }: AiGuideDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-semibold text-lg">AI Coaching Guide</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Generated from video transcript
        </span>
      </div>

      {/* Overview */}
      {guide.overview && (
        <p className="text-muted-foreground leading-relaxed">{guide.overview}</p>
      )}

      <Separator />

      {/* Sections */}
      <div className="space-y-6">
        {sections.map(({ key, label, icon: Icon, ordered }) => {
          const items = guide[key]
          if (!items || items.length === 0) return null

          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">{label}</h3>
              </div>
              {ordered ? (
                <ol className="space-y-2 ml-4">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 size-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground pt-0.5">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="space-y-1.5 ml-4">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0 mt-1.5 size-1.5 rounded-full bg-primary/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
