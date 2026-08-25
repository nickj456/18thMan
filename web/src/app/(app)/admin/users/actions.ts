'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase/types'
import { sendDirectEmailHtml } from '@/lib/email'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function updateAdminNote(targetUserId: string, note: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin()
  if (note.length > 2000) return { error: 'Note too long (max 2000 characters)' }
  const { error } = await supabase
    .from('admin_user_notes')
    .upsert({ user_id: targetUserId, note: note.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  const { user } = await requireAdmin()
  if (targetUserId === user.id) return { error: 'You cannot delete your own account' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceClient.auth.admin.deleteUser(targetUserId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

export async function resetCoachDnaData(targetUserId: string, reason: string): Promise<{ error?: string }> {
  const { user } = await requireAdmin()

  const trimmedReason = reason.trim()
  if (!trimmedReason) return { error: 'A reason is required' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: logError } = await serviceClient
    .from('admin_coach_dna_reset_log')
    .insert({ admin_id: user.id, coach_id: targetUserId, reason: trimmedReason })
  if (logError) return { error: logError.message }

  const { error: attemptsError } = await serviceClient.from('assessment_attempts').delete().eq('coach_id', targetUserId)
  if (attemptsError) return { error: attemptsError.message }

  const { error: feedbackError } = await serviceClient.from('feedback_requests').delete().eq('coach_id', targetUserId)
  if (feedbackError) return { error: feedbackError.message }

  const { error: profileError } = await serviceClient
    .from('coach_profiles')
    .update({ ai_summary: null, ai_summary_generated_at: null })
    .eq('user_id', targetUserId)
  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return {}
}

export async function sendDirectEmail(
  targetUserId: string,
  subject: string,
  bodyHtml: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin()

  const trimmedSubject = subject.trim()
  const trimmedBody = bodyHtml.trim()
  if (!trimmedSubject) return { error: 'Subject is required' }
  if (!trimmedBody) return { error: 'Message body is required' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    serviceClient.auth.admin.getUserById(targetUserId),
    supabase.from('profiles').select('display_name, username').eq('id', targetUserId).single(),
  ])

  const recipientEmail = authUser?.user?.email
  if (!recipientEmail) return { error: 'This user has no email on file' }

  const displayName = profile?.display_name ?? profile?.username ?? ''

  const result = await sendDirectEmailHtml(recipientEmail, displayName, trimmedSubject, trimmedBody)
  if (!result.success) return { error: result.error }

  await serviceClient.from('email_sends').insert({
    user_id: targetUserId,
    category: 'direct_admin',
    resend_message_id: result.messageId ?? null,
  })

  return {}
}
