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
