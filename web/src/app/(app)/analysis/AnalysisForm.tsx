'use client'

import { useState } from 'react'
import { submitAnalysisRequest } from './actions'

const PRICES = {
  'match-review-standard': 50,
  'match-review-express': 80,
  'opposition-scouting-standard': 75,
  'opposition-scouting-express': 110,
} as const

type ServiceType = 'match-review' | 'opposition-scouting'
type Turnaround = 'standard' | 'express'

interface AnalysisFormProps {
  isMember: boolean
}

export function AnalysisForm({ isMember }: AnalysisFormProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('match-review')
  const [turnaround, setTurnaround] = useState<Turnaround>('standard')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceKey = `${serviceType}-${turnaround}` as keyof typeof PRICES
  const basePrice = PRICES[priceKey]
  const price = isMember ? basePrice - 10 : basePrice

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('serviceType', serviceType)
    formData.set('turnaround', turnaround)
    const result = await submitAnalysisRequest(formData)
    setPending(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">Request received!</h2>
        <p className="text-muted-foreground mb-4">
          We&apos;ll review your footage and send a payment link to your email. Once payment is confirmed, your report will be delivered within the chosen timeframe.
        </p>
        <p className="text-sm text-muted-foreground">
          Questions? Email <a href="mailto:analysis@18thman.app" className="text-[#e8560a] hover:underline">analysis@18thman.app</a>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6">

      {/* Service type */}
      <div>
        <label className="block text-sm font-semibold mb-3">Service type</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'match-review', label: 'Match Review', sub: 'Individual player analysis' },
            { value: 'opposition-scouting', label: 'Opposition Scouting', sub: 'Pre-match opponent breakdown' },
          ] as { value: ServiceType; label: string; sub: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setServiceType(opt.value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                serviceType === opt.value
                  ? 'border-[#e8560a] bg-[rgba(232,86,10,0.08)]'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Turnaround */}
      <div>
        <label className="block text-sm font-semibold mb-3">Turnaround</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'standard', label: 'Standard — 72hrs', sub: serviceType === 'match-review' ? `£${isMember ? 40 : 50}` : `£${isMember ? 65 : 75}` },
            { value: 'express', label: 'Express — 24hrs', sub: serviceType === 'match-review' ? `£${isMember ? 70 : 80}` : `£${isMember ? 100 : 110}` },
          ] as { value: Turnaround; label: string; sub: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTurnaround(opt.value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                turnaround === opt.value
                  ? 'border-[#e8560a] bg-[rgba(232,86,10,0.08)]'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs font-bold text-[#e8560a] mt-0.5">{opt.sub}{isMember ? ' (member price)' : ''}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">Total to pay</span>
        <div className="text-right">
          <span className="text-xl font-bold">£{price}</span>
          {isMember && <span className="ml-2 text-xs text-[#e8560a]">(£10 member discount applied)</span>}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold mb-1.5">
          {serviceType === 'match-review' ? 'Player name' : 'Team / Club name'}
          <span className="text-[#e8560a] ml-1">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder={serviceType === 'match-review' ? 'e.g. Jamie Thompson' : 'e.g. Wigan Warriors U18s'}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40"
        />
      </div>

      {/* Match date */}
      <div>
        <label htmlFor="matchDate" className="block text-sm font-semibold mb-1.5">
          {serviceType === 'match-review' ? 'Match / training date' : 'Footage date'}
          <span className="text-[#e8560a] ml-1">*</span>
        </label>
        <input
          id="matchDate"
          name="matchDate"
          type="date"
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40"
        />
      </div>

      {/* Opposition */}
      <div>
        <label htmlFor="opposition" className="block text-sm font-semibold mb-1.5">
          {serviceType === 'match-review' ? 'Opposition (who they played)' : 'Upcoming opposition'}
          <span className="text-[#e8560a] ml-1">*</span>
        </label>
        <input
          id="opposition"
          name="opposition"
          type="text"
          required
          placeholder="e.g. St Helens U18s"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40"
        />
      </div>

      {/* Competition */}
      <div>
        <label htmlFor="competition" className="block text-sm font-semibold mb-1.5">
          Competition / level
          <span className="text-[#e8560a] ml-1">*</span>
        </label>
        <input
          id="competition"
          name="competition"
          type="text"
          required
          placeholder="e.g. North West Counties U18s League"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40"
        />
      </div>

      {/* Video link */}
      <div>
        <label htmlFor="videoLink" className="block text-sm font-semibold mb-1.5">
          Video link (YouTube unlisted or Google Drive)
          <span className="text-[#e8560a] ml-1">*</span>
        </label>
        <input
          id="videoLink"
          name="videoLink"
          type="url"
          required
          placeholder="https://youtu.be/... or https://drive.google.com/..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40"
        />
        <p className="mt-1 text-xs text-muted-foreground">See the instructions below for how to share footage privately.</p>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold mb-1.5">
          Anything specific to focus on? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. Focus on defensive positioning in sets 3–6, or look at her offloading game..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white font-bold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {pending ? 'Submitting…' : `Submit request — £${price}`}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        We&apos;ll send a payment link to your email once we&apos;ve confirmed the request. Report delivered within the chosen timeframe after payment.
      </p>
    </form>
  )
}
