'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { DownloadForm } from './DownloadForm'

const SESSION_KEY = '18m_exit_intent_shown'

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        sessionStorage.setItem(SESSION_KEY, '1')
        setVisible(true)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) setVisible(false) }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-700 p-7"
        style={{ background: 'var(--surface)' }}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Download className="size-5 text-[#e8560a]" />
          <span className="text-xs font-bold tracking-widest text-[#e8560a] uppercase">Free Download</span>
        </div>

        <h2 className="text-xl font-bold text-white mb-2 leading-snug">
          Before you go — grab a free 4-week session plan
        </h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Ready-made drills, timings, and coach notes. Enter your email and we&apos;ll send it straight to you.
        </p>

        <DownloadForm />
      </div>
    </div>
  )
}
