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

// Injects a "Watch on Veo" banner and a timestamp deep-link script into
// the Edge Function's HTML response. Both are inserted right before </body>.
function injectVeo(html: string, veoUrl: string): string {
  // Escape the URL for safe embedding in a JS string literal
  const safeUrl = veoUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  const banner = `
<div style="position:sticky;top:0;z-index:999;background:#0f172a;border-bottom:1px solid #1e293b;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:8px;">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  <a href="${veoUrl}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:0.875rem;font-weight:600;text-decoration:none;letter-spacing:0.01em;">Watch on Veo</a>
</div>
<script>
(function(){
  var base='${safeUrl}'.replace(/#[\\s\\S]*$/,'').replace(/\\/$/,'');
  function toLink(sec){
    var mm=String(Math.floor(sec/60)).padStart(2,'0');
    var ss=String(sec%60).padStart(2,'0');
    return base+'/#t='+mm+':'+ss;
  }
  // Elements carrying data-ts="<seconds>" get replaced with Veo deep-links
  document.querySelectorAll('[data-ts]').forEach(function(el){
    var sec=parseInt(el.getAttribute('data-ts'),10);
    if(isNaN(sec))return;
    var a=document.createElement('a');
    a.href=toLink(sec);
    a.target='_blank';
    a.rel='noopener noreferrer';
    a.style.cssText='color:#3b82f6;text-decoration:underline;font-weight:600;';
    a.textContent=el.textContent;
    el.parentNode.replaceChild(a,el);
  });
})();
</script>`

  const insertBefore = '</body>'
  const idx = html.lastIndexOf(insertBefore)
  if (idx === -1) return html + banner
  return html.slice(0, idx) + banner + html.slice(idx)
}

type ReviewMeta = { group_id: string | null; veo_url: string | null }

async function getReviewMeta(id: string): Promise<{ meta: ReviewMeta | null; blocked: Response | null }> {
  const supabase = await createClient()

  const { data: meta } = await supabase
    .from('squad_reviews')
    .select('group_id, veo_url')
    .eq('id', id)
    .single()

  if (!meta?.group_id) return { meta: meta ?? null, blocked: null }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      meta,
      blocked: htmlPage(
        'Restricted review',
        '🔒',
        'This review is restricted to a specific group.',
        'Contact your coach if you think you should have access.',
        403,
      ),
    }
  }

  const [{ data: membership }, { data: creator }] = await Promise.all([
    supabase
      .from('group_invitations')
      .select('id')
      .eq('group_id', meta.group_id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle(),
    supabase
      .from('coaching_groups')
      .select('id')
      .eq('id', meta.group_id)
      .eq('created_by', user.id)
      .maybeSingle(),
  ])

  if (!membership && !creator) {
    return {
      meta,
      blocked: htmlPage(
        'Restricted review',
        '🔒',
        'This review is restricted to a specific group.',
        'Contact your coach if you think you should have access.',
        403,
      ),
    }
  }

  return { meta, blocked: null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { meta, blocked } = await getReviewMeta(id)
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

  let html = await res.text()
  if (meta?.veo_url) {
    html = injectVeo(html, meta.veo_url)
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { blocked } = await getReviewMeta(id)
  if (blocked) return Response.json({ error: 'Access denied' }, { status: 403 })

  const body = await req.json()
  const res = await fetch(
    `https://khslkwspsqyopicxufun.supabase.co/functions/v1/squad-review/${id}/submit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
