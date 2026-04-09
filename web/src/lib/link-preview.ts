export interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

/** Extract the first URL from a string */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0] : null
}

/** Extract YouTube video ID from any YouTube URL format */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

/** Fast path for YouTube — no HTTP fetch needed, thumbnails are public */
async function fetchYouTubePreview(url: string, videoId: string): Promise<LinkPreview> {
  // noembed is a free oEmbed proxy — returns title without needing an API key
  let title: string | null = null
  try {
    const oembed = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (oembed.ok) {
      const data = await oembed.json()
      title = data.title ?? null
    }
  } catch { /* fall through — thumbnail still works without title */ }

  // hqdefault always exists; maxresdefault is higher quality but missing for some videos
  const image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  return { url, title, description: null, image, domain: 'youtube.com' }
}

/** Fetch Open Graph metadata for a URL. Returns null on failure. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')

    // Fast path for YouTube — their OG tags are bot-blocked
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) return fetchYouTubePreview(url, youtubeId)

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 18thManBot/1.0)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })

    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null

    const html = await res.text()

    function getMeta(property: string): string | null {
      const match =
        html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')) ??
        html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i'))
      return match ? match[1].trim() : null
    }

    const title =
      getMeta('og:title') ??
      getMeta('twitter:title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null

    const description =
      getMeta('og:description') ??
      getMeta('twitter:description') ??
      getMeta('description') ??
      null

    let image =
      getMeta('og:image') ??
      getMeta('twitter:image') ??
      getMeta('twitter:image:src') ??
      null

    // Resolve relative image URLs
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, url).href
      } catch {
        image = null
      }
    }

    return { url, title, description, image, domain }
  } catch {
    return null
  }
}
