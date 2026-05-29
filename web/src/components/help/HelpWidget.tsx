'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { HelpCircle, X, Send, Bot } from 'lucide-react'

const DISMISSED_KEY = 'helpWidgetDismissed'
const PULSE_KEY = 'helpWidgetPulseSeen'
const SHOW_EVENT = 'show-help-widget'

const QUICK_CHIPS = [
  'How do I use the Drill Designer?',
  'I have a billing question',
  'Tell me about the GameSense methodology',
]

// Splits message text on the admin email and renders each part safely as React nodes,
// replacing the email with a proper <a> element. No innerHTML — no XSS risk.
function MessageText({ text }: { text: string }) {
  const EMAIL = 'hello@18thman.app'
  const parts = text.split(EMAIL)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <a
              href={`mailto:${EMAIL}`}
              className="text-[#e8560a] underline underline-offset-2 hover:text-[#d14d09]"
            >
              {EMAIL}
            </a>
          )}
        </span>
      ))}
    </>
  )
}

export function HelpWidget() {
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [pulseSeen, setPulseSeen] = useState(true)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [hasOpened, setHasOpened] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
    const seen = localStorage.getItem(PULSE_KEY) === 'true'
    setPulseSeen(seen)
    if (!seen) {
      setTimeout(() => {
        localStorage.setItem(PULSE_KEY, 'true')
        setPulseSeen(true)
      }, 3000)
    }

    const handler = () => {
      localStorage.removeItem(DISMISSED_KEY)
      setDismissed(false)
      setOpen(true)
    }
    window.addEventListener(SHOW_EVENT, handler)
    return () => window.removeEventListener(SHOW_EVENT, handler)
  }, [])

  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: '/api/help-chat' }),
    onError: (error) => {
      const msg = error?.message ?? ''
      // Parse rate limit info if embedded in error message
      const resetMatch = msg.match(/"resetAt"\s*:\s*"([^"]+)"/)
      const resetAt = resetMatch ? new Date(resetMatch[1]) : null
      const timeStr = resetAt
        ? resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'later'
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setRateLimitMsg(
          `You've reached the support limit for now. Try again after ${timeStr}, or email hello@18thman.app directly.`
        )
      }
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleOpen() {
    setOpen(true)
    setHasOpened(true)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    setOpen(false)
  }

  function handleChip(chip: string) {
    setInput(chip)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || rateLimitMsg) return
    sendMessage({ text: input })
    setInput('')
  }

  if (dismissed) return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className={[
            'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#e8560a] text-white shadow-lg flex items-center justify-center hover:bg-[#d14d09] transition-colors',
            !pulseSeen ? 'animate-pulse' : '',
          ].join(' ')}
          aria-label="Open support"
        >
          <HelpCircle size={22} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
                <Bot size={14} className="text-[#e8560a]" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">18th Man Support</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !rateLimitMsg && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 text-center">Ask anything about the platform, your account, or GameSense coaching.</p>
                {!hasOpened && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => handleChip(chip)}
                        className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-[#e8560a]/50 hover:text-zinc-200 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(m => {
              const textContent = m.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join('')
              return (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-5 h-5 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                      <Bot size={10} className="text-[#e8560a]" />
                    </div>
                  )}
                  <div
                    className={[
                      'max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed',
                      m.role === 'user'
                        ? 'bg-[#e8560a]/10 border border-[#e8560a]/20 text-zinc-200'
                        : 'bg-zinc-800 text-zinc-300',
                    ].join(' ')}
                  >
                    <MessageText text={textContent} />
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                  <Bot size={10} className="text-[#e8560a]" />
                </div>
                <div className="bg-zinc-800 px-3 py-2 rounded-xl">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {rateLimitMsg && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {rateLimitMsg}{' '}
                <a href="mailto:hello@18thman.app" className="underline underline-offset-2 hover:text-amber-200">
                  hello@18thman.app
                </a>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-zinc-800 shrink-0"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question…"
              disabled={isLoading || !!rateLimitMsg}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#e8560a]/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !!rateLimitMsg}
              className="w-8 h-8 rounded-lg bg-[#e8560a] text-white flex items-center justify-center hover:bg-[#d14d09] transition-colors disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={13} />
            </button>
          </form>

          {/* Dismiss */}
          <div className="flex justify-center pb-2.5 shrink-0">
            <button
              onClick={handleDismiss}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Don't show this
            </button>
          </div>
        </div>
      )}
    </>
  )
}
