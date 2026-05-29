'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminComposedCampaign } from '../actions'

const SEGMENTS = [
  { value: 'all', label: 'All users' },
  { value: 'coaches', label: 'Coaches only' },
  { value: 'club_admins', label: 'Club admins only' },
  { value: 'free', label: 'Free tier users' },
  { value: 'pro', label: 'Pro subscribers' },
]

export default function AdminEmailComposePage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [segment, setSegment] = useState('all')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!subject.trim()) { setError('Subject is required'); return }
    if (!body.trim()) { setError('Body is required'); return }
    setError('')
    startTransition(async () => {
      const result = await createAdminComposedCampaign({
        subject,
        body_html: body,
        cta_label: ctaLabel || undefined,
        cta_url: ctaUrl || undefined,
        segment,
      })
      if (result.error) { setError(result.error); return }
      router.push(`/admin/email/${result.id}`)
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Compose Campaign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Write a new email campaign for your coaches</p>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. New feature: Session PDF export is here"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Body <span className="text-zinc-600 normal-case font-normal">(HTML allowed)</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            placeholder="Write your email body here. You can use <strong>, <a>, <br>, <ul>, <li> tags."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA button label <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              value={ctaLabel}
              onChange={e => setCtaLabel(e.target.value)}
              placeholder="e.g. Try it now"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA URL <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
            <input
              type="url"
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://18thman.app/..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audience segment</label>
          <select
            value={segment}
            onChange={e => setSegment(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {SEGMENTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Creating...' : 'Create draft →'}
          </button>
        </div>
      </div>
    </div>
  )
}
