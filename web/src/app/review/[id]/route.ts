import { NextRequest } from 'next/server'

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Review not found — 18th Man</title>
  <style>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📋</div>
    <h1>This review is no longer available.</h1>
    <p>It may have been deleted from the Match Analyst app.</p>
  </div>
</body>
</html>`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/squad-review/${id}`
  )
  if (res.status === 404 || res.status === 410) {
    return new Response(NOT_FOUND_HTML, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  const html = await res.text()
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/squad-review/${id}/submit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
