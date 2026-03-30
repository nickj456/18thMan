import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return Response.json([])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Extract meaningful words (3+ chars, skip common stop words)
  const stopWords = new Set(['the', 'and', 'for', 'how', 'can', 'you', 'are', 'with', 'what', 'some', 'give', 'me', 'do', 'to', 'a', 'an', 'in', 'of', 'is', 'it', 'my', 'we', 'i', 'on', 'at', 'be', 'or'])
  const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w))

  if (keywords.length === 0) return Response.json([])

  // Build OR filter across title and description for each keyword
  const orFilters = keywords.flatMap(kw => [
    `title.ilike.%${kw}%`,
    `description.ilike.%${kw}%`,
  ]).join(',')

  const { data: drills } = await supabase
    .from('drills')
    .select('id, title, difficulty, age_group, category:drill_categories(name, slug)')
    .or(orFilters)
    .limit(3)

  return Response.json(drills ?? [])
}
