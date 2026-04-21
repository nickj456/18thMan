import { createClient } from '@/lib/supabase/server'
import { AnalysisForm } from './AnalysisForm'

export const metadata = { title: 'Coaching Eye — 18th Man' }

interface PageProps {
  searchParams: Promise<{ paid?: string }>
}

export default async function AnalysisPage({ searchParams }: PageProps) {
  const { paid } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user!.id)
    .single()

  const isMember = profile?.subscription_tier && profile.subscription_tier !== 'free'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-[#e8560a] mb-2">Coaching Eye</p>
        <h1 className="text-3xl font-bold tracking-tight mb-3">I see what coaches miss.</h1>
        <p className="text-muted-foreground leading-relaxed">
          Twenty years in professional rugby league as a player and coach. I watch footage the way I used to study tape before a big game — picking apart the patterns, spotting the gaps, finding what actually matters. Send me your footage and I&apos;ll come back with a straight-talking report you can take straight onto the training field.
        </p>
        {isMember && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[#e8560a] bg-[rgba(232,86,10,0.08)] border border-[rgba(232,86,10,0.25)] rounded-lg px-4 py-2.5">
            <span className="font-bold">★</span>
            <span>Member discount applied — £10 off your request</span>
          </div>
        )}
      </div>

      <AnalysisForm isMember={!!isMember} paid={paid === '1'} />

      {/* How to share footage */}
      {!paid && (
        <div className="mt-8 rounded-xl border bg-card p-6">
          <h2 className="text-sm font-bold tracking-widest uppercase text-[#e8560a] mb-4">How to share your footage</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">YouTube (recommended)</p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Upload your video to YouTube</li>
                <li>Set visibility to <strong className="text-foreground">Unlisted</strong></li>
                <li>Copy the link and paste it above</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground/70">Unlisted means only people with the link can view it — it won&apos;t appear in search.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Google Drive</p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Upload the video to Google Drive</li>
                <li>Right-click → <strong className="text-foreground">Share</strong></li>
                <li>Set to <strong className="text-foreground">Anyone with the link</strong></li>
                <li>Copy and paste the link above</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
