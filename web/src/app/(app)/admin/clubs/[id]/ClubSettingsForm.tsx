'use client'

import { useTransition, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { updateClubSettings } from '../actions'

interface Props {
  clubId: string
  clubName: string
  maxMembers: number | null
  memberCount: number
  maxGroups: number | null
  groupCount: number
}

export function ClubSettingsForm({ clubId, clubName, maxMembers, memberCount, maxGroups, groupCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      await updateClubSettings(clubId, fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-medium text-zinc-400">Club Name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={clubName}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="max_members" className="block text-xs font-medium text-zinc-400">
            Max Members <span className="text-zinc-600 font-normal">(blank = unlimited)</span>
          </label>
          <input
            id="max_members"
            name="max_members"
            type="number"
            min={1}
            defaultValue={maxMembers ?? ''}
            placeholder="Unlimited"
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="max_groups" className="block text-xs font-medium text-zinc-400">
            Max Groups <span className="text-zinc-600 font-normal">(blank = default 5)</span>
          </label>
          <input
            id="max_groups"
            name="max_groups"
            type="number"
            min={1}
            defaultValue={maxGroups ?? ''}
            placeholder="5"
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          {memberCount} member{memberCount !== 1 ? 's' : ''}{maxMembers ? ` · limit ${maxMembers}` : ''}
          {' · '}
          {groupCount} group{groupCount !== 1 ? 's' : ''} · limit {maxGroups ?? 5}
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check size={12} /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
