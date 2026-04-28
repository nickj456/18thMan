'use client'

import { useState, useTransition } from 'react'
import { saveEmailSystemSettings } from '../actions'

interface EmailSettings {
  burst_threshold: number
  burst_window_minutes: number
  batch_threshold_drill: number
  batch_threshold_podcast: number
  batch_threshold_wellbeing: number
}

export function EmailSettingsForm({ settings }: { settings: EmailSettings | null }) {
  const defaults = settings ?? {
    burst_threshold: 3,
    burst_window_minutes: 5,
    batch_threshold_drill: 5,
    batch_threshold_podcast: 3,
    batch_threshold_wellbeing: 3,
  }

  const [values, setValues] = useState(defaults)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  function set(key: keyof EmailSettings, val: string) {
    setValues(v => ({ ...v, [key]: parseInt(val) || 1 }))
    setSaved(false)
  }

  function handleSave() {
    start(async () => {
      const result = await saveEmailSystemSettings(values)
      if (result.error) { setError(result.error); return }
      setSaved(true)
    })
  }

  const field = (label: string, key: keyof EmailSettings, hint: string) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <p className="text-xs text-zinc-600">{hint}</p>
      <input
        type="number"
        min={1}
        value={values[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
      />
    </div>
  )

  return (
    <div className="space-y-5 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notification email rate limiting</p>
      {field('Burst threshold', 'burst_threshold', 'Number of notifications before collapsing to a burst summary email')}
      {field('Burst window (minutes)', 'burst_window_minutes', 'Time window to count notifications in')}

      <div className="border-t border-zinc-800 pt-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Campaign batch thresholds</p>
        {field('Drills batch size', 'batch_threshold_drill', 'Number of approved public drills before a campaign draft is marked ready')}
        {field('Podcast batch size', 'batch_threshold_podcast', 'Podcast episodes per campaign draft')}
        {field('Wellbeing batch size', 'batch_threshold_wellbeing', 'Wellbeing resources per campaign draft')}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        {saved && <span className="text-xs text-emerald-500">Settings saved</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
