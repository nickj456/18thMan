'use client'

import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateProfile } from '@/app/(app)/profile/actions'
import type { Profile } from '@/lib/supabase/types'

const SOCIAL_PLATFORMS = [
  { key: 'twitter',   label: 'X / Twitter',  placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram',     placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',  label: 'Facebook',      placeholder: 'https://facebook.com/yourpage' },
  { key: 'youtube',   label: 'YouTube',       placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',  label: 'LinkedIn',      placeholder: 'https://linkedin.com/in/yourprofile' },
] as const

interface ProfileFormProps {
  profile: Profile
  socials?: Record<string, string>
}

export function ProfileForm({ profile, socials = {} }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateProfile(formData)
      toast.success('Profile saved')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={profile?.display_name ?? ''}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club">Club</Label>
            <Input
              id="club"
              name="club"
              defaultValue={profile?.club ?? ''}
              placeholder="e.g. Wigan Warriors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="coaching_level">Coaching level</Label>
          <Input
            id="coaching_level"
            name="coaching_level"
            defaultValue={profile?.coaching_level ?? ''}
            placeholder="e.g. Level 2 Coach, Head Coach U16s"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile?.bio ?? ''}
            placeholder="Tell other coaches about yourself…"
            className="h-28 resize-none"
          />
        </div>
      </div>

      {/* Social links */}
      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <div>
          <p className="text-sm font-semibold text-white">Social links</p>
          <p className="text-xs text-zinc-500 mt-0.5">Show your socials on your public profile</p>
        </div>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`social_${key}`}>{label}</Label>
              <Input
                id={`social_${key}`}
                name={`social_${key}`}
                type="url"
                defaultValue={socials[key] ?? ''}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
