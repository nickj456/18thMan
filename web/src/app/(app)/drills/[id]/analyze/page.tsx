import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { VideoAnnotator } from '@/components/video-annotator/VideoAnnotator'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: drill } = await supabase.from('drills').select('title').eq('id', id).single()
  return { title: drill ? `Analyse: ${drill.title}` : 'Video Analysis' }
}

export default async function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: drill } = await supabase
    .from('drills')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!drill) notFound()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/drills/${id}`} />}>
          <ArrowLeft className="size-4 mr-1" />
          {drill.title}
        </Button>
        <span className="text-xs text-zinc-500">Video Analysis</span>
      </div>

      {/* Annotator — full remaining height */}
      <VideoAnnotator userId={user.id} />
    </div>
  )
}
