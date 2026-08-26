'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ActiveAnnouncement {
  id: string
  message: string
  linkUrl: string | null
  linkLabel: string | null
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, userId: user.id }
}

export async function getActiveAnnouncementForUser(): Promise<ActiveAnnouncement | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role) return null

  const { data: announcement } = await supabase
    .from('announcements')
    .select('id, message, link_url, link_label')
    .eq('active', true)
    .or(`target_roles.is.null,target_roles.cs.{${profile.role}}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!announcement) return null

  const { data: dismissal } = await supabase
    .from('announcement_dismissals')
    .select('announcement_id')
    .eq('announcement_id', announcement.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (dismissal) return null

  return {
    id: announcement.id,
    message: announcement.message,
    linkUrl: announcement.link_url,
    linkLabel: announcement.link_label,
  }
}

export async function dismissAnnouncement(announcementId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { error } = await supabase
    .from('announcement_dismissals')
    .upsert(
      { announcement_id: announcementId, user_id: user.id },
      { onConflict: 'announcement_id,user_id' },
    )
  if (error) return { error: error.message }
  return {}
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, userId } = await requireAdmin()

  const message = (formData.get('message') as string)?.trim()
  if (!message) throw new Error('Message is required')

  const linkUrl = (formData.get('linkUrl') as string)?.trim() || null
  const linkLabel = (formData.get('linkLabel') as string)?.trim() || null
  const active = formData.get('active') === 'on'

  // No roles checked, or all of them checked, both mean "everyone" --
  // stored as null so the read-side query's `target_roles.is.null` branch
  // covers it without special-casing a full-length array.
  const checkedRoles = formData.getAll('roles') as string[]
  const targetRoles = checkedRoles.length === 0 || checkedRoles.length === 3 ? null : checkedRoles

  const { error } = await supabase.from('announcements').insert({
    message,
    link_url: linkUrl,
    link_label: linkLabel,
    active,
    created_by: userId,
    target_roles: targetRoles,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/announcements')
}

export async function setAnnouncementActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('announcements').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/announcements')
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/announcements')
}
