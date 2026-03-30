'use server'

import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { extractYouTubeId, fetchTranscript, youtubeThumbnail } from '@/lib/youtube'

const groq = createGroq()

const GuideSchema = z.object({
  overview: z.string().describe('2-3 sentence overview of the drill and its purpose'),
  how_to_perform: z.array(z.string()).describe('Step-by-step instructions, 4-8 steps'),
  coaching_points: z.array(z.string()).describe('Key coaching points to emphasise, 3-6 items'),
  key_cues: z.array(z.string()).describe('Short verbal cues coaches can shout during the drill, 3-5 items'),
  variations: z.array(z.string()).describe('Ways to progress or regress the drill, 2-4 items'),
  equipment: z.array(z.string()).describe('Equipment needed, e.g. cones, tackle bags'),
})

export type GenerateGuideResult =
  | { success: true; guide: z.infer<typeof GuideSchema>; videoId: string; thumbnail: string }
  | { success: false; error: string }

export async function generateDrillGuideFromYoutube(
  youtubeUrl: string
): Promise<GenerateGuideResult> {
  const videoId = extractYouTubeId(youtubeUrl)
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL — could not extract video ID.' }
  }

  let transcript: string
  try {
    transcript = await fetchTranscript(videoId)
    console.log(`[guide] transcript length for ${videoId}: ${transcript.length}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[guide] transcript fetch failed for ${videoId}:`, msg)
    return {
      success: false,
      error: `Could not fetch transcript: ${msg}`,
    }
  }

  if (transcript.length < 10) {
    console.error(`[guide] transcript too short for ${videoId}: "${transcript}"`)
    return { success: false, error: 'Transcript is too short to generate a guide.' }
  }

  // Truncate to ~6000 words to stay within context limits
  const trimmedTranscript = transcript.split(' ').slice(0, 6000).join(' ')

  try {
    const { experimental_output } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      output: Output.object({ schema: GuideSchema }),
      system: `You are an expert rugby league coach. Extract a structured coaching guide from the provided video transcript.
Be practical and specific. Use rugby league terminology. Focus on what coaches need to know to run this drill.
If the transcript doesn't describe a drill clearly, do your best with the available content.`,
      prompt: `Video transcript:\n\n${trimmedTranscript}`,
    })

    return {
      success: true,
      guide: experimental_output,
      videoId,
      thumbnail: youtubeThumbnail(videoId),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('AI guide generation failed:', message)
    return {
      success: false,
      error: `AI guide generation failed: ${message}`,
    }
  }
}

export async function saveDrillYoutube(
  drillId: string,
  youtubeUrl: string,
  guide: z.infer<typeof GuideSchema>,
  thumbnail: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('drills')
    .update({
      youtube_url: youtubeUrl,
      ai_guide: guide,
      preview_image_url: thumbnail,
    })
    .eq('id', drillId)
    .eq('author_id', user.id) // only author can update

  if (error) return { error: error.message }

  revalidatePath(`/drills/${drillId}`)
  return { success: true }
}
