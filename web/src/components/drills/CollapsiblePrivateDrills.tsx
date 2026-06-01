'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DrillCard } from '@/components/drills/DrillCard'
import { drillStats } from '@/lib/drills'
import type { DrillWithRelations } from '@/lib/supabase/types'

interface CollapsiblePrivateDrillsProps {
  drills: DrillWithRelations[]
  clubName: string
}

export function CollapsiblePrivateDrills({ drills, clubName }: CollapsiblePrivateDrillsProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group w-full text-left"
      >
        <span className="text-sm font-semibold">🔒 {clubName} Drills</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {drills.length} private
        </span>
        <span className="ml-auto text-muted-foreground group-hover:text-white transition-colors">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {drills.map(drill => {
            const { avgRating, commentCount } = drillStats(drill)
            return (
              <DrillCard
                key={drill.id}
                drill={drill}
                avgRating={avgRating}
                commentCount={commentCount}
                showClubBadge
              />
            )
          })}
        </div>
      )}

      <div className="border-t border-border pt-2" />
    </div>
  )
}
