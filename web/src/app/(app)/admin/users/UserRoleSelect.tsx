'use client'

import { useTransition } from 'react'
import { updateUserRole } from './actions'
import type { UserRole } from '@/lib/supabase/types'

interface UserRoleSelectProps {
  userId: string
  currentRole: UserRole
  isSelf: boolean
}

const roles: UserRole[] = ['viewer', 'coach', 'admin']

const roleColour: Record<UserRole, string> = {
  admin: 'text-red-400',
  coach: 'text-indigo-400',
  viewer: 'text-zinc-400',
}

export function UserRoleSelect({ userId, currentRole, isSelf }: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition()

  if (isSelf) {
    return (
      <span className={`text-xs font-semibold capitalize ${roleColour[currentRole]}`}>
        {currentRole} (you)
      </span>
    )
  }

  return (
    <select
      defaultValue={currentRole}
      disabled={isPending}
      onChange={e => {
        const role = e.target.value as UserRole
        startTransition(() => updateUserRole(userId, role))
      }}
      className="text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {roles.map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}
