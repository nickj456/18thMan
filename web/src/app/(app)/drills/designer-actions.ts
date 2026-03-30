'use server'

import { createClient } from '@/lib/supabase/server'
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
    // Upload failed
  }
  return null
}

export async function saveDrillDesign(input: SaveDrillDesignInput): Promise<SaveDrillDesignResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upload canvas preview to its own column
  const canvasPreviewUrl = input.previewDataUrl
    ? await uploadCanvasPreview(supabase, user.id, input.previewDataUrl)
    : null

  // YouTube thumbnail goes in preview_image_url (primary)
  const youtubeUrl = input.youtubeUrl?.trim() || null
  let previewImageUrl: string | null = null
  let aiGuide = null

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (videoId) previewImageUrl = youtubeThumbnail(videoId)
    const guideResult = await generateDrillGuideFromYoutube(youtubeUrl)
    if (guideResult.success) aiGuide = guideResult.guide
  } else {
    // No YouTube — use canvas preview as the main thumbnail for library cards
    previewImageUrl = canvasPreviewUrl
  }

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
      ai_guide: aiGuide,
      author_id: user.id,
      is_public: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { drillId: data.id }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upload new canvas preview if provided, otherwise keep existing
  const canvasPreviewUrl = input.previewDataUrl
    ? (await uploadCanvasPreview(supabase, user.id, input.previewDataUrl)) ?? input.existingCanvasPreviewUrl
    : input.existingCanvasPreviewUrl

  const youtubeUrl = input.youtubeUrl?.trim() || null
  const youtubeChanged = youtubeUrl !== (input.existingYoutubeUrl?.trim() || null)
  let aiGuide: object | null = null
  let previewImageUrl: string | null = input.existingPreviewUrl

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (videoId) previewImageUrl = youtubeThumbnail(videoId)
    if (youtubeChanged) {
      const guideResult = await generateDrillGuideFromYoutube(youtubeUrl)
      if (guideResult.success) aiGuide = guideResult.guide
    }
  } else {
    // No YouTube — use canvas preview as main thumbnail
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
      ...(aiGuide ? { ai_guide: aiGuide } : {}),
    })
    .eq('id', input.drillId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }
  return { drillId: input.drillId }
}
