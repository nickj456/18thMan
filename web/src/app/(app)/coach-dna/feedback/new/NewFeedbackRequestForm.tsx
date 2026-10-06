'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createFeedbackRequest } from '../actions'

export function NewFeedbackRequestForm({
  teams,
}: {
  teams: { id: string; name: string }[]
}) {
  const [feedbackType, setFeedbackType] = useState<'player_voice' | 'peer_observation'>('peer_observation')

  return (
    <form action={createFeedbackRequest} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Type</label>
        <div className="flex gap-4 text-sm text-zinc-400">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="feedbackType"
              value="peer_observation"
              checked={feedbackType === 'peer_observation'}
              onChange={() => setFeedbackType('peer_observation')}
            />
            Peer Observation (fellow coach)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="feedbackType"
              value="player_voice"
              checked={feedbackType === 'player_voice'}
              onChange={() => setFeedbackType('player_voice')}
            />
            Player / Parent Voice
          </label>
        </div>
      </div>

      {feedbackType === 'player_voice' && (
        <div className="space-y-2">
          <label htmlFor="teamId" className="text-sm font-medium text-zinc-200">Team</label>
          <select id="teamId" name="teamId" required className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200">
            <option value="">Select a team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="expiresInDays" className="text-sm font-medium text-zinc-200">Expires in (days)</label>
        <Input id="expiresInDays" name="expiresInDays" type="number" min={1} defaultValue={14} />
      </div>

      <div className="space-y-2">
        <label htmlFor="minimumResponseThreshold" className="text-sm font-medium text-zinc-200">Minimum responses</label>
        <Input id="minimumResponseThreshold" name="minimumResponseThreshold" type="number" min={3} defaultValue={3} />
        <p className="text-xs text-zinc-500">Must be at least 3.</p>
      </div>

      <Button type="submit">Create request</Button>
    </form>
  )
}
