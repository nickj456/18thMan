import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/player-report/${id}`
  )
  const html = await res.text()
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/player-report/${id}/respond`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
