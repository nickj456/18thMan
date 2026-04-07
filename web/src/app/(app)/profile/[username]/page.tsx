import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PenTool, CalendarDays, Star, MapPin, Award, ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return { title: `@${username} — 18th Man` }
}

const difficultyColour: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, club, coaching_level, role, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isOwnProfile = currentUser?.id === profile.id

  const [drillsResult, statsResult] = await Promise.all([
    supabase
      .from('drills')
      .select('id, title, difficulty, preview_image_url, canvas_preview_url, category:drill_categories(name), created_at')
      .eq('author_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('drills')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_public', true),
  ])

  const drills = drillsResult.data ?? []
  const publicDrillCount = statsResult.count ?? 0

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/drills"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Drill Library
      </Link>

      {/* Profile header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar className="size-20 shrink-0">
            <AvatarImage src={profile.avatar_url ?? ''} />
            <AvatarFallback className="text-2xl bg-zinc-800 text-zinc-400">
              {(profile.display_name ?? profile.username ?? '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="app-heading text-2xl">
                {profile.display_name ?? profile.username}
              </h1>
              {profile.role === 'admin' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">@{profile.username}</p>

            <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-500">
              {profile.club && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {profile.club}
                </span>
              )}
              {profile.coaching_level && (
                <span className="flex items-center gap-1">
                  <Award size={11} /> {profile.coaching_level}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays size={11} /> Member since {memberSince}
              </span>
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href={`/profile/${profile.username}/edit`}
              className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-4">
            {profile.bio}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-6 border-t border-zinc-800 pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-100">{publicDrillCount}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Public Drills</p>
          </div>
        </div>
      </div>

      {/* Public drills */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <PenTool size={11} /> Drills by {profile.display_name ?? profile.username} ({publicDrillCount})
        </h2>

        {drills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
            <PenTool size={24} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-600">No public drills yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {drills.map(drill => (
              <Link
                key={drill.id}
                href={`/drills/${drill.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className="relative aspect-video bg-zinc-800">
                  {(drill.canvas_preview_url ?? drill.preview_image_url) ? (
                    <Image
                      src={drill.canvas_preview_url ?? drill.preview_image_url ?? ''}
                      alt={drill.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-20">🏉</div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                    {drill.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-zinc-600">{(drill.category as any)?.name ?? 'Uncategorised'}</p>
                    {drill.difficulty && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${difficultyColour[drill.difficulty] ?? 'text-zinc-500'}`}>
                        {drill.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
