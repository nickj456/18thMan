'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function SharePanel({
  focusId: _focusId,
  topic,
  description,
  nextTopic,
  clubName,
}: {
  focusId: string
  topic: string
  description: string
  nextTopic: string | null
  clubName: string
}) {
  const [copied, setCopied] = useState(false)

  const caption = [
    `🏉 *This week's training focus: ${topic}*`,
    '',
    description,
    '',
    nextTopic ? `👀 *Next week:* ${nextTopic}` : null,
    '',
    `— ${clubName} | Powered by 18th Man`,
  ].filter(l => l !== null).join('\n')

  async function handleCopy() {
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Share</h2>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <p className="text-xs text-zinc-500 font-medium">WhatsApp caption</p>
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-800/60 rounded-lg p-3 font-sans">
          {caption}
        </pre>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy caption'}
        </button>
      </div>
    </section>
  )
}
