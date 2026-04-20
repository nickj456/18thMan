'use client'

import { useState } from 'react'
import { Copy, Check, ImageIcon, ExternalLink } from 'lucide-react'

export function SharePanel({
  focusId,
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

  const cardUrl = `/api/weekly-focus/${focusId}/card`

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Share</h2>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
        {/* WhatsApp caption */}
        <div className="space-y-2">
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

        {/* Image card */}
        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <p className="text-xs text-zinc-500 font-medium">Image card (for Instagram / WhatsApp)</p>
          <div className="flex gap-2">
            <a
              href={cardUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
            >
              <ExternalLink size={12} /> View card
            </a>
            <a
              href={cardUrl}
              download={`focus-${topic.toLowerCase().replace(/\s+/g, '-')}.png`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors"
            >
              <ImageIcon size={12} /> Download
            </a>
          </div>
          <p className="text-[11px] text-zinc-600">Screenshot or download to share in WhatsApp and Instagram.</p>
        </div>
      </div>
    </section>
  )
}
