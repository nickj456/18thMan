import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { Users, Building2, ArrowRight, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = createServiceClient()
  const { data: club } = await service
    .from('clubs')
    .select('name')
    .eq('invite_token', token)
    .single()

  if (!club) return { title: 'Invalid invite — 18th Man' }

  return {
    title: `Join ${club.name} on 18th Man`,
    description: `You've been invited to join ${club.name}. Sign up free and start coaching smarter.`,
    openGraph: {
      title: `Join ${club.name} on 18th Man`,
      description: `You've been invited to join ${club.name}. Sign up free and start coaching smarter.`,
      siteName: '18th Man',
    },
    twitter: {
      card: 'summary',
      title: `Join ${club.name} on 18th Man`,
      description: `You've been invited to join ${club.name}. Sign up free and start coaching smarter.`,
    },
  }
}

async function joinClub(token: string, userId: string) {
  'use server'
  const service = createServiceClient()

  const { data: club } = await service
    .from('clubs')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!club) return

  await service
    .from('profiles')
    .update({ club_id: club.id, club_role: 'member' })
    .eq('id', userId)

  revalidatePath('/', 'layout')
  redirect('/clubs?joined=1')
}

export default async function JoinClubPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const service = createServiceClient()

  const { data: club } = await service
    .from('clubs')
    .select('id, name')
    .eq('invite_token', token)
    .single()

  if (!club) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="size-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
            <Building2 size={24} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Invalid invite link</p>
            <p className="text-sm text-zinc-500 mt-1">This link has expired or been revoked. Ask your club admin for a new one.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Go to dashboard <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — send to login with redirect back here
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Building2 size={24} className="text-amber-400" />
            </div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Club Invite</p>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <p className="text-sm text-zinc-400">You&apos;ve been invited to join this club on 18th Man.</p>
          </div>

          {/* What you get */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {[
              'Access to club private drills',
              'Collaborative session planning',
              'Club coaching groups',
              'AI session guidance',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <p className="text-sm text-zinc-300">{f}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Link
              href={`/login?next=/join/${token}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#e8560a] hover:bg-[#d14d09] text-white font-semibold text-sm transition-colors"
            >
              Sign in to join <ArrowRight size={14} />
            </Link>
            <Link
              href={`/signup?next=/join/${token}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-colors"
            >
              Create a free account
            </Link>
          </div>

          <p className="text-center text-xs text-zinc-600">
            18th Man is a coaching platform for rugby league. Free to join.
          </p>
        </div>
      </div>
    )
  }

  // Check current membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (profile?.club_id === club.id) {
    redirect('/clubs')
  }

  if (profile?.club_id) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="size-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
            <Users size={24} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Already in a club</p>
            <p className="text-sm text-zinc-500 mt-1">
              You&apos;re already a member of another club. Leave your current club first before joining <span className="text-white font-medium">{club.name}</span>.
            </p>
          </div>
          <Link href="/clubs" className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
            View my club <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    )
  }

  // Logged in, no club — show confirmation
  const joinAction = joinClub.bind(null, token, user.id)

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Club Invite</p>
          <h1 className="text-2xl font-bold text-white">{club.name}</h1>
          <p className="text-sm text-zinc-400">You&apos;ve been invited to join this club on 18th Man.</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {[
            'Access to club private drills',
            'Collaborative session planning',
            'Club coaching groups',
            'AI session guidance',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-zinc-300">{f}</p>
            </div>
          ))}
        </div>

        <form action={joinAction}>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#e8560a] hover:bg-[#d14d09] text-white font-semibold text-sm transition-colors"
          >
            Join {club.name} <ArrowRight size={14} />
          </button>
        </form>

        <Link
          href="/dashboard"
          className="block text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Maybe later
        </Link>
      </div>
    </div>
  )
}
