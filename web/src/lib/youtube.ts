import { Innertube } from 'youtubei.js'

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`
}

export function youtubeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`,
      { cache: 'force-cache' }
    )
    if (!res.ok) return null
    const data = await res.json() as { title?: string }
    return data.title ?? null
  } catch {
    return null
  }
}

export interface ChannelInfo {
  channelTitle: string
  channelId: string
}

export async function fetchChannelInfo(videoId: string): Promise<ChannelInfo | null> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`,
      { cache: 'force-cache' }
    )
    if (!res.ok) return null
    const data = await res.json() as { items?: { snippet?: { channelTitle?: string; channelId?: string } }[] }
    const snippet = data.items?.[0]?.snippet
    if (!snippet?.channelTitle || !snippet?.channelId) return null
    return { channelTitle: snippet.channelTitle, channelId: snippet.channelId }
  } catch {
    return null
  }
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const yt = await Innertube.create({ retrieve_player: false })
  const info = await yt.getInfo(videoId)
  const transcriptData = await info.getTranscript()
  const segments = transcriptData?.transcript?.content?.body?.initial_segments ?? []
  return segments
    .map((s: { snippet?: { text?: string } }) => s.snippet?.text ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
