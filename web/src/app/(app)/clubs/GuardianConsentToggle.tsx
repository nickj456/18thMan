'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck, ShieldAlert, Gavel, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { grantGuardianConsent } from './actions'

export function GuardianConsentToggle({
  clubId,
  season,
  granted,
}: {
  clubId: string
  season: string
  granted: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleGrant() {
    startTransition(async () => {
      const result = await grantGuardianConsent(clubId)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Guardian consent confirmed for ${season}`)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-400" />
          Guardian consent — Coach DNA feedback
        </CardTitle>
        <CardDescription>
          Confirm your club has guardian consent on file before coaches can request player or parent feedback for the {season} season. This is your club&apos;s attestation, not a document upload — no per-child tracking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {granted ? (
          <p className="text-sm text-emerald-300 flex items-center gap-2">
            <ShieldCheck size={14} /> Consent on file for {season}.
          </p>
        ) : (
          <Button type="button" onClick={handleGrant} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Confirm guardian consent for {season}
          </Button>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
          <Link href="/admin/feedback/safeguarding" className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
            <ShieldAlert size={13} /> Safeguarding queue
          </Link>
          <Link href="/admin/feedback/disputes" className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
            <Gavel size={13} /> Response disputes
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
