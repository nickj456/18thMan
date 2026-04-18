'use client'

import { useRef, useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogoUpload } from '@/components/game-plans/LogoUpload'
import { createGamePlan, updateGamePlan, generateGamePlan } from '@/app/(app)/game-plans/actions'
import type { GamePlan } from '@/lib/supabase/types'

interface GamePlanFormProps {
  gamePlan?: GamePlan | null
}

const TACTICAL_FIELDS = [
  { name: 'defence',    label: 'Defence',     placeholder: 'Defensive system, line speed, markers…' },
  { name: 'attack',     label: 'Attack',      placeholder: 'Attacking shape, set plays, kick strategy…' },
  { name: 'structure',  label: 'Structure',   placeholder: 'Team formation, positional responsibilities…' },
  { name: 'aims',       label: 'Aims',        placeholder: 'Key goals and targets for this match…' },
  { name: 'forwards',   label: 'Forwards',    placeholder: 'Pack play, dummy half, carries, markers…' },
  { name: 'backs',      label: 'Backs',       placeholder: 'Width, timing, defensive line organisation…' },
  { name: 'half_backs', label: 'Half Backs',  placeholder: 'Kicking game, service, decision making, depth…' },
] as const

export function GamePlanForm({ gamePlan }: GamePlanFormProps) {
  const [isSaving, startSaving] = useTransition()
  const [isGenerating, startGenerating] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const [homeLogoUrl, setHomeLogoUrl] = useState<string | null>(gamePlan?.home_logo_url ?? null)
  const [awayLogoUrl, setAwayLogoUrl] = useState<string | null>(gamePlan?.away_logo_url ?? null)
  const [detailLevel, setDetailLevel] = useState<string>(gamePlan?.detail_level ?? 'standard')

  function handleDetailLevelChange(value: string | null) {
    if (value) setDetailLevel(value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Logo URLs come from state (uploaded via LogoUpload), not direct form inputs
    if (homeLogoUrl) formData.set('home_logo_url', homeLogoUrl)
    if (awayLogoUrl) formData.set('away_logo_url', awayLogoUrl)
    formData.set('detail_level', detailLevel)

    startSaving(async () => {
      let result: { error?: string }
      if (gamePlan) {
        result = await updateGamePlan(gamePlan.id, formData)
      } else {
        result = await createGamePlan(formData)
      }
      if (result?.error) {
        toast.error(result.error)
      }
      // On create success, actions.ts redirects; on update success it revalidates
    })
  }

  function handleGenerate() {
    if (!gamePlan) return
    startGenerating(async () => {
      const result = await generateGamePlan(gamePlan.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Game plan generated!')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {/* Section A: Match Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Match Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="opposition">Opposition <span className="text-red-400">*</span></Label>
            <Input
              id="opposition"
              name="opposition"
              required
              defaultValue={gamePlan?.opposition ?? ''}
              placeholder="e.g. Ashton Bears"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pitch">Pitch</Label>
            <Input
              id="pitch"
              name="pitch"
              defaultValue={gamePlan?.pitch ?? ''}
              placeholder="e.g. Waterhead Community Ground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="kick_off_time">Kick-off Time</Label>
            <Input
              id="kick_off_time"
              name="kick_off_time"
              type="datetime-local"
              defaultValue={
                gamePlan?.kick_off_time
                  ? gamePlan.kick_off_time.slice(0, 16)
                  : ''
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="detail_level">Detail Level</Label>
            <Select value={detailLevel} onValueChange={handleDetailLevelChange}>
              <SelectTrigger id="detail_level" className="w-full">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logo uploads */}
        <div className="grid grid-cols-2 gap-4">
          <LogoUpload
            side="home"
            label="Your Team Logo"
            currentUrl={homeLogoUrl}
            onUpload={setHomeLogoUrl}
          />
          <LogoUpload
            side="away"
            label="Opposition Logo"
            currentUrl={awayLogoUrl}
            onUpload={setAwayLogoUrl}
          />
        </div>
      </div>

      {/* Section B: Tactical Notes */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Tactical Notes
        </h2>

        <div className="space-y-4">
          {TACTICAL_FIELDS.map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Textarea
                id={name}
                name={name}
                defaultValue={(gamePlan?.[name as keyof GamePlan] as string | null) ?? ''}
                placeholder={placeholder}
                className="h-28 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {gamePlan && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              className="bg-[#e8560a] hover:bg-[#c94d08] text-white border-transparent"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="size-4 animate-pulse mr-1.5" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-1.5" />
                  Generate Game Plan
                </>
              )}
            </Button>
          )}
        </div>

        <Button type="submit" disabled={isSaving || isGenerating}>
          {isSaving ? 'Saving…' : 'Save Game Plan'}
        </Button>
      </div>
    </form>
  )
}
