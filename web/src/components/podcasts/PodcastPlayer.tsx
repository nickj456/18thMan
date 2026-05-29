'use client'

interface PodcastPlayerProps {
  externalUrl: string
  title: string
}

function detectPlatform(url: string): 'spotify' | 'youtube' | 'apple' | 'other' {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'open.spotify.com') return 'spotify'
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube'
    if (host === 'podcasts.apple.com') return 'apple'
  } catch {
    // fall through
  }
  return 'other'
}

function buildEmbedUrl(url: string, platform: 'spotify' | 'youtube' | 'apple' | 'other'): string | null {
  try {
    const u = new URL(url)
    if (platform === 'spotify') {
      // https://open.spotify.com/episode/xxx → https://open.spotify.com/embed/episode/xxx
      return `https://open.spotify.com/embed${u.pathname}${u.search}`
    }
    if (platform === 'youtube') {
      // Extract video ID from youtu.be/ID or youtube.com/watch?v=ID or youtube.com/live/ID
      let videoId: string | null = null
      if (u.hostname === 'youtu.be') {
        videoId = u.pathname.slice(1)
      } else {
        videoId = u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null
      }
      if (!videoId) return null
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (platform === 'apple') {
      // https://podcasts.apple.com/us/podcast/name/id123456789 → embed
      return `https://embed.podcasts.apple.com${u.pathname}`
    }
  } catch {
    // fall through
  }
  return null
}

function getDomainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function PodcastPlayer({ externalUrl, title }: PodcastPlayerProps) {
  const platform = detectPlatform(externalUrl)
  const embedUrl = buildEmbedUrl(externalUrl, platform)

  if (!embedUrl) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🎙️</div>
        <p className="text-sm text-muted-foreground">
          Listen on <strong>{getDomainLabel(externalUrl)}</strong>
        </p>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors"
        >
          Open podcast ↗
        </a>
      </div>
    )
  }

  if (platform === 'spotify') {
    return (
      <iframe
        title={title}
        src={embedUrl}
        width="100%"
        height="232"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-xl"
        style={{ border: 'none' }}
      />
    )
  }

  if (platform === 'youtube') {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden">
        <iframe
          title={title}
          src={embedUrl}
          width="100%"
          height="100%"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
          className="absolute inset-0 w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
    )
  }

  if (platform === 'apple') {
    return (
      <iframe
        title={title}
        src={embedUrl}
        width="100%"
        height="175"
        allow="autoplay *; encrypted-media *; fullscreen *"
        loading="lazy"
        className="rounded-xl overflow-hidden"
        style={{ border: 'none', background: 'transparent' }}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
      />
    )
  }

  return null
}
