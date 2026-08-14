import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Gate for the safeguarding/disputes queues: a club admin (scoped to their
 *  own club via RLS) or a platform admin (sees all clubs). */
export async function requireFeedbackModerator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, club_role').eq('id', user.id).single()
  const isPlatformAdmin = profile?.role === 'admin'
  if (!isPlatformAdmin && profile?.club_role !== 'admin') redirect('/dashboard')
  return { supabase, userId: user.id, isPlatformAdmin }
}
