'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchLinkPreview } from '@/lib/link-preview'

const groq = createGroq()

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, profile }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPodcast(formData: FormData) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }
  if (!profile || profile.role === 'viewer') return { error: 'Coaches only' }

  const externalUrl = (formData.get('external_url') as string)?.trim()
  const note = (formData.get('note') as string)?.trim() || null

  if (!externalUrl) return { error: 'Podcast URL is required' }

  // Use pre-fetched title/description passed from client, or fall back to a fresh fetch
  const previewTitle = (formData.get('preview_title') as string)?.trim() || null
  const previewDescription = (formData.get('preview_description') as string)?.trim() || null
  const previewImage = (formData.get('preview_image') as string)?.trim() || null

  let title = previewTitle
  let description = previewDescription
  let coverImageUrl = previewImage
  if (!title) {
    const preview = await fetchLinkPreview(externalUrl)
    title = preview?.title ?? externalUrl
    description = preview?.description ?? null
    coverImageUrl = preview?.image ?? null
  }

  const durationText: string | null = null
  const tagsRaw = ''

  const { data: podcast, error } = await supabase
    .from('podcasts')
    .insert({
      title,
      external_url: externalUrl,
      description,
      duration_text: durationText,
      cover_image_url: coverImageUrl,
      uploaded_by: user.id,
    })
    .select('id')
    .single()

  if (error || !podcast) return { error: error?.message ?? 'Failed to create podcast' }

  // Post the user's note as the first comment
  if (note) {
    await supabase.from('podcast_comments').insert({
      podcast_id: podcast.id,
      user_id: user.id,
      content: note,
    })
  }

  // Always run AI tagging in the background from title + description
  const podcastId = podcast.id
  after(async () => {
    await generatePodcastAI(podcastId, title!, description)
  })

  revalidatePath('/podcasts')
  redirect(`/podcasts/${podcast.id}`)
}

// ─── AI: tags from title + description ───────────────────────────────────────

async function generatePodcastAI(podcastId: string, title: string, description: string | null) {
  try {
    const content = [
      `Title: ${title}`,
      description ? `Description: ${description}` : '',
    ].filter(Boolean).join('\n\n')

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: `You are a rugby league coaching assistant. Given the following podcast title and description, return a JSON object with exactly one field:
- "tags": an array of 5-12 lowercase tag strings covering tactics, skills, age groups, and coaching concepts discussed (e.g. "defensive shape", "set plays", "u14s", "line speed", "conditioning").

Return ONLY valid JSON. No preamble, no explanation, no markdown code fences.

PODCAST:
${content}`,
    })

    let parsed: { tags?: string[] } | null = null
    try {
      // Strip any accidental markdown fences
      const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return
    }

    const service = createServiceClient()

    if (parsed?.tags && Array.isArray(parsed.tags) && parsed.tags.length > 0) {
      const tags = parsed.tags
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0 && t.length <= 60)
        .slice(0, 15)

      await service.from('podcast_tags').upsert(
        tags.map(tag => ({ podcast_id: podcastId, tag, source: 'ai' })),
        { onConflict: 'podcast_id,tag' }
      )
    }
  } catch {
    // AI failure is non-fatal — podcast already saved without summary/AI tags
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePodcast(podcastId: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const isAdmin = profile?.role === 'admin'
  const query = supabase.from('podcasts').delete().eq('id', podcastId)
  const { error } = await (isAdmin ? query : query.eq('uploaded_by', user.id))

  if (error) return { error: error.message }

  revalidatePath('/podcasts')
  redirect('/podcasts')
}

// ─── Play count ──────────────────────────────────────────────────────────────

export async function incrementPlayCount(podcastId: string) {
  const service = createServiceClient()
  await service.rpc('increment_podcast_play_count', { podcast_id: podcastId })
}

// ─── Saves / bookmarks ───────────────────────────────────────────────────────

export async function togglePodcastSave(podcastId: string) {
  const { supabase, user } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('podcast_saves')
    .select('podcast_id')
    .eq('podcast_id', podcastId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('podcast_saves')
      .delete()
      .eq('podcast_id', podcastId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
    return { saved: false }
  } else {
    const { error } = await supabase
      .from('podcast_saves')
      .insert({ podcast_id: podcastId, user_id: user.id })
    if (error) return { error: error.message }
    return { saved: true }
  }
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function togglePodcastReaction(podcastId: string, reaction: 'like' | 'love') {
  const { supabase, user } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('podcast_reactions')
    .select('reaction')
    .eq('podcast_id', podcastId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { error } = await supabase
      .from('podcast_reactions')
      .insert({ podcast_id: podcastId, user_id: user.id, reaction })
    if (error) return { error: error.message }
  } else if (existing.reaction === reaction) {
    const { error } = await supabase
      .from('podcast_reactions')
      .delete()
      .eq('podcast_id', podcastId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('podcast_reactions')
      .update({ reaction })
      .eq('podcast_id', podcastId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  }

  return { success: true }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addPodcastComment(podcastId: string, content: string) {
  const { supabase, user } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Comment cannot be empty' }

  const { error } = await supabase
    .from('podcast_comments')
    .insert({ podcast_id: podcastId, user_id: user.id, content: trimmed })

  if (error) return { error: error.message }
  revalidatePath(`/podcasts/${podcastId}`)
  return { success: true }
}

export async function deletePodcastComment(commentId: string, podcastId: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const isAdmin = profile?.role === 'admin'
  const query = supabase.from('podcast_comments').delete().eq('id', commentId)
  const { error } = await (isAdmin ? query : query.eq('user_id', user.id))

  if (error) return { error: error.message }
  revalidatePath(`/podcasts/${podcastId}`)
  return { success: true }
}
