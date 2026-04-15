import Link from 'next/link'
import Image from 'next/image'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Clock, ThumbsUp, Heart, Headphones } from 'lucide-react'

interface PodcastCardProps {
  podcast: {
    id: string
    title: string
    description: string | null
    ai_summary: string | null
    cover_image_url: string | null
    external_url: string
    duration_text: string | null
    play_count: number
    created_at: string
    uploader: {
      username: string | null
      display_name: string | null
      avatar_url: string | null
    } | null
    tags: { tag: string; source: string }[]
    reaction_counts: { like: number; love: number }
  }
}

function getPlatformLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host === 'open.spotify.com') return 'Spotify'
    if (host === 'youtube.com' || host === 'youtu.be') return 'YouTube'
    if (host === 'podcasts.apple.com') return 'Apple Podcasts'
    return host
  } catch {
    return 'Podcast'
  }
}

function getPlatformBadgeClass(url: string): string {
  try {
    const host = new URL(url).hostname
    if (host.includes('spotify')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (host.includes('youtube')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (host.includes('apple')) return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  } catch {
    // ignore
  }
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PodcastCard({ podcast }: PodcastCardProps) {
  const summary = podcast.ai_summary ?? podcast.description
  const initials = podcast.uploader?.display_name
    ? podcast.uploader.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Card className="h-full overflow-hidden transition-colors hover:border-border/80 hover:bg-accent/5 group flex flex-col">
      <Link href={`/podcasts/${podcast.id}`} className="flex-1 block">
        <CardContent className="p-4 space-y-3">
          {/* Platform + duration row */}
          <div className="flex items-center gap-2">
            <Badge className={`text-xs border ${getPlatformBadgeClass(podcast.external_url)}`}>
              {getPlatformLabel(podcast.external_url)}
            </Badge>
            {podcast.duration_text && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {podcast.duration_text}
              </span>
            )}
          </div>

          {/* Title + thumbnail row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {podcast.title}
              </h3>

              {summary && (
                <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
              )}
            </div>

            {podcast.cover_image_url && (
              <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden bg-zinc-800">
                <Image
                  src={podcast.cover_image_url}
                  alt=""
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Tags */}
          {podcast.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {podcast.tags.slice(0, 5).map(({ tag }) => (
                <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {podcast.tags.length > 5 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                  +{podcast.tags.length - 5}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Link>

      <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={podcast.uploader?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]" style={{ background: 'rgba(232,86,10,0.2)', color: '#e8560a' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span>{podcast.uploader?.display_name ?? podcast.uploader?.username ?? 'Coach'}</span>
            <span className="text-[10px] opacity-60">{formatDate(podcast.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {podcast.play_count > 0 && (
            <span className="flex items-center gap-1">
              <Headphones className="size-3" />
              {podcast.play_count}
            </span>
          )}
          {podcast.reaction_counts.like > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3" />
              {podcast.reaction_counts.like}
            </span>
          )}
          {podcast.reaction_counts.love > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="size-3" />
              {podcast.reaction_counts.love}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
