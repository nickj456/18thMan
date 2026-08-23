'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ImageStatus = 'loading' | 'loaded' | 'error'

export function CoachDnaCardDialog({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false)
  const [imageStatus, setImageStatus] = useState<ImageStatus>('loading')
  const imageUrl = `/api/coach-dna/card-image/${attemptId}`

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View my Coach DNA card
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next)
          if (next) setImageStatus('loading')
        }}
      >
        <DialogContent className="max-w-2xl p-0 bg-black border-zinc-800 overflow-hidden">
          <DialogTitle className="sr-only">Your Coach DNA card</DialogTitle>
          {imageStatus === 'loading' && (
            <div className="aspect-[1200/630] w-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-zinc-500" />
            </div>
          )}
          {imageStatus === 'error' && (
            <div className="aspect-[1200/630] w-full flex items-center justify-center p-6 text-center">
              <p className="text-sm text-zinc-400">
                Couldn&apos;t load your Coach DNA card. Try closing and reopening this dialog.
              </p>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated image, not a static asset next/image can optimize */}
          <img
            src={imageUrl}
            alt="Your Coach DNA card"
            className={cn('w-full h-auto block', imageStatus !== 'loaded' && 'hidden')}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
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
