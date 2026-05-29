import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MatchReportForm } from './MatchReportForm'

export const metadata = { title: 'Match Report Builder — 18th Man Admin' }

export default async function MatchReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(232,86,10,0.1)] border border-[rgba(232,86,10,0.2)] flex items-center justify-center">
            <FileText size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-[#e8560a] mb-0.5">
              Coaching Eye
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Match Report Builder</h1>
          </div>
        </div>
        <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
          Complete the analysis below after reviewing the customer&apos;s footage. A branded PDF
          report will be generated and sent directly to the customer&apos;s email address.
        </p>
      </div>

      <MatchReportForm />
    </div>
  )
}
