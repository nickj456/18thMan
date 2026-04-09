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

/** Fetch Open Graph metadata for a URL. Returns null on failure. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')

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
