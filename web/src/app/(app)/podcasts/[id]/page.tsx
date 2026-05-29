import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PodcastPlayer } from '@/components/podcasts/PodcastPlayer'
import { PodcastReactions } from './PodcastReactions'
import { PodcastComments } from './PodcastComments'
import { PodcastSaveButton } from './PodcastSaveButton'
import { deletePodcast, incrementPlayCount } from '@/app/(app)/podcasts/actions'
import { ExternalLink, Trash2, Clock, Sparkles, ChevronDown, Headphones } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('podcasts').select('title, description, ai_summary').eq('id', id).single()
  if (!data) return { title: 'Podcast' }
  return {
    title: data.title,
    description: data.ai_summary ?? data.description ?? undefined,
  }
}

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [podcastResult, profileResult, saveResult] = await Promise.all([
    supabase
      .from('podcasts')
      .select(`
        id, title, description, ai_summary, external_url, duration_text, transcript, created_at,
        play_count, uploaded_by,
        uploader:profiles!podcasts_uploaded_by_fkey ( id, username, display_name, avatar_url ),
        tags:podcast_tags ( tag, source ),
        reactions:podcast_reactions ( reaction, user_id ),
        comments:podcast_comments (
          id, content, created_at,
          user:profiles!podcast_comments_user_id_fkey ( id, username, display_name, avatar_url )
        )
      `)
      .eq('id', id)
      .single(),
    user
      ? supabase.from('profiles').select('role, username, display_name, avatar_url').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('podcast_saves').select('podcast_id').eq('podcast_id', id).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!podcastResult.data) notFound()
  const podcast = podcastResult.data
  const profile = profileResult.data
  const isSaved = !!saveResult.data

  // Increment play count in the background — non-blocking
  incrementPlayCount(id)

  type Reaction = { reaction: string; user_id: string }
  const reactions = (podcast.reactions as Reaction[] | null) ?? []
  const reactionCounts = {
    like: reactions.filter(r => r.reaction === 'like').length,
    love: reactions.filter(r => r.reaction === 'love').length,
  }
  const userReaction = user
    ? (reactions.find(r => r.user_id === user.id)?.reaction as 'like' | 'love' | null) ?? null
    : null

  type RawComment = {
    id: string
    content: string
    created_at: string
    user: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[] | null
  }
  type Comment = {
    id: string
    content: string
    created_at: string
    user: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null
  }
  const comments: Comment[] = ((podcast.comments as unknown as RawComment[] | null) ?? [])
    .map(c => ({
      ...c,
      user: Array.isArray(c.user) ? (c.user[0] ?? null) : c.user,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  type Tag = { tag: string; source: string }
  const tags = (podcast.tags as Tag[] | null) ?? []

  type UploaderShape = { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null
  const rawUploader = podcast.uploader as unknown
  const uploader: UploaderShape = Array.isArray(rawUploader) ? (rawUploader[0] ?? null) : (rawUploader as UploaderShape)

  const isOwner = user?.id === podcast.uploaded_by
  const isAdmin = profile?.role === 'admin'
  const canDelete = isOwner || isAdmin

  const uploaderInitials = uploader?.display_name
    ? uploader.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/podcasts" className="hover:text-foreground transition-colors">Podcast Library</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{podcast.title}</span>
      </nav>

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="app-heading text-2xl leading-snug">{podcast.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={podcast.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Open original
          </a>
          {canDelete && (
            <form
              action={async () => {
                'use server'
                await deletePodcast(id)
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="text-zinc-500 hover:text-red-400 px-2">
                <Trash2 className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Embed player */}
      <PodcastPlayer externalUrl={podcast.external_url} title={podcast.title} />

      {/* AI Summary */}
      {podcast.ai_summary && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#e8560a] uppercase tracking-wide">
            <Sparkles className="size-3.5" />
            AI Summary
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{podcast.ai_summary}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(({ tag, source }) => (
            <Link key={tag} href={`/podcasts?tags=${encodeURIComponent(tag)}`}>
              <Badge
                variant="outline"
                className={`text-xs cursor-pointer hover:border-zinc-500 transition-colors ${
                  source === 'ai' ? 'border-[#e8560a]/30 text-[#e8560a]/80' : ''
                }`}
              >
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Uploader info + duration */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Avatar size="sm">
          <AvatarImage src={uploader?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs" style={{ background: 'rgba(232,86,10,0.2)', color: '#e8560a' }}>
            {uploaderInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="text-foreground font-medium">
            {uploader?.display_name ?? uploader?.username ?? 'Coach'}
          </span>
          {' · '}
          <span>{formatDate(podcast.created_at)}</span>
        </div>
        {podcast.duration_text && (
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="size-3.5" />
            {podcast.duration_text}
          </span>
        )}
      </div>

      {/* Description */}
      {podcast.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{podcast.description}</p>
      )}

      {/* Transcript (collapsible) */}
      {podcast.transcript && (
        <details className="group rounded-lg border border-zinc-800">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none text-sm font-medium select-none hover:bg-zinc-800/50 transition-colors">
            <span>Transcript</span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-zinc-800">
            {podcast.transcript}
          </div>
        </details>
      )}

      {/* Reactions + Save + Play count */}
      {user && (
        <div className="border-t border-zinc-800 pt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PodcastReactions
              podcastId={id}
              initialCounts={reactionCounts}
              userReaction={userReaction}
            />
            <PodcastSaveButton podcastId={id} initialSaved={isSaved} />
          </div>
          {(podcast.play_count ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Headphones className="size-3.5" />
              {podcast.play_count} {podcast.play_count === 1 ? 'play' : 'plays'}
            </span>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="border-t border-zinc-800 pt-4">
        <PodcastComments
          podcastId={id}
          initialComments={comments}
          currentUserId={user?.id ?? null}
          currentUserRole={profile?.role ?? null}
          currentUserProfile={profile ? {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          } : null}
        />
      </div>
    </div>
  )
}
