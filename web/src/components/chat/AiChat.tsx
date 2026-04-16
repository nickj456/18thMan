'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Loader2, Bot, Copy, Check, BookOpen, Mic, MicOff, CalendarPlus } from 'lucide-react'
import { MessageResponse } from '@/components/ai-elements/message'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { saveSessionFromChat } from '@/app/(app)/chat/actions'

interface HistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface DrillSuggestion {
  id: string
  title: string
  difficulty: string | null
  age_group: string | null
  category: { name: string; slug: string } | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-700/50"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

function DrillSuggestions({ drills }: { drills: DrillSuggestion[] }) {
  if (drills.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-zinc-700/50">
      <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
        <BookOpen size={11} />
        From your drill library
      </p>
      <div className="flex flex-col gap-1.5">
        {drills.map(drill => (
          <Link
            key={drill.id}
            href={`/drills/${drill.id}`}
            className="flex items-center justify-between rounded-lg bg-zinc-700/40 hover:bg-indigo-500/15 border border-zinc-700/60 hover:border-indigo-500/40 px-3 py-2 transition-colors group"
          >
            <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">{drill.title}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {drill.category && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {drill.category.name}
                </span>
              )}
              {drill.difficulty && (
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded capitalize">
                  {drill.difficulty}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ role, userAvatar, userInitials, content, drills, onSave, isSaving, children }: {
  role: 'user' | 'assistant'
  userAvatar: string | null
  userInitials: string
  content?: string
  drills?: DrillSuggestion[]
  onSave?: () => void
  isSaving?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      {role === 'assistant' ? (
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={16} className="text-indigo-400" />
        </div>
      ) : (
        <Avatar size="sm" className="flex-shrink-0 mt-0.5">
          <AvatarImage src={userAvatar ?? undefined} />
          <AvatarFallback className="bg-zinc-700 text-xs">{userInitials}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        role === 'user'
          ? 'rounded-tr-sm bg-indigo-500 text-white text-sm leading-relaxed'
          : 'rounded-tl-sm bg-zinc-800 text-zinc-100'
      }`}>
        {role === 'assistant' && content && (
          <div className="flex justify-end mb-2 -mt-0.5">
            <CopyButton text={content} />
          </div>
        )}
        {children}
        {role === 'assistant' && drills && <DrillSuggestions drills={drills} />}
        {role === 'assistant' && content && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50 gap-2">
            {onSave ? (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-1.5 py-0.5 rounded hover:bg-emerald-500/10"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
                <span>{isSaving ? 'Saving…' : 'Save as session'}</span>
              </button>
            ) : <span />}
            <CopyButton text={content} />
          </div>
        )}
      </div>
    </div>
  )
}

function isSessionPlanLike(content: string): boolean {
  return (
    content.length > 400 &&
    /warm[\s-]up/i.test(content) &&
    (/\d+:\d+/.test(content) || /cool[\s-]down/i.test(content))
  )
}

interface AiChatProps {
  conversationId: string
  initialMessages: HistoryMessage[]
  userAvatar: string | null
  userName: string | null
  context?: 'sc' | 'general'
  pendingPrompt?: string
  onPendingPromptConsumed?: () => void
}

export function AiChat({ conversationId, initialMessages, userAvatar, userName, context, pendingPrompt, onPendingPromptConsumed }: AiChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // Map from user message index → drill suggestions for the following assistant reply
  const [drillMap, setDrillMap] = useState<Record<string, DrillSuggestion[]>>({})
  const prevStatusRef = useRef<string>('')
  const lastUserTextRef = useRef<string>('')
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null)
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const [limitHit, setLimitHit] = useState(false)

  const { messages: liveMessages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId, ...(context ? { context } : {}) },
    }),
    onError: (err) => {
      if (err.message?.includes('Daily limit') || err.message?.includes('Upgrade')) {
        setLimitHit(true)
      }
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const totalCount = initialMessages.length + liveMessages.length

  // When streaming finishes, fetch drill suggestions for the last user message
  useEffect(() => {
    const wasLoading = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    const isNowReady = status === 'ready'
    prevStatusRef.current = status
    if (!wasLoading || !isNowReady || !lastUserTextRef.current) return

    const query = lastUserTextRef.current
    // Find the last assistant message id to key the suggestions against
    const lastAssistant = [...liveMessages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) return
    const id = lastAssistant.id

    const controller = new AbortController()
    fetch(`/api/drills/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(r => r.json())
      .then((drills: DrillSuggestion[]) => {
        if (drills.length > 0) {
          setDrillMap(prev => ({ ...prev, [id]: drills }))
        }
      })
      .catch(() => {/* silently ignore — suggestion fetch is best-effort */})

    return () => controller.abort()
  }, [status, liveMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [totalCount])

  // When a quick-generate prompt is selected externally, fill the input
  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      setInput(pendingPrompt)
      onPendingPromptConsumed?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt])

  function handleSaveSession(msgId: string, content: string) {
    if (savedMsgIds.has(msgId)) return
    setSavingMsgId(msgId)
    setSaveError(null)
    startTransition(async () => {
      const result = await saveSessionFromChat(content)
      setSavingMsgId(null)
      if ('error' in result) {
        setSaveError(result.error)
      } else {
        setSavedMsgIds(prev => new Set(prev).add(msgId))
        router.push(`/sessions/${result.id}`)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) submit()
    }
  }

  function submit() {
    if (!input.trim() || isLoading) return
    lastUserTextRef.current = input
    sendMessage({ text: input })
    setInput('')
  }

  const { isListening, isSupported, interim, toggle: toggleVoice } = useVoiceInput(
    (text) => setInput(prev => prev ? prev + ' ' + text : text)
  )

  const userInitials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ME'

  const SUGGESTIONS = [
    'Suggest a warm-up drill for U16s',
    'How do I coach defensive line speed?',
    'Plan a 90 min pre-season session',
    'What drills improve ball handling?',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Bot size={24} className="text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold">18th Man AI Coach</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Ask me anything about rugby league — drills, tactics, session planning, player development.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {SUGGESTIONS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    lastUserTextRef.current = prompt
                    sendMessage({ text: prompt })
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-zinc-700 bg-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors text-zinc-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History from DB */}
        {initialMessages.map(message => (
          <MessageBubble
            key={message.id}
            role={message.role}
            userAvatar={userAvatar}
            userInitials={userInitials}
            content={message.role === 'assistant' ? message.content : undefined}
          >
            {message.role === 'user'
              ? <span>{message.content}</span>
              : <MessageResponse className="ai-prose">{message.content}</MessageResponse>
            }
          </MessageBubble>
        ))}

        {/* Live messages from useChat — render from parts */}
        {liveMessages.map(message => {
          const text = message.parts.map(p => p.type === 'text' ? p.text : '').join('')
          const canSave = message.role === 'assistant' && !savedMsgIds.has(message.id) && isSessionPlanLike(text)
          return (
            <MessageBubble
              key={message.id}
              role={message.role as 'user' | 'assistant'}
              userAvatar={userAvatar}
              userInitials={userInitials}
              content={message.role === 'assistant' ? text : undefined}
              drills={message.role === 'assistant' ? drillMap[message.id] : undefined}
              onSave={canSave ? () => handleSaveSession(message.id, text) : undefined}
              isSaving={savingMsgId === message.id}
            >
              {message.role === 'user'
                ? <span>{message.parts.map((p, i) => p.type === 'text' ? <span key={i}>{p.text}</span> : null)}</span>
                : <MessageResponse className="ai-prose">{text}</MessageResponse>
              }
            </MessageBubble>
          )
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-indigo-400" />
            </div>
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={14} className="animate-spin text-zinc-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4 space-y-3">
        {saveError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{saveError}</p>
        )}
        {limitHit && (
          <UpgradePrompt
            feature="AI coaching chat"
            description="You've reached the 20 messages/day limit on the free plan. Upgrade your club for unlimited AI chat."
          />
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : 'Ask your AI coach… (Enter to send, Shift+Enter for new line)'}
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={isLoading || limitHit}
            />
            {isListening && interim && (
              <p className="absolute bottom-full left-0 mb-1 text-xs text-zinc-500 italic truncate max-w-full px-1">
                {interim}
              </p>
            )}
          </div>
          {isSupported && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleVoice}
              disabled={isLoading || limitHit}
              className={`flex-shrink-0 h-10 w-10 p-0 transition-colors ${
                isListening
                  ? 'text-[#e8560a] animate-pulse hover:text-[#e8560a]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </Button>
          )}
          <Button
            size="sm"
            onClick={submit}
            disabled={isLoading || !input.trim() || limitHit}
            className="flex-shrink-0 h-10 w-10 p-0"
          >
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}
