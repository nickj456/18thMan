'use server'

import { after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import type { DrillDifficulty, DrillVisibility } from '@/lib/supabase/types'
import type { CanvasState } from '@/components/designer/types'
import { generateDrillGuideFromYoutube } from './youtube-actions'
import { extractYouTubeId, youtubeThumbnail, fetchChannelInfo } from '@/lib/youtube'
import { canCreateDrill, activateTrial, hasClubAccess, getEffectiveTier } from '@/lib/subscription'
import { sendTrialStartEmail, sendDrillLimitEmail } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/service'

const CLUB_VISIBILITY_ERROR = 'Club-private drills require an active club subscription. Upgrade your club to enable this.'
const SAVE_REQUIRES_UPGRADE_ERROR = 'Saving a drill requires an active subscription. Upgrade to Coach Pro or Club to save your drills.'

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

  const drillGate = await canCreateDrill(supabase, user.id)
  let tier = drillGate.tier

  if (!drillGate.allowed) {
    // Free tier can no longer create a new saved drill outright (Task 2).
    // The first time this happens for a given coach, auto-activate their
    // one-time 48-hour trial -- this is the same grant that used to fire
    // in the background after the 3rd saved drill; that trigger can never
    // happen now, since a genuinely free coach can't reach a 3rd saved
    // drill -- and let THIS save go through as a trial save. Only a coach
    // who has already used and outlived that trial is actually blocked.
    const activated = await activateTrial(supabase, user.id)
    if (activated) {
      tier = 'trial'
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      const userEmail = user.email
      const trialEnd = new Date()
      trialEnd.setHours(trialEnd.getHours() + 48)
      after(async () => {
        if (userEmail) await sendTrialStartEmail(userEmail, profile?.display_name ?? '', trialEnd)
      })
    } else {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      const email = user.email
      if (email) {
        after(async () => { await sendDrillLimitEmail(email, profile?.display_name ?? '') })
      }
      return { error: SAVE_REQUIRES_UPGRADE_ERROR }
    }
  }

  // Never trust a client-submitted 'club' visibility on its own -- the UI
  // already prevents selecting it without access, but this is the real
  // authorization boundary. Uses the resolved `tier` above, which may have
  // just been upgraded to 'trial' by the block above -- a coach whose very
  // first save just activated their trial can immediately save into a
  // club-private drill if they picked that visibility.
  if (input.visibility === 'club' && !hasClubAccess(tier)) {
    return { error: CLUB_VISIBILITY_ERROR }
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

  if (input.visibility === 'club') {
    const tier = await getEffectiveTier(supabase, user.id)
    if (!hasClubAccess(tier)) {
      return { error: CLUB_VISIBILITY_ERROR }
    }
  }

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
