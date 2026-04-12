'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Not authenticated' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase: null, error: 'Not authorised' as const }
  return { supabase, error: null }
}

export async function approveDrill(drillId: string) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  const { error: dbError } = await supabase
    .from('drills')
    .update({ approval_status: 'approved' })
    .eq('id', drillId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/drills')
  revalidatePath('/drills')
  return { success: true }
}

export async function rejectDrill(drillId: string) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  const { error: dbError } = await supabase
    .from('drills')
    .update({ approval_status: 'rejected' })
    .eq('id', drillId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/drills')
  revalidatePath('/drills')
  return { success: true }
}
