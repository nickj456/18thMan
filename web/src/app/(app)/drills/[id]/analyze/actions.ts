'use server'

import { createClient } from '@/lib/supabase/server'

export async function getClipSignedUrl(
  storagePath: string
): Promise<{ signedUrl?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // IDOR guard: ensure the path belongs to the authenticated user
  const [folder] = storagePath.split('/')
  if (folder !== user.id) return { error: 'Forbidden' }

  const { data, error } = await supabase.storage
    .from('clip-annotations')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return { error: error?.message ?? 'Failed to generate URL' }
  return { signedUrl: data.signedUrl }
}
