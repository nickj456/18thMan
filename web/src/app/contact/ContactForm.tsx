'use client'

import { useActionState } from 'react'
import { submitContact } from './actions'

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, {})

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
        Thanks — we&apos;ll be in touch soon.
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-medium text-[#7a7672]">Name <span className="text-[#e8560a]">*</span></label>
          <input
            id="name" name="name" required
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-medium text-[#7a7672]">Email <span className="text-[#e8560a]">*</span></label>
          <input
            id="email" name="email" type="email" required
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-xs font-medium text-[#7a7672]">Subject</label>
        <select
          id="subject" name="subject"
          className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
        >
          <option value="General">General</option>
          <option value="Bug Report">Bug Report</option>
          <option value="Billing">Billing</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-xs font-medium text-[#7a7672]">Message <span className="text-[#e8560a]">*</span></label>
        <textarea
          id="message" name="message" required rows={5}
          className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 resize-none"
        />
      </div>

      <button
        type="submit" disabled={isPending}
        className="px-6 py-2.5 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isPending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
