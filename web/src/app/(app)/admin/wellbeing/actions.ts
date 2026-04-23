'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateText, Output } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { WellbeingResourceType } from '@/lib/supabase/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, userId: user.id }
}

export async function createWellbeingResource(formData: FormData) {
  const { supabase, userId } = await requireAdmin()

  const type = formData.get('type') as WellbeingResourceType
  const title = (formData.get('title') as string)?.trim()
  const subtitle = (formData.get('subtitle') as string)?.trim() || null

  if (!type) throw new Error('Type is required')
  if (!title) throw new Error('Title is required')

  const { data: existing } = await supabase
    .from('wellbeing_resources')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase.from('wellbeing_resources').insert({
    type,
    title,
    subtitle,
    content: {},
    sort_order: nextOrder,
    created_by: userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
  redirect('/admin/wellbeing')
}

export async function deleteWellbeingResource(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('wellbeing_resources').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}

export async function updateWellbeingResource(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()

  const title = (formData.get('title') as string)?.trim()
  const subtitle = (formData.get('subtitle') as string)?.trim() || null
  const contentRaw = (formData.get('content') as string)?.trim()

  if (!title) throw new Error('Title is required')

  let content: Record<string, unknown> = {}
  if (contentRaw) {
    try {
      content = JSON.parse(contentRaw)
    } catch {
      throw new Error('Content must be valid JSON')
    }
  }

  const { error } = await supabase
    .from('wellbeing_resources')
    .update({ title, subtitle, content })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}

// ─── AI generation helpers ────────────────────────────────────────────────────

const WellbeingAiSchema = z.object({
  summary: z.string().describe('2-4 paragraph summary of the resource, written for rugby league coaches and athletes'),
  key_points: z.array(z.string()).describe('5-8 key takeaways from the resource'),
  guidance: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    })
  ).describe('3-6 practical guidance items tailored to rugby league athletes and coaches'),
})

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 18thManBot/1.0)' },
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)
  const html = await res.text()
  // Strip tags, collapse whitespace, limit to 8k chars for context
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000)
}

export async function generateWellbeingFromUrl(formData: FormData) {
  const { supabase, userId } = await requireAdmin()

  const url = (formData.get('url') as string)?.trim()
  const type = formData.get('type') as WellbeingResourceType
  const titleOverride = (formData.get('title') as string)?.trim() || null

  if (!url) throw new Error('URL is required')
  if (!type) throw new Error('Type is required')

  let pageText: string
  try {
    pageText = await fetchPageText(url)
  } catch {
    throw new Error('Could not fetch the URL — check it is publicly accessible')
  }

  const typeLabel = type === 'nutrition_plan' ? 'nutrition plan'
    : type === 'nutrition_guide' ? 'nutrition guide'
    : 'mental health resource'

  const { experimental_output } = await generateText({
    model: gateway('anthropic/claude-haiku-4.5'),
    output: Output.object({ schema: WellbeingAiSchema }),
    system: `You are an expert in rugby league athlete welfare. Summarise the provided web page content as a ${typeLabel} resource for rugby league coaches and players aged 12–18. Be practical and specific.`,
    prompt: `URL: ${url}\n\nPage content:\n${pageText}`,
  })

  const generated = experimental_output

  const { data: existing } = await supabase
    .from('wellbeing_resources')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const title = titleOverride || `Resource from ${new URL(url).hostname.replace(/^www\./, '')}`

  const { error } = await supabase.from('wellbeing_resources').insert({
    type,
    title,
    subtitle: null,
    source_url: url,
    content: {
      ai_generated: true,
      source_url: url,
      summary: generated.summary,
      key_points: generated.key_points,
      guidance: generated.guidance,
    },
    sort_order: nextOrder,
    created_by: userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
  redirect('/admin/wellbeing')
}

export async function updateWellbeingSortOrder(id: string, direction: 'up' | 'down') {
  const { supabase } = await requireAdmin()

  const { data: resources } = await supabase
    .from('wellbeing_resources')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })

  if (!resources) return
  const idx = resources.findIndex(r => r.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= resources.length) return

  const a = resources[idx]
  const b = resources[swapIdx]

  await Promise.all([
    supabase.from('wellbeing_resources').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('wellbeing_resources').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}
