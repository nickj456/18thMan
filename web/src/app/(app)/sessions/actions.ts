'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import type { SessionDrillItem, AiGuide } from '@/lib/supabase/types'

const LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

const groq = createGroq()

const SessionSummarySchema = z.object({
  overview: z.string().describe('2-3 sentence overview of what this training session covers and its goals'),
  focus_areas: z.array(z.string()).describe('3-5 key coaching focus areas for this session'),
  equipment: z.array(z.string()).describe('Complete equipment list needed for the whole session, deduplicated'),
  warm_up_suggestion: z.string().describe('A brief warm-up suggestion appropriate for this session'),
  coaching_notes: z.string().describe('One paragraph of practical coaching advice for running this session'),
})

export type SessionSummary = z.infer<typeof SessionSummarySchema>

export async function createSession(
  title: string,
  drillsOrder: SessionDrillItem[],
  isShared: boolean,
  groupId?: string,
  scheduledAt?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const totalDuration = drillsOrder.reduce((sum, d) => sum + (d.duration_minutes || 0), 0)

  const { data, error } = await supabase
    .from('session_plans')
    .insert({
      title,
      coach_id: user.id,
      drills_order: drillsOrder,
      total_duration: totalDuration || null,
      is_shared: isShared,
      group_id: groupId ?? null,
      scheduled_at: scheduledAt ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Notify group members when a session is scheduled
  if (groupId && scheduledAt) {
    const { data: me } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    const { data: members } = await supabase
      .from('group_invitations')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'accepted')
      .neq('user_id', user.id)

    await Promise.all(
      (members ?? []).map(m =>
        createNotification(supabase, {
          userId: m.user_id,
          type: 'session_scheduled',
          data: {
            session_id: data.id,
            session_title: title,
            group_id: groupId,
            scheduled_at: scheduledAt,
            scheduled_by_display_name: me?.display_name ?? me?.username ?? 'Coach',
          },
        })
      )
    )
  }

  revalidatePath('/sessions')
  if (groupId) revalidatePath(`/groups/${groupId}`)
  redirect(`/sessions/${data.id}`)
}

export async function updateSession(
  id: string,
  title: string,
  drillsOrder: SessionDrillItem[],
  isShared: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify the user is authorised: either the owner, or a group member holding the lock
  const { data: session } = await supabase
    .from('session_plans')
    .select('coach_id, group_id, locked_by')
    .eq('id', id)
    .single()

  if (!session) return { error: 'Session not found' }

  const isOwner = session.coach_id === user.id
  const isLockHolder = session.group_id !== null && session.locked_by === user.id
  if (!isOwner && !isLockHolder) return { error: 'Not authorised to edit this session' }

  const totalDuration = drillsOrder.reduce((sum, d) => sum + (d.duration_minutes || 0), 0)

  const { error } = await supabase
    .from('session_plans')
    .update({
      title,
      drills_order: drillsOrder,
      total_duration: totalDuration || null,
      is_shared: isShared,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Release the lock after saving (group sessions only)
  if (isLockHolder) {
    await supabase
      .from('session_plans')
      .update({ locked_by: null, locked_at: null })
      .eq('id', id)
  }

  revalidatePath('/sessions')
  revalidatePath(`/sessions/${id}`)
  if (session.group_id) revalidatePath(`/groups/${session.group_id}`)
  redirect(`/sessions/${id}`)
}

export async function generateSessionSummary(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: session } = await supabase
    .from('session_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) return { error: 'Session not found' }

  const drillIds = (session.drills_order as SessionDrillItem[]).map(d => d.drill_id)
  if (drillIds.length === 0) return { error: 'No drills in session' }

  const { data: drills } = await supabase
    .from('drills')
    .select('id, title, description, ai_guide')
    .in('id', drillIds)

  const drillMap = new Map((drills ?? []).map(d => [d.id, d]))

  const drillSummaries = (session.drills_order as SessionDrillItem[]).map((item, i) => {
    const drill = drillMap.get(item.drill_id)
    if (!drill) return null
    const guide = drill.ai_guide as AiGuide | null
    return `${i + 1}. ${drill.title} (${item.duration_minutes} min)${
      guide ? `\n   Overview: ${guide.overview}\n   Equipment: ${guide.equipment?.join(', ') || 'none'}` : ''
    }${item.notes ? `\n   Coach notes: ${item.notes}` : ''}`
  }).filter(Boolean).join('\n\n')

  try {
    const { experimental_output } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      output: Output.object({ schema: SessionSummarySchema }),
      system: `You are an expert rugby league coach. Generate a practical session summary to help a coach prepare and run this training session.`,
      prompt: `Session: "${session.title}"\nTotal duration: ${session.total_duration ?? 0} minutes\n\nDrills:\n${drillSummaries}`,
    })

    const { error } = await supabase
      .from('session_plans')
      .update({ ai_summary: experimental_output })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath(`/sessions/${id}`)
    return { success: true, summary: experimental_output }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `AI generation failed: ${message}` }
  }
}

export async function deleteSession(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('session_plans')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/sessions')
  redirect('/sessions')
}

export async function acquireLock(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: session } = await supabase
    .from('session_plans')
    .select('locked_by, locked_at, group_id, profiles!session_plans_locked_by_fkey(display_name, username)')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found' }
  if (!session.group_id) return { error: 'Not a group session' }

  // Check if lock is held and not expired
  if (session.locked_by && session.locked_by !== user.id) {
    const lockedAt = session.locked_at ? new Date(session.locked_at).getTime() : 0
    if (Date.now() - lockedAt < LOCK_TIMEOUT_MS) {
      const p = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles
      const holder = (p as { display_name: string | null; username: string } | null)
      const name = holder?.display_name ?? holder?.username ?? 'Someone'
      return { error: `${name} is currently editing this session` }
    }
  }

  const { error } = await supabase
    .from('session_plans')
    .update({ locked_by: user.id, locked_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

export async function releaseLock(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('session_plans')
    .update({ locked_by: null, locked_at: null })
    .eq('id', sessionId)
    .eq('locked_by', user.id)

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
