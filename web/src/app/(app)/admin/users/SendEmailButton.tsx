'use client'

import { useState, useTransition } from 'react'
import { Mail, Loader2, X, Send } from 'lucide-react'
import { sendDirectEmail } from './actions'
import { toast } from 'sonner'

interface SendEmailButtonProps {
  userId: string
  displayName: string
}

export function SendEmailButton({ userId, displayName }: SendEmailButtonProps) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setSubject('')
    setBody('')
    setError('')
  }

  function handleSend() {
    if (!subject.trim()) { setError('Subject is required'); return }
    if (!body.trim()) { setError('Message body is required'); return }
    setError('')
    startTransition(async () => {
      const result = await sendDirectEmail(userId, subject, body)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(`Email sent to ${displayName}`)
      close()
    })
  }

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-white">Email {displayName}</h3>
              <p className="text-xs text-zinc-500 mt-1">Sent from hello@18thman.app</p>
            </div>
            <button onClick={close} disabled={isPending} className="text-zinc-600 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Following up on your session plan"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Message <span className="text-zinc-600 normal-case font-normal">(HTML allowed)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="Write your message here. You can use <strong>, <a>, <br>, <ul>, <li> tags."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {isPending ? 'Sending…' : 'Send email'}
            </button>
            <button
              onClick={close}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="p-1.5 rounded-lg text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
      title={`Email ${displayName}`}
    >
      <Mail size={14} />
    </button>
  )
}
