'use server'

import { after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import type { DrillDifficulty, DrillVisibility } from '@/lib/supabase/types'
import type { CanvasState } from '@/components/designer/types'
import { generateDrillGuideFromYoutube } from './youtube-actions'
import { extractYouTubeId, youtubeThumbnail, fetchChannelInfo } from '@/lib/youtube'
import { canCreateDrill, activateTrial, FREE_DRILL_LIMIT } from '@/lib/subscription'
import { sendTrialStartEmail, sendDrillLimitEmail } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/service'

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
  visibility: DrillVisibility
  clubId: string | null
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
  const [{ data: { user } }, { data: { session } }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
  if (!user || !session) return { error: 'Not authenticated' }

  // Feature gate: free tier limited to 20 drills
  const { allowed, count, tier } = await canCreateDrill(supabase, user.id)
  if (!allowed) {
    // Send a one-time nudge email when they first hit the limit
    if (count === FREE_DRILL_LIMIT) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const email = user.email
      if (email) {
        after(async () => { await sendDrillLimitEmail(email, profile?.display_name ?? '') })
      }
    }
    return { error: `You've reached the free limit of ${FREE_DRILL_LIMIT} drills. Upgrade your club to create unlimited drills.` }
  }

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
      is_public: input.visibility === 'public',
      club_id: input.visibility === 'club' ? input.clubId : null,
      // Public drills require admin approval before appearing in the community library.
      // Private and club drills are accessible immediately without approval.
      approval_status: input.visibility === 'public' ? 'pending' : 'approved',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const drillId = data.id
  revalidateTag('drills', 'max')

  // Notify followers when a public drill is posted
  if (input.visibility === 'public') {
    const accessToken = session.access_token
    after(async () => {
      const bg = createBackgroundClient(accessToken)
      const service = createServiceClient()

      const { data: author } = await bg
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

      const { data: followers } = await service
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)

      if (followers && followers.length > 0) {
        await service.from('notifications').insert(
          followers.map(f => ({
            user_id: f.follower_id,
            type: 'new_drill',
            actor_id: user.id,
            data: {
              drill_id: drillId,
              drill_title: input.title,
              author_display_name: author?.display_name ?? author?.username ?? 'A coach',
              author_username: author?.username ?? '',
            },
          }))
        )
      }
    })
  }

  // Trial trigger: activate 48-hour trial after the user creates their 3rd drill
  if (count + 1 === 3 && tier === 'free') {
    const accessToken = session.access_token
    const userEmail = user.email
    after(async () => {
      const bg = createBackgroundClient(accessToken)
      const activated = await activateTrial(bg, user.id)
      if (activated && userEmail) {
        const { data: profile } = await bg.from('profiles').select('display_name').eq('id', user.id).single()
        const trialEnd = new Date()
        trialEnd.setHours(trialEnd.getHours() + 48)
        await sendTrialStartEmail(userEmail, profile?.display_name ?? '', trialEnd)
      }
    })
  }

  // Fetch channel info + generate AI guide in the background after response is sent
  if (youtubeUrl) {
    const accessToken = session.access_token
    const videoId = extractYouTubeId(youtubeUrl)
    after(async () => {
      const bg = createBackgroundClient(accessToken)
      const [guideResult, channelInfo] = await Promise.all([
        generateDrillGuideFromYoutube(youtubeUrl),
        videoId ? fetchChannelInfo(videoId) : Promise.resolve(null),
      ])
      const update: Record<string, unknown> = {}
      if (guideResult.success) update.ai_guide = guideResult.guide
      if (channelInfo) {
        update.youtube_channel_title = channelInfo.channelTitle
        update.youtube_channel_id = channelInfo.channelId
      }
      if (Object.keys(update).length > 0) {
        await bg.from('drills').update(update).eq('id', drillId)
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
  existingClubId: string | null
}

export async function updateDrillDesign(input: UpdateDrillDesignInput): Promise<SaveDrillDesignResult> {
  const supabase = await createClient()
  const [{ data: { user } }, { data: { session } }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
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
      is_public: input.visibility === 'public',
      club_id: input.visibility === 'club' ? input.clubId : null,
    })
    .eq('id', input.drillId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }

  revalidateTag('drills', 'max')

  // Regenerate AI guide + channel info in background if YouTube URL changed
  if (youtubeUrl && youtubeChanged) {
    const accessToken = session.access_token
    const drillId = input.drillId
    const videoId = extractYouTubeId(youtubeUrl)
    after(async () => {
      const bg = createBackgroundClient(accessToken)
      const [guideResult, channelInfo] = await Promise.all([
        generateDrillGuideFromYoutube(youtubeUrl),
        videoId ? fetchChannelInfo(videoId) : Promise.resolve(null),
      ])
      const update: Record<string, unknown> = {}
      if (guideResult.success) update.ai_guide = guideResult.guide
      if (channelInfo) {
        update.youtube_channel_title = channelInfo.channelTitle
        update.youtube_channel_id = channelInfo.channelId
      }
      if (Object.keys(update).length > 0) {
        await bg.from('drills').update(update).eq('id', drillId)
      }
    })
  }

  return { drillId: input.drillId }
}
