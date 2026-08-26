'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createCampaignAutoDraft } from '@/lib/email-campaigns'

function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return copy
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Admin only' as const }
  return { supabase, user, clubId: profile.club_id as string | null }
}

export async function createWeeklyFocus(formData: FormData) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  const { supabase, user, clubId } = guard

  const isGlobal = formData.get('global') === 'on'
  if (!isGlobal && !clubId) {
    return { error: 'You need a club to publish a club-specific focus. Publish globally instead.' }
  }
  const targetClubId = isGlobal ? null : clubId

  const topic = (formData.get('topic') as string).trim()
  const description = (formData.get('description') as string).trim()
  const next_topic = (formData.get('next_topic') as string | null)?.trim() || null
  const drill_ids = formData.getAll('drill_ids').map(v => v as string).filter(Boolean)

  const week_start = getMonday(new Date()).toISOString().split('T')[0]
  const payload = { topic, description, drill_ids, next_topic, created_by: user.id }

  let focus: { id: string } | null
  let error: { message: string } | null

  if (isGlobal) {
    // The "one global focus per week" rule is a partial unique index
    // (club_id IS NULL), which Postgres's ON CONFLICT can't target through
    // supabase-js's plain-column onConflict shorthand -- check-then-write
    // instead of upserting.
    const { data: existing } = await supabase
      .from('weekly_focuses')
      .select('id')
      .is('club_id', null)
      .eq('week_start', week_start)
      .maybeSingle()

    const result = existing
      ? await supabase.from('weekly_focuses').update(payload).eq('id', existing.id).select('id').single()
      : await supabase.from('weekly_focuses').insert({ ...payload, club_id: null, week_start }).select('id').single()
    focus = result.data
    error = result.error
  } else {
    const result = await supabase
      .from('weekly_focuses')
      .upsert(
        { ...payload, club_id: targetClubId, week_start },
        { onConflict: 'club_id,week_start' },
      )
      .select('id')
      .single()
    focus = result.data
    error = result.error
  }

  if (error || !focus) return { error: error?.message ?? 'Could not save the focus' }

  createCampaignAutoDraft('weekly_focus', {
    id: focus.id,
    title: topic ?? 'Weekly Focus',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/weekly-focus`,
    itemType: 'weekly_focus',
  }).catch(err => console.error('[auto-draft weekly-focus]', err))

  revalidatePath('/weekly-focus')
  revalidatePath('/dashboard')
  redirect('/weekly-focus')
}

export async function addFocusComment(focusId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('weekly_focus_comments')
    .insert({ focus_id: focusId, user_id: user.id, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath('/weekly-focus')
  return { ok: true }
}

export async function deleteFocusComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('weekly_focus_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }
  revalidatePath('/weekly-focus')
  return { ok: true }
}
