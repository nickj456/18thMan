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

// Injects localStorage draft-saving behaviour into the review form.
// Auto-saves on every input change (debounced 600ms) and restores on load.
function injectSaveDraft(html: string, reviewId: string): string {
  const safeId = reviewId.replace(/[^a-z0-9-]/gi, '')

  const script = `
<style>
  #draft-banner {
    position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 0.5rem;
    background: #18181b; border: 1px solid #3f3f46; border-radius: 0.625rem;
    padding: 0.5rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 0.8125rem; color: #a1a1aa; z-index: 9999;
    opacity: 0; transition: opacity 0.2s; pointer-events: none;
  }
  #draft-banner.visible { opacity: 1; pointer-events: auto; }
  #draft-banner .dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
  #draft-restore-bar {
    position: sticky; top: 0; z-index: 998; background: #1c1917;
    border-bottom: 1px solid #292524; padding: 0.625rem 1rem;
    display: none; align-items: center; justify-content: space-between; gap: 0.75rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 0.8125rem; color: #a8a29e;
  }
  #draft-restore-bar.visible { display: flex; }
  #draft-restore-bar button {
    font-size: 0.8125rem; padding: 0.25rem 0.75rem; border-radius: 0.375rem;
    cursor: pointer; border: 1px solid; transition: background 0.15s;
  }
  #draft-restore-bar .btn-restore {
    background: #065f46; border-color: #059669; color: #6ee7b7;
  }
  #draft-restore-bar .btn-restore:hover { background: #047857; }
  #draft-restore-bar .btn-discard {
    background: transparent; border-color: #3f3f46; color: #71717a;
  }
  #draft-restore-bar .btn-discard:hover { background: #27272a; }
</style>
<div id="draft-restore-bar">
  <span>You have a saved draft — restore your progress?</span>
  <div style="display:flex;gap:0.5rem;">
    <button class="btn-restore" id="draft-btn-restore">Restore draft</button>
    <button class="btn-discard" id="draft-btn-discard">Discard</button>
  </div>
</div>
<div id="draft-banner"><span class="dot"></span><span id="draft-banner-text">Draft saved</span></div>
<script>
(function(){
  var KEY = '18thman_review_draft_${safeId}';
  var bannerTimer;

  function showBanner(msg) {
    var b = document.getElementById('draft-banner');
    var t = document.getElementById('draft-banner-text');
    if (!b || !t) return;
    t.textContent = msg;
    b.classList.add('visible');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function(){ b.classList.remove('visible'); }, 2500);
  }

  function serializeForm() {
    var form = document.querySelector('form');
    if (!form) return null;
    var data = {};
    form.querySelectorAll('input,textarea,select').forEach(function(el) {
      var name = el.getAttribute('name');
      if (!name) return;
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (el.checked) data[name] = el.value;
      } else {
        data[name] = el.value;
      }
    });
    return data;
  }

  function restoreForm(data) {
    var form = document.querySelector('form');
    if (!form) return;
    Object.keys(data).forEach(function(name) {
      var val = data[name];
      form.querySelectorAll('[name="' + CSS.escape(name) + '"]').forEach(function(el) {
        if (el.type === 'radio' || el.type === 'checkbox') {
          el.checked = el.value === val;
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e) { return null; }
  }

  function saveDraft() {
    var data = serializeForm();
    if (!data) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      showBanner('Draft saved');
    } catch(e) {}
  }

  function clearDraft() {
    try { localStorage.removeItem(KEY); } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', function() {
    var draft = loadDraft();
    if (draft && Object.keys(draft).length > 0) {
      var bar = document.getElementById('draft-restore-bar');
      if (bar) bar.classList.add('visible');

      document.getElementById('draft-btn-restore').addEventListener('click', function() {
        restoreForm(draft);
        bar.classList.remove('visible');
        showBanner('Draft restored');
      });
      document.getElementById('draft-btn-discard').addEventListener('click', function() {
        clearDraft();
        bar.classList.remove('visible');
      });
    }
  });

  var saveTimer;
  document.addEventListener('input', function() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 600);
  });
  document.addEventListener('change', function() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 600);
  });

  document.addEventListener('submit', function() {
    clearDraft();
  }, true);
})();
</script>`

  const insertBefore = '</body>'
  const idx = html.lastIndexOf(insertBefore)
  if (idx === -1) return html + script
  return html.slice(0, idx) + script + html.slice(idx)
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
  html = injectSaveDraft(html, id)
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
