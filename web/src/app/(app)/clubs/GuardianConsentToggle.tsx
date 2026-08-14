'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, Loader2 } from 'lucide-react'
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
      </CardContent>
    </Card>
  )
}
