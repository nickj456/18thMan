'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { dismissAnnouncement } from '@/lib/announcements/actions'
import type { ActiveAnnouncement } from '@/lib/announcements/actions'

export function AnnouncementModal({ announcement }: { announcement: ActiveAnnouncement | null }) {
  const [open, setOpen] = useState(announcement !== null)
  const [dismissing, setDismissing] = useState(false)

  if (!announcement) return null

  async function handleDismiss() {
    setDismissing(true)
    setOpen(false)
    await dismissAnnouncement(announcement!.id)
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) handleDismiss() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Announcement</DialogTitle>
          <DialogDescription>{announcement.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col-reverse">
          <Button variant="outline" onClick={handleDismiss} disabled={dismissing} className="w-full">
            Dismiss
          </Button>
          {announcement.linkUrl && (
            <Button
              render={<Link href={announcement.linkUrl} onClick={handleDismiss} />}
              className="w-full h-auto py-2 whitespace-normal text-center"
            >
              {announcement.linkLabel ?? 'Learn more'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
