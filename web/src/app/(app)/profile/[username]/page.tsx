import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PenTool, CalendarDays, MapPin, Award, ArrowLeft, MessageSquare, UserPlus, UserMinus } from 'lucide-react'
import { startDm } from '@/app/(app)/chat/dm/actions'
import { followUser, unfollowUser } from '@/app/(app)/profile/actions'

async function startDmAction(userId: string) {
  'use server'
  await startDm(userId)
}

async function followAction(userId: string) {
  'use server'
  await followUser(userId)
}

async function unfollowAction(userId: string) {
  'use server'
  await unfollowUser(userId)
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, avatar_url, coaching_level')
    .eq('username', username)
    .single()

  const displayName = profile?.display_name ?? username
  const description = [
    profile?.bio,
    profile?.coaching_level && `${profile.coaching_level} coach`,
    'Rugby league coach on 18th Man',
  ].filter(Boolean).join(' · ')

  return {
    title: `${displayName} (@${username})`,
    description,
    openGraph: {
      title: `${displayName} — Rugby League Coach`,
      description,
      ...(profile?.avatar_url ? { images: [{ url: profile.avatar_url, width: 400, height: 400, alt: displayName }] } : {}),
    },
  }
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

  const [drillsResult, statsResult, socialLinksResult, followersResult, followingResult, isFollowingResult] = await Promise.all([
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
    supabase
      .from('social_links')
      .select('platform, url')
      .eq('user_id', profile.id),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    currentUser && !isOwnProfile
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const drills = drillsResult.data ?? []
  const publicDrillCount = statsResult.count ?? 0
  const socialLinks = socialLinksResult.data ?? []
  const followerCount = followersResult.count ?? 0
  const followingCount = followingResult.count ?? 0
  const isFollowing = !!isFollowingResult.data

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

          <div className="flex items-center gap-2 shrink-0">
            {!isOwnProfile && currentUser && (
              <>
                <form action={isFollowing ? unfollowAction.bind(null, profile.id) : followAction.bind(null, profile.id)}>
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isFollowing
                        ? 'text-zinc-400 border-zinc-700 hover:text-red-400 hover:border-red-500/50'
                        : 'text-white bg-[#e8560a] border-[#e8560a] hover:bg-[#d14d09] hover:border-[#d14d09]'
                    }`}
                  >
                    {isFollowing ? <><UserMinus size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                  </button>
                </form>
                <form action={startDmAction.bind(null, profile.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <MessageSquare size={12} /> Message
                  </button>
                </form>
              </>
            )}
            {isOwnProfile && (
              <Link
                href={`/profile/${profile.username}/edit`}
                className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-4">
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-3 border-t border-zinc-800 pt-4 flex-wrap">
            {socialLinks.map(({ platform, url }) => {
              const icons: Record<string, React.ReactNode> = {
                twitter: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                instagram: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
                facebook: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>,
                youtube: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                linkedin: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
              }
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  title={platform}
                >
                  {icons[platform]}
                </a>
              )
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-6 border-t border-zinc-800 pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-100">{publicDrillCount}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Drills</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-100">{followerCount}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-100">{followingCount}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Following</p>
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
