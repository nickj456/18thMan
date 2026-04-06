'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase/types'

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
