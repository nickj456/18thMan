import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CARD_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0b0d13;
    color: #e4e4e7;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .card {
    max-width: 420px;
    width: 100%;
    text-align: center;
    padding: 2.5rem 2rem;
    border: 1px solid #27272a;
    border-radius: 1rem;
    background: #111318;
  }
  .icon { font-size: 2.5rem; margin-bottom: 1rem; }
  h1 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
  p { font-size: 0.875rem; color: #71717a; line-height: 1.5; }
`

function htmlPage(title: string, icon: string, heading: string, body: string, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — 18th Man</title>
  <style>${CARD_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${heading}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

// Returns null if access is allowed, or an HTML Response if it should be blocked.
async function checkGroupAccess(id: string): Promise<Response | null> {
  const supabase = await createClient()

  const { data: review } = await supabase
    .from('squad_reviews')
    .select('group_id')
    .eq('id', id)
    .single()

  // No row found — let the Edge Function handle the 404.
  // No group_id set — open review, anyone can access.
  if (!review?.group_id) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return htmlPage(
      'Restricted review',
      '🔒',
      'This review is restricted to a specific group.',
      'Contact your coach if you think you should have access.',
      403,
    )
  }

  const [{ data: membership }, { data: creator }] = await Promise.all([
    supabase
      .from('group_invitations')
      .select('id')
      .eq('group_id', review.group_id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle(),
    supabase
      .from('coaching_groups')
      .select('id')
      .eq('id', review.group_id)
      .eq('created_by', user.id)
      .maybeSingle(),
  ])

  if (!membership && !creator) {
    return htmlPage(
      'Restricted review',
      '🔒',
      'This review is restricted to a specific group.',
      'Contact your coach if you think you should have access.',
      403,
    )
  }

  return null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const blocked = await checkGroupAccess(id)
  if (blocked) return blocked

  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/squad-review/${id}`
  )
  if (res.status === 404 || res.status === 410) {
    return htmlPage(
      'Review not found',
      '📋',
      'This review is no longer available.',
      'It may have been deleted from the Match Analyst app.',
      404,
    )
  }
  const html = await res.text()
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const blocked = await checkGroupAccess(id)
  if (blocked) return Response.json({ error: 'Access denied' }, { status: 403 })

  const body = await req.json()
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/squad-review/${id}/submit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
