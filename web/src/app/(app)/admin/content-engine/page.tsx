import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ContentEngineClient } from './ContentEngineClient'

export const metadata = { title: 'Content Engine — Admin' }

export default async function ContentEnginePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl flex items-center gap-2">
            Content Engine
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/30 text-[#e8560a] tracking-wide uppercase">
              AI
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate social posts and images for 18thMan
          </p>
        </div>
      </div>

      <ContentEngineClient />
    </div>
  )
}
