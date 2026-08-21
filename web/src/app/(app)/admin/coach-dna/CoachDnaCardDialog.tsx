'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function CoachDnaCardDialog({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false)
  const imageUrl = `/api/coach-dna/card-image/${attemptId}`

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View my Coach DNA card
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 bg-black border-zinc-800 overflow-hidden">
          <DialogTitle className="sr-only">Your Coach DNA card</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated image, not a static asset next/image can optimize */}
          <img src={imageUrl} alt="Your Coach DNA card" className="w-full h-auto block" />
          <div className="p-4 flex justify-end">
            <a
              href={imageUrl}
              download="coach-dna-card.png"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 bg-primary text-primary-foreground hover:bg-primary/80 h-8 gap-1.5 px-2.5"
            >
              Download
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
