'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function generateShareLink(sessionId: string): Promise<{ token: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Return existing token if already set
  const { data: existing, error: fetchError } = await supabase
    .from('session_plans')
    .select('share_token')
    .eq('id', sessionId)
    .eq('coach_id', user.id)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (!existing) return { error: 'Session not found' }
  if (existing.share_token) return { token: existing.share_token }

  // Generate a new token
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('session_plans')
    .update({ share_token: token })
    .eq('id', sessionId)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/sessions/${sessionId}`)
  return { token }
}

export async function revokeShareLink(sessionId: string): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('session_plans')
    .update({ share_token: null })
    .eq('id', sessionId)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
