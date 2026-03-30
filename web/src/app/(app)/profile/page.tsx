import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { Profile } from '@/lib/supabase/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as Profile

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and how others see you
        </p>
      </div>

      {/* Avatar */}
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

      {/* Profile form */}
      <ProfileForm profile={profile} />
    </div>
  )
}
