import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { GameStatsPDF } from '@/components/game-stats/GameStatsPDF'
import type { GameStatEvent, GameStatSessionWithMatch } from '@/lib/supabase/types'
import type { Player } from '@/lib/supabase/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()

    if (!profile?.club_id) return new Response('Forbidden', { status: 403 })

    const { data: session } = await supabase
      .from('game_stat_sessions')
      .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
      .eq('id', sessionId)
      .single() as { data: GameStatSessionWithMatch | null }

    if (!session) return new Response('Not Found', { status: 404 })

    const match = Array.isArray(session.match) ? session.match[0] : session.match

    const { data: group } = await supabase
      .from('coaching_groups')
      .select('club_id, name')
      .eq('id', session.group_id)
      .single()

    if (!group || group.club_id !== profile.club_id) {
      return new Response('Forbidden', { status: 403 })
    }

    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .eq('group_id', session.group_id)
      .order('name') as { data: Pick<Player, 'id' | 'name'>[] | null }

    const { data: events } = await supabase
      .from('game_stat_events')
      .select('id, session_id, player_id, stat_type, half, completed, created_by, created_at')
      .eq('session_id', sessionId) as { data: GameStatEvent[] | null }

    const allPlayers = players ?? []
    const allEvents  = events ?? []

    const carryEvents  = allEvents.filter(e => e.stat_type === 'carry')
    const tackleEvents = allEvents.filter(e => e.stat_type === 'tackle')
    const setEvents    = allEvents.filter(e => e.stat_type === 'set_completion')

    const carries = allPlayers
      .map(p => ({ name: p.name, count: carryEvents.filter(e => e.player_id === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)

    const tackles = allPlayers
      .map(p => ({ name: p.name, count: tackleEvents.filter(e => e.player_id === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)

    const h1Sets = setEvents.filter(e => e.half === 1)
    const h2Sets = setEvents.filter(e => e.half === 2)

    const buffer = await renderToBuffer(
      <GameStatsPDF
        data={{
          opponent:  match?.opponent ?? 'Unknown',
          matchDate: match?.match_date ?? '',
          groupName: group.name,
          location:  match?.location === 'home' ? 'Home' : 'Away',
          carries,
          tackles,
          sets: {
            half1: { completed: h1Sets.filter(e => e.completed).length, total: h1Sets.length },
            half2: { completed: h2Sets.filter(e => e.completed).length, total: h2Sets.length },
          },
        }}
      />,
    )

    const slug = (match?.opponent ?? 'match')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}-game-stats.pdf"`,
      },
    })
  } catch (err) {
    console.error('[game-stats/pdf] Failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
