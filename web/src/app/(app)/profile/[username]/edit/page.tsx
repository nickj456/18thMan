import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { ArrowLeft } from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'

export const metadata = { title: 'Edit Profile — 18th Man' }

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data }, { data: socialLinks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('social_links').select('platform, url').eq('user_id', user.id),
  ])

  const profile = data as Profile
  const socials = Object.fromEntries((socialLinks ?? []).map(s => [s.platform, s.url])) as Record<string, string>

  // Only allow editing your own profile
  if (profile?.username !== username) redirect(`/profile/${username}`)

  return (
    <div className="space-y-8 max-w-xl">
      <Link
        href={`/profile/${username}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Back to profile
      </Link>

      <div>
        <h1 className="app-heading text-2xl">Edit Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how other coaches see you
        </p>
      </div>

      <div className="flex items-center gap-6 p-5 rounded-xl border border-zinc-800 bg-zinc-900">
        <AvatarUpload
          currentUrl={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? null}
        />
        <div>
          <p className="font-semibold">{profile?.display_name ?? profile?.username ?? 'Coach'}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-zinc-500 mt-2">Click the photo to change it · Max 2MB</p>
        </div>
      </div>

      <ProfileForm profile={profile} socials={socials} />
    </div>
  )
}
