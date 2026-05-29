'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface VideoModalProps {
  videoId: string
  title: string
  open: boolean
  onClose: () => void
}

export function VideoModal({ videoId, title, open, onClose }: VideoModalProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl p-0 bg-black border-zinc-800 overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="aspect-video w-full">
          {open && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
