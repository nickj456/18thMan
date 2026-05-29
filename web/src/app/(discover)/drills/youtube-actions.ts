'use server'

import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { extractYouTubeId, fetchTranscript, fetchVideoTitle, youtubeThumbnail } from '@/lib/youtube'

const groq = createGroq()

const GuideSchema = z.object({
  overview: z.string().describe('2-3 sentence overview of the drill or skill and its purpose in rugby league'),
  how_to_perform: z.array(z.string()).describe('Step-by-step instructions for running this drill, or step-by-step technique breakdown for a skill demonstration. 4-8 steps.'),
  coaching_points: z.array(z.string()).describe('Key coaching points to emphasise when observing players, 3-6 items'),
  key_cues: z.array(z.string()).describe('Short verbal cues coaches can call out during practice, 3-5 items'),
  variations: z.array(z.string()).describe('Ways to progress, regress, or vary the activity, 2-4 items'),
  equipment: z.array(z.string()).describe('Equipment needed, e.g. cones, tackle bags, balls. Empty array if none beyond a ball.'),
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

  let transcript: string | null = null
  let videoTitle: string | null = null

  try {
    transcript = await fetchTranscript(videoId)
    console.log(`[guide] transcript length for ${videoId}: ${transcript.length}`)
    if (transcript.length < 10) transcript = null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[guide] transcript unavailable for ${videoId}: ${msg} — fetching title via oEmbed`)
  }

  if (!transcript) {
    videoTitle = await fetchVideoTitle(videoId)
    console.log(`[guide] oEmbed title for ${videoId}: ${videoTitle ?? '(none)'}`)
  }

  return generateGuideFromContent(videoId, transcript, videoTitle ?? undefined)
}

export async function generateDrillGuideFromMetadata(
  videoId: string,
  title: string,
  description: string
): Promise<GenerateGuideResult> {
  return generateGuideFromContent(videoId, null, title, description)
}

async function generateGuideFromContent(
  videoId: string,
  transcript: string | null,
  title?: string,
  description?: string
): Promise<GenerateGuideResult> {
  const hasTranscript = transcript && transcript.length >= 10

  const prompt = hasTranscript
    ? `Video transcript:\n\n${transcript.split(' ').slice(0, 6000).join(' ')}`
    : `Drill title: ${title ?? videoId}\n${description ? `\nDescription: ${description}` : ''}`

  const systemNote = hasTranscript
    ? 'Extract a structured coaching guide from the provided video transcript.'
    : 'Generate a structured coaching guide based on the video title and any description provided.'

  const jsonInstructions = `
Respond with valid JSON only — no markdown, no code fences, no extra text. Use exactly this structure:
{
  "overview": "string",
  "how_to_perform": ["string"],
  "coaching_points": ["string"],
  "key_cues": ["string"],
  "variations": ["string"],
  "equipment": ["string"]
}`

  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: `You are an expert rugby league coach creating a coaching resource from a YouTube video.
${systemNote}

Important guidelines:
- The video may show a structured drill OR a technique/skill demonstration (e.g. kicking technique, passing mechanics). Adapt accordingly.
- For technique videos (kicking, passing, catching), frame the guide as a skill development activity: describe what the technique involves, the coaching points to observe, and how a coach can structure practice around it.
- For structured drills, provide clear step-by-step setup and execution.
- Use rugby league terminology throughout.
- Be honest to what the content actually covers — do not invent drill structures that aren't there.
- If the content is specifically about kicking (bombs, grubbers, chip kicks, drop goals, conversions, restarts), focus the coaching points on foot placement, body position, ball contact, and timing.
${jsonInstructions}`,
      prompt,
    })

    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const guide = GuideSchema.parse(JSON.parse(clean))

    return {
      success: true,
      guide,
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
