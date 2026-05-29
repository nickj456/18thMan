'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'
import { saveDrill, unsaveDrill } from '@/app/(discover)/drills/actions'

interface SaveDrillButtonProps {
  drillId: string
  initialSaved: boolean
}

export function SaveDrillButton({ drillId, initialSaved }: SaveDrillButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      setSaved(prev => !prev)
      if (saved) {
        await unsaveDrill(drillId)
      } else {
        await saveDrill(drillId)
      }
    })
  }

  return (
    <Button
      variant={saved ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="gap-2"
    >
      <Bookmark className={`size-4 ${saved ? 'fill-current' : ''}`} />
      {saved ? 'Saved' : 'Save drill'}
    </Button>
  )
}
