'use server'

import { createClient } from '@/lib/supabase/server'
import { generateDrillGuideFromYoutube } from '@/app/(app)/drills/youtube-actions'
import { youtubeThumbnail } from '@/lib/youtube'

export interface PlaylistVideo {
  videoId: string
  title: string
  description: string
  thumbnail: string
  position: number
}

export type FetchPlaylistResult =
  | { success: true; videos: PlaylistVideo[]; playlistTitle: string }
  | { success: false; error: string }

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export async function fetchPlaylistVideos(url: string): Promise<FetchPlaylistResult> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) return { success: false, error: 'YouTube Data API key not configured.' }

  const playlistId = extractPlaylistId(url)
  if (!playlistId) return { success: false, error: 'Invalid playlist URL — could not extract playlist ID.' }

  try {
    // Fetch playlist metadata
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    )
    const playlistData = await playlistRes.json()
    if (playlistData.error) {
      return { success: false, error: `YouTube API error: ${playlistData.error.message}` }
    }
    if (!playlistData.items?.length) {
      return { success: false, error: `Playlist not found or is private. (ID: ${playlistId})` }
    }
    const playlistTitle = playlistData.items[0].snippet.title

    // Fetch all videos (max 50 per page, paginate)
    const videos: PlaylistVideo[] = []
    let pageToken: string | undefined

    do {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : ''
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageParam}`
      )
      const data = await res.json()
      if (data.error) return { success: false, error: data.error.message }

      for (const item of data.items ?? []) {
        const videoId = item.snippet?.resourceId?.videoId
        if (!videoId || videoId === 'deleted') continue
        videos.push({
          videoId,
          title: item.snippet.title,
          description: item.snippet.description?.slice(0, 300) ?? '',
          thumbnail: item.snippet.thumbnails?.high?.url ?? youtubeThumbnail(videoId),
          position: item.snippet.position,
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    return { success: true, videos, playlistTitle }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Failed to fetch playlist: ${message}` }
  }
}

export interface ImportResult {
  imported: number
  failed: number
  errors: string[]
}

export async function importPlaylistDrills(
  videos: PlaylistVideo[],
  categoryId: string | null,
  generateGuides: boolean
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, failed: videos.length, errors: ['Not authenticated'] }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { imported: 0, failed: videos.length, errors: ['Admin access required'] }

  let imported = 0
  let failed = 0
  const errors: string[] = []

  for (const video of videos) {
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`
      let aiGuide = null

      if (generateGuides) {
        const guideResult = await generateDrillGuideFromYoutube(youtubeUrl)
        if (guideResult.success) aiGuide = guideResult.guide
      }

      const { error } = await supabase.from('drills').insert({
        title: video.title,
        description: video.description || null,
        category_id: categoryId,
        youtube_url: youtubeUrl,
        preview_image_url: video.thumbnail,
        ai_guide: aiGuide,
        author_id: user.id,
        is_public: true,
      })

      if (error) {
        failed++
        errors.push(`"${video.title}": ${error.message}`)
      } else {
        imported++
      }
    } catch (err) {
      failed++
      errors.push(`"${video.title}": ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { imported, failed, errors }
}
