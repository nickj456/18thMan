'use server'

import { after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import type { DrillDifficulty } from '@/lib/supabase/types'
import type { CanvasState } from '@/components/designer/types'
import { generateDrillGuideFromYoutube } from './youtube-actions'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'

interface SaveDrillDesignInput {
  title: string
  description: string | null
  categoryId: string | null
  difficulty: DrillDifficulty | null
  ageGroup: string | null
  playerCount: string | null
  canvasJson: CanvasState
  previewDataUrl: string | null
  youtubeUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
}

interface SaveDrillDesignResult {
  drillId?: string
  error?: string
}

async function uploadCanvasPreview(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, dataUrl: string): Promise<string | null> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const fileName = `${userId}/${Date.now()}.png`
    const { data: upload, error } = await supabase.storage
      .from('drill-previews')
      .upload(fileName, blob, { contentType: 'image/png', upsert: false })
    if (!error && upload) {
      const { data: urlData } = supabase.storage.from('drill-previews').getPublicUrl(upload.path)
      return urlData.publicUrl
    }
  } catch {
    // Upload failed silently
  }
  return null
}

/** Create a Supabase client using a captured JWT — safe to use inside after() callbacks */
function createBackgroundClient(accessToken: string) {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

export async function saveDrillDesign(input: SaveDrillDesignInput): Promise<SaveDrillDesignResult> {
  const supabase = await createClient()
  const { data: { user, session } } = await supabase.auth.getSession()
  if (!user || !session) return { error: 'Not authenticated' }

  const canvasPreviewUrl = input.previewDataUrl
    ? await uploadCanvasPreview(supabase, user.id, input.previewDataUrl)
    : null

  const youtubeUrl = input.youtubeUrl?.trim() || null
  let previewImageUrl: string | null = null

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (videoId) previewImageUrl = youtubeThumbnail(videoId)
  } else {
    previewImageUrl = canvasPreviewUrl
  }

  // Save drill immediately — no waiting for AI guide
  const { data, error } = await supabase
    .from('drills')
    .insert({
      title: input.title,
      description: input.description,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      age_group: input.ageGroup,
      player_count: input.playerCount,
      canvas_json: input.canvasJson,
      preview_image_url: previewImageUrl,
      canvas_preview_url: canvasPreviewUrl,
      youtube_url: youtubeUrl,
      tiktok_url: input.tiktokUrl,
      facebook_url: input.facebookUrl,
      ai_guide: null,
      author_id: user.id,
      is_public: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const drillId = data.id
  revalidateTag('drills')

  // Generate AI guide in the background after response is sent
  if (youtubeUrl) {
    const accessToken = session.access_token
    after(async () => {
      const guideResult = await generateDrillGuideFromYoutube(youtubeUrl)
      if (guideResult.success) {
        const bg = createBackgroundClient(accessToken)
        await bg.from('drills').update({ ai_guide: guideResult.guide }).eq('id', drillId)
      }
    })
  }

  return { drillId }
}

interface UpdateDrillDesignInput extends SaveDrillDesignInput {
  drillId: string
  existingPreviewUrl: string | null
  existingCanvasPreviewUrl: string | null
  existingYoutubeUrl: string | null
  existingTiktokUrl: string | null
  existingFacebookUrl: string | null
}

export async function updateDrillDesign(input: UpdateDrillDesignInput): Promise<SaveDrillDesignResult> {
  const supabase = await createClient()
  const { data: { user, session } } = await supabase.auth.getSession()
  if (!user || !session) return { error: 'Not authenticated' }

  const canvasPreviewUrl = input.previewDataUrl
    ? (await uploadCanvasPreview(supabase, user.id, input.previewDataUrl)) ?? input.existingCanvasPreviewUrl
    : input.existingCanvasPreviewUrl

  const youtubeUrl = input.youtubeUrl?.trim() || null
  const youtubeChanged = youtubeUrl !== (input.existingYoutubeUrl?.trim() || null)
  let previewImageUrl: string | null = input.existingPreviewUrl

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (videoId) previewImageUrl = youtubeThumbnail(videoId)
  } else {
    previewImageUrl = canvasPreviewUrl
  }

  const { error } = await supabase
    .from('drills')
    .update({
      title: input.title,
      description: input.description,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      age_group: input.ageGroup,
      player_count: input.playerCount,
      canvas_json: input.canvasJson,
      preview_image_url: previewImageUrl,
      canvas_preview_url: canvasPreviewUrl,
      youtube_url: youtubeUrl,
      tiktok_url: input.tiktokUrl,
      facebook_url: input.facebookUrl,
    })
    .eq('id', input.drillId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }

  revalidateTag('drills')

  // Regenerate AI guide in background if YouTube URL changed
  if (youtubeUrl && youtubeChanged) {
    const accessToken = session.access_token
    const drillId = input.drillId
    after(async () => {
      const guideResult = await generateDrillGuideFromYoutube(youtubeUrl)
      if (guideResult.success) {
        const bg = createBackgroundClient(accessToken)
        await bg.from('drills').update({ ai_guide: guideResult.guide }).eq('id', drillId)
      }
    })
  }

  return { drillId: input.drillId }
}
