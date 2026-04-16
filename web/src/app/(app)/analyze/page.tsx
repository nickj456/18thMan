import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VideoAnnotator } from '@/components/video-annotator/VideoAnnotator'

export const metadata = { title: 'Video Analysis' }

export default async function VideoAnalysisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') notFound()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-200">Video Analysis</h1>
        <span className="text-xs text-zinc-500">Upload a clip, play it back, and draw annotations</span>
      </div>
      <VideoAnnotator userId={user.id} />
    </div>
  )
}
