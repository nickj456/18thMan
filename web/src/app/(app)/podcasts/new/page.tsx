import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewPodcastForm } from './NewPodcastForm'

export const metadata: Metadata = {
  title: 'Add Podcast',
}

export default async function NewPodcastPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role === 'viewer') redirect('/podcasts')

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="app-heading text-2xl">Add Podcast</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a link and we'll do the rest.
        </p>
      </div>
      <NewPodcastForm />
    </div>
  )
}
