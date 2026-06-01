'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

const AGE_GROUPS = [
  'Mini/Mod (U8–U10)',
  'U12',
  'U14',
  'U16',
  'U18',
  'Open Age / Seniors',
]

export function DownloadForm() {
  const [email, setEmail] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leads/session-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, age_group: ageGroup }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data?.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 py-2">
        <CheckCircle className="size-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-white">Check your inbox.</p>
          <p className="text-sm text-zinc-400 mt-0.5">
            Week 1 is on its way. Weeks 2, 3, and 4 follow each week — check your spam folder if it doesn&apos;t arrive within a minute.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e8560a] disabled:opacity-50"
        />
        <select
          value={ageGroup}
          onChange={e => setAgeGroup(e.target.value)}
          disabled={status === 'loading'}
          className="sm:w-44 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-[#e8560a] disabled:opacity-50"
        >
          <option value="">Age group</option>
          {AGE_GROUPS.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !email}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#e8560a] text-white text-sm font-semibold hover:bg-[#d04d09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Send me the plan \u2192'
        )}
      </button>

      <p className="text-xs text-zinc-600">No account needed. No spam. Unsubscribe any time.</p>
    </form>
  )
}
