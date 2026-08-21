'use client'

import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
              className={cn(buttonVariants())}
            >
              Download
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
