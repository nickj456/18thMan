import Link from 'next/link'
import { Bot, Users, MessageSquare, ActivitySquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="app-heading text-2xl">Coach Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">AI coaching assistant, direct messages, and community discussions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/chat/ai"
          className="group p-6 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
            <Bot size={24} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold">AI Coach</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your personal rugby league coaching assistant. Get drill ideas, tactical advice, and session planning help.
            </p>
          </div>
        </Link>

        <Link
          href="/chat/sc"
          className="group p-6 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
            <ActivitySquare size={24} className="text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold">S&amp;C Coach</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI strength &amp; conditioning specialist for rugby league. Build gym sessions, training blocks, and in-season maintenance programs.
            </p>
          </div>
        </Link>

        <Link
          href="/chat/dm"
          className="group p-6 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
            <MessageSquare size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold">Direct Messages</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Private conversations with other coaches. Visit a coach&apos;s profile to start a message.
            </p>
          </div>
        </Link>

        <Link
          href="/chat/community"
          className="group p-6 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <Users size={24} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold">Community Board</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Discuss drills, tactics, and coaching ideas with other coaches. Start threads, share knowledge.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
