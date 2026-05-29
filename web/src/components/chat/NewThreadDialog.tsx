'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { createThread } from '@/app/(app)/chat/actions'
import { toast } from 'sonner'

export function NewThreadDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    startTransition(async () => {
      const result = await createThread(title, message)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setOpen(false)
        setTitle('')
        setMessage('')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus size={15} className="mr-2" />
        New thread
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new discussion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="thread-title">Title</Label>
            <Input
              id="thread-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Best drills for improving kick-chase"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="thread-message">Opening message</Label>
            <Textarea
              id="thread-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Share your thoughts, questions, or ideas…"
              className="h-28 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !message.trim()}>
              {isPending ? <><Loader2 size={13} className="mr-2 animate-spin" />Posting…</> : 'Post thread'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
