import { createServiceClient } from '@/lib/supabase/service'

/**
 * Returns true if `userId` is authorised to manage `clubId` — i.e. they created
 * the club or their profile is the club's admin. Uses the service client so the
 * decision does not depend on the (intentionally narrow) clubs RLS SELECT policy.
 *
 * Use this before any club-scoped privileged action (billing portal, checkout,
 * settings) — never trust a clubId supplied in a request body without it.
 */
export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  if (!userId || !clubId) return false
  const service = createServiceClient()

  const { data: club } = await service
    .from('clubs')
    .select('created_by')
    .eq('id', clubId)
    .single()

  if (!club) return false
  if (club.created_by === userId) return true

  const { data: profile } = await service
    .from('profiles')
    .select('club_id, club_role')
    .eq('id', userId)
    .single()

  return profile?.club_id === clubId && profile?.club_role === 'admin'
}
