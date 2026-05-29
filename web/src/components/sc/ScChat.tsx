'use client'

import { useState } from 'react'
import { AiChat } from '@/components/chat/AiChat'
import { ScSessionGenerator } from '@/components/sc/ScSessionGenerator'

interface HistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ScChatProps {
  conversationId: string
  initialMessages: HistoryMessage[]
  userAvatar: string | null
  userName: string | null
}

export function ScChat({ conversationId, initialMessages, userAvatar, userName }: ScChatProps) {
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined)
  const showGenerator = initialMessages.length === 0

  return (
    <div className="flex flex-col h-full">
      {showGenerator && (
        <div className="flex-shrink-0 p-4 border-b border-zinc-800">
          <ScSessionGenerator onSelectPrompt={(prompt) => setPendingPrompt(prompt)} />
        </div>
      )}
      <div className="flex-1 min-h-0">
        <AiChat
          conversationId={conversationId}
          initialMessages={initialMessages}
          userAvatar={userAvatar}
          userName={userName}
          context="sc"
          pendingPrompt={pendingPrompt}
          onPendingPromptConsumed={() => setPendingPrompt(undefined)}
        />
      </div>
    </div>
  )
}
