'use client'

import { useActionState, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedbackResponse, type SubmitFeedbackState } from './actions'
import type { FeedbackType } from '@/lib/supabase/types'

const RATING_LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
const DEVICE_ID_KEY = 'feedback-device-id'

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function FeedbackForm({
  token,
  feedbackType,
  questions,
}: {
  token: string
  feedbackType: FeedbackType
  questions: { id: string; text: string }[]
}) {
  const [state, formAction, isPending] = useActionState<SubmitFeedbackState, FormData>(
    submitFeedbackResponse.bind(null, token),
    {},
  )
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId())
  }, [])

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
        Thanks — your feedback has been submitted.
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="deviceId" value={deviceId} />

      {state.error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      {feedbackType === 'player_voice' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200">Who are you?</label>
          <div className="flex gap-4 text-sm text-zinc-400">
            <label className="flex items-center gap-2">
              <input type="radio" name="respondentType" value="player" required />
              I&apos;m the player
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="respondentType" value="parent" required />
              I&apos;m a parent
            </label>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <label className="text-sm text-zinc-200">{i + 1}. {q.text}</label>
            <div className="flex items-center justify-between gap-1">
              {RATING_LABELS.map((label, idx) => {
                const value = idx + 1
                return (
                  <label key={value} className="flex flex-col items-center gap-1 text-center flex-1">
                    <input type="radio" name={`rating-${q.id}`} value={value} required className="cursor-pointer" />
                    <span className="text-[10px] text-zinc-500 leading-tight">{value}</span>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>{RATING_LABELS[0]}</span>
              <span>{RATING_LABELS[4]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="text-sm font-medium text-zinc-200">
          Anything else you&apos;d like to share? <span className="text-zinc-600">(optional)</span>
        </label>
        <Textarea id="comment" name="comment" rows={4} />
      </div>

      <Button type="submit" disabled={isPending || !deviceId} className="w-full justify-center">
        {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
        Submit feedback
      </Button>
    </form>
  )
}
