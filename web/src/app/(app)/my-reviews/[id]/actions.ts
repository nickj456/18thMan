'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function deleteReview(reviewId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('squad_reviews')
    .delete()
    .eq('id', reviewId)

  if (error) return { error: error.message }

  redirect('/my-reviews')
}
