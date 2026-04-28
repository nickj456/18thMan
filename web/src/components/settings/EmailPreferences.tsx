'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { saveEmailPreferences, unsubscribeFromAll, EMAIL_CATEGORIES } from '@/app/(app)/settings/email-actions'

interface EmailPreferencesProps {
  initialPrefs: Record<string, boolean>
}

const GROUPS = ['Notifications', 'Club & Content', 'Platform'] as const

export function EmailPreferences({ initialPrefs }: EmailPreferencesProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initialPrefs)
  const [saving, startSave] = useTransition()
  const [unsubbing, startUnsub] = useTransition()
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  function toggle(key: string, value: boolean) {
    const prev = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaved(false)
    startSave(async () => {
      const result = await saveEmailPreferences(next)
      if (result.error) {
        setPrefs(prev)  // revert on error
      } else {
        setSaved(true)
      }
    })
  }

  function handleUnsubAll() {
    startUnsub(async () => {
      const allOff = Object.fromEntries(EMAIL_CATEGORIES.map(c => [c.key, false]))
      setPrefs(allOff)
      await unsubscribeFromAll()
      setOpen(false)
    })
  }

  return (
    <section id="email-preferences" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Email Preferences</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose which emails you receive from 18th Man.</p>
        </div>
        {saved && !saving && (
          <span className="text-xs text-emerald-500">Saved</span>
        )}
      </div>

      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {GROUPS.map(group => {
          const items = EMAIL_CATEGORIES.filter(c => c.group === group)
          return (
            <div key={group} className="p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{group}</p>
              {items.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <Switch
                    checked={prefs[key] !== false}
                    onCheckedChange={v => toggle(key, v)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-300"
              disabled={unsubbing}
            />
          }
        >
          Unsubscribe from all emails
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Unsubscribe from all emails?</DialogTitle>
            <DialogDescription>
              You&apos;ll stop receiving all emails from 18th Man. You can re-enable them at any time from this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleUnsubAll}
              disabled={unsubbing}
            >
              {unsubbing ? 'Unsubscribing…' : 'Unsubscribe from all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
