import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buildClubAddedEmailHtml, buildGroupAddedEmailHtml } from '@/lib/email'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Email Previews — Admin' }

const PREVIEWS = [
  {
    key: 'club_added',
    label: 'Added to Club',
    html: buildClubAddedEmailHtml('Nick Johnson', 'Waterhead Warriors', 'Admin'),
  },
  {
    key: 'group_added',
    label: 'Added to Group',
    html: buildGroupAddedEmailHtml('Nick Johnson', 'Attack Coaches', 'Waterhead Warriors', 'Nick Johnson'),
  },
]

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email = 'club_added' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const active = PREVIEWS.find(p => p.key === email) ?? PREVIEWS[0]

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="app-heading text-2xl">Email Previews</h1>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {PREVIEWS.map(p => (
          <Link
            key={p.key}
            href={`/admin/email/preview?email=${p.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              email === p.key
                ? 'border-[#e8560a] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <iframe
          srcDoc={active.html}
          className="w-full"
          style={{ height: '700px', border: 'none' }}
          title={active.label}
        />
      </div>
    </div>
  )
}
