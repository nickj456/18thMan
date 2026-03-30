'use client'

import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateProfile } from '@/app/(app)/profile/actions'
import type { Profile } from '@/lib/supabase/types'

export function ProfileForm({ profile }: { profile: Profile }) {
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
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
