'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Copy, Check, Sparkles, ImageIcon, ChevronRight, Download, RefreshCw, X, ImagePlus } from 'lucide-react'
import { generatePosts } from './actions'

const CONTENT_TYPES = [
  { id: 'tip',          label: 'Coaching Tip' },
  { id: 'drill',        label: 'Drill / Session' },
  { id: 'thought',      label: 'Coaching Thought' },
  { id: 'announcement', label: 'App / Feature' },
]

const PLATFORMS = [
  { id: 'x',         label: 'X (Twitter)', icon: '✕', max: 280 },
  { id: 'facebook',  label: 'Facebook',    icon: 'f',  max: 1200 },
  { id: 'instagram', label: 'Instagram',   icon: 'IG', max: 2200 },
  { id: 'linkedin',  label: 'LinkedIn',    icon: 'in', max: 1300 },
]

const IMAGE_STYLES = [
  { id: 'matchday',    label: 'Match Day',    prompt: 'match day rugby league atmosphere, stadium lights, intense crowd, dramatic action' },
  { id: 'training',   label: 'Training',     prompt: 'rugby league training session, coaching on field, players drilling, sports ground' },
  { id: 'tactical',   label: 'Tactical',     prompt: 'rugby league tactical board, coaching strategy, play diagrams, whiteboard analysis' },
  { id: 'motivation', label: 'Motivational', prompt: 'inspirational rugby league moment, team unity, determination, grit, teamwork' },
  { id: 'brand',      label: '18M Brand',    prompt: 'bold high-impact sports graphic design, pure graphic design no photography, pure near-black background color #080808 almost completely black with extremely subtle dark hexagon geometric tile pattern barely visible against the black, vivid bright orange #e8560a paint splash grunge accent elements in top-left and bottom-right corners, only orange #e8560a and white on near-black #080808 color palette, NFL NRL coaching brand aesthetic, grunge-textured bold italic condensed typographic layout, thin bright orange horizontal divider lines, sports tech branding, gritty and direct, maximum contrast between near-black background and bright orange elements, no human figures, no players, no photographs' },
]

const IMAGE_SIZES = [
  { id: 'square',    label: 'Square',    sub: '1024×1024 · Instagram / Facebook' },
  { id: 'portrait',  label: 'Portrait',  sub: '1024×1536 · Instagram Stories'    },
  { id: 'landscape', label: 'Landscape', sub: '1536×1024 · Twitter / LinkedIn'   },
]

function Pill({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        on
          ? 'bg-[#e8560a]/10 border-[#e8560a] text-[#e8560a]'
          : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
        copied
          ? 'border-emerald-700 text-emerald-400 bg-emerald-500/10'
          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
      }`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Social Posts Tab ─────────────────────────────────────────────────────────

function SocialPostsTab() {
  const [contentType, setContentType] = useState('tip')
  const [input, setInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['x', 'facebook', 'instagram'])
  const [posts, setPosts] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  function handleGenerate() {
    setError(null)
    setPosts(null)
    startTransition(async () => {
      const result = await generatePosts(input, contentType, selectedPlatforms)
      if (result.error) setError(result.error)
      else if (result.posts) setPosts(result.posts)
    })
  }

  return (
    <div className="space-y-6">
      {/* Content type */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Content Type</p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(t => (
            <Pill key={t.id} on={contentType === t.id} onClick={() => setContentType(t.id)}>
              {t.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Input */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Your Topic or Content</p>
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your drill, coaching thought, tip, or announcement here. A sentence or a full paragraph — either works."
            rows={5}
            className="w-full bg-zinc-900 border border-zinc-800 border-l-2 border-l-[#e8560a] text-zinc-200 text-sm leading-relaxed px-4 py-3 rounded-r-xl outline-none placeholder:text-zinc-600 resize-y focus:border-[#e8560a] focus:ring-1 focus:ring-[#e8560a]/40 transition-colors"
          />
          <span className="absolute bottom-3 right-3 text-xs text-zinc-600 pointer-events-none">
            {input.length} chars
          </span>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Platforms</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <Pill key={p.id} on={selectedPlatforms.includes(p.id)} onClick={() => togglePlatform(p.id)}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="space-y-3">
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2.5 px-6 py-3 bg-[#e8560a] hover:bg-[#d04e09] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {isPending ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          {isPending ? 'Generating…' : 'Generate Posts'}
          {!isPending && <ChevronRight size={14} className="ml-1 opacity-60" />}
        </button>

        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-900/50 bg-red-950/30 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {posts && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600 uppercase tracking-widest">Your Posts</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {PLATFORMS.filter(p => posts[p.id]).map((p, i) => {
            const text = posts[p.id]
            const over = text.length > p.max
            return (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-[#e8560a]">
                      {p.icon}
                    </div>
                    <span className="text-xs font-medium text-zinc-300 tracking-wide">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${over ? 'text-red-400' : 'text-zinc-600'}`}>
                      {text.length} / {p.max}
                    </span>
                    <CopyButton text={text} />
                  </div>
                </div>
                <div className="px-4 py-4">
                  <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Canvas compositing helpers ───────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function buildComposite(
  base: string,
  overlays: { url: string }[],
  includeLogo: boolean,
): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const baseImg = await loadImg(base)
  canvas.width = baseImg.naturalWidth
  canvas.height = baseImg.naturalHeight
  ctx.drawImage(baseImg, 0, 0)

  // Overlay images — positioned top-right, top-left, bottom-left in order
  const pad = Math.round(canvas.width * 0.025)
  const corners = [
    { x: (w: number) => canvas.width - w - pad, y: () => pad },
    { x: ()         => pad,                      y: () => pad },
    { x: ()         => pad,                      y: (h: number) => canvas.height - h - pad },
  ]
  for (let i = 0; i < Math.min(overlays.length, 3); i++) {
    const img = await loadImg(overlays[i].url)
    const maxW = canvas.width * 0.22
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, corners[i].x(w), corners[i].y(h), w, h)
  }

  // 18thMan logo — bottom-right
  if (includeLogo) {
    const logo = await loadImg('/logo.png')
    const logoH = canvas.height * 0.075
    const logoW = logoH * (logo.naturalWidth / logo.naturalHeight)
    ctx.drawImage(logo, canvas.width - logoW - pad, canvas.height - logoH - pad, logoW, logoH)
  }

  return new Promise(resolve =>
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/png')
  )
}

// ── Image Generator Tab ──────────────────────────────────────────────────────

type Overlay = { id: string; url: string; name: string }

function ImageGeneratorTab() {
  const [subject, setSubject] = useState('')
  const [style, setStyle] = useState('matchday')
  const [size, setSize] = useState('square')

  // Raw DALL-E result
  const [rawUrl, setRawUrl] = useState<string | null>(null)
  // Final composited result shown to user
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null)
  const [compositing, setCompositing] = useState(false)

  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Overlay state
  const [includeLogo, setIncludeLogo] = useState(false)
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedSize = IMAGE_SIZES.find(s => s.id === size)!
  const selectedStyle = IMAGE_STYLES.find(s => s.id === style)!

  // Recomposite whenever base image, logo toggle, or overlays change
  useEffect(() => {
    if (!rawUrl) return
    setCompositing(true)
    buildComposite(rawUrl, overlays, includeLogo)
      .then(url => { setCompositeUrl(url); setCompositing(false) })
      .catch(() => setCompositing(false))
  }, [rawUrl, includeLogo, overlays])

  function handleGenerate() {
    if (!subject.trim()) return
    const isBrand = selectedStyle.id === 'brand'
    const fullPrompt = isBrand
      ? `${selectedStyle.prompt}. The exact text to display on the graphic is: "${subject.trim()}". Render this text precisely as written — do not change, paraphrase, or substitute any words. This is the only text that should appear on the image apart from "18THMAN.APP" at the bottom.`
      : `${subject.trim()}, ${selectedStyle.prompt}, professional rugby league photography, dramatic moody cinematic lighting, dark background, high contrast, editorial sports photography`
    const seed = Math.floor(Math.random() * 99999)
    const params = new URLSearchParams({ prompt: fullPrompt, size })
    setImageError(null)
    setRawUrl(null)
    setCompositeUrl(null)
    setImageLoading(true)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/generate-image?${params}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setImageError(data.error ?? `Failed (${res.status})`)
          return
        }
        const blob = await res.blob()
        setRawUrl(URL.createObjectURL(blob))
      } catch (err) {
        setImageError(err instanceof Error ? err.message : 'Generation failed')
      } finally {
        setImageLoading(false)
      }
    })
  }

  function handleOverlayUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newOverlays: Overlay[] = files.map(f => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      name: f.name,
    }))
    setOverlays(prev => [...prev, ...newOverlays].slice(0, 3))
    e.target.value = ''
  }

  function removeOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Subject */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Subject / Scene</p>
        <textarea
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="e.g. U14s tackle practice, coach on the sideline, team huddle before a game…"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 border-l-2 border-l-[#e8560a] text-zinc-200 text-sm leading-relaxed px-4 py-3 rounded-r-xl outline-none placeholder:text-zinc-600 resize-none focus:border-[#e8560a] focus:ring-1 focus:ring-[#e8560a]/40 transition-colors"
        />
      </div>

      {/* Style */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Style</p>
        <div className="flex flex-wrap gap-2">
          {IMAGE_STYLES.map(s => (
            <Pill key={s.id} on={style === s.id} onClick={() => setStyle(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2.5">Size</p>
        <div className="grid grid-cols-3 gap-2">
          {IMAGE_SIZES.map(s => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              aria-pressed={size === s.id}
              className={`px-3 py-2.5 text-left rounded-xl border transition-colors ${
                size === s.id
                  ? 'border-[#e8560a] bg-[#e8560a]/10'
                  : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
              }`}
            >
              <p className={`text-xs font-semibold ${size === s.id ? 'text-[#e8560a]' : 'text-zinc-300'}`}>
                {s.label}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Overlays — always visible so user can set before generating */}
      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Overlays</p>

        {/* Logo toggle */}
        <button
          onClick={() => setIncludeLogo(v => !v)}
          aria-pressed={includeLogo}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors ${
            includeLogo
              ? 'border-[#e8560a] bg-[#e8560a]/10'
              : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="18thMan logo" className="w-7 h-7 object-contain" />
          <div className="flex-1">
            <p className={`text-xs font-semibold ${includeLogo ? 'text-[#e8560a]' : 'text-zinc-300'}`}>
              18thMan Logo
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Bottom-right corner</p>
          </div>
          <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${includeLogo ? 'bg-[#e8560a]' : 'bg-zinc-700'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${includeLogo ? 'translate-x-4' : ''}`} />
          </div>
        </button>

        {/* Overlay images */}
        <div className="space-y-2">
          {overlays.map(o => (
            <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.url} alt={o.name} className="w-10 h-10 object-contain rounded" />
              <p className="flex-1 text-xs text-zinc-400 truncate">{o.name}</p>
              <button onClick={() => removeOverlay(o.id)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}

          {overlays.length < 3 && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleOverlayUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 text-xs transition-colors"
              >
                <ImagePlus size={14} />
                Add overlay image {overlays.length > 0 ? `(${3 - overlays.length} remaining)` : '— club badge, sponsor logo…'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!subject.trim() || isPending}
        className="flex items-center gap-2.5 px-6 py-3 bg-[#e8560a] hover:bg-[#d04e09] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {isPending ? <RefreshCw size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        {isPending ? 'Generating image…' : 'Generate Image'}
        {!isPending && <ChevronRight size={14} className="ml-1 opacity-60" />}
      </button>

      {/* Loading */}
      {imageLoading && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-500">
          <RefreshCw size={26} className="animate-spin mb-3" />
          <p className="text-sm">Generating — this takes 15–30 seconds…</p>
        </div>
      )}

      {/* Error */}
      {imageError && (
        <div className="px-4 py-3 rounded-xl border border-red-900/50 bg-red-950/30 text-red-400 text-sm">
          {imageError}
        </div>
      )}

      {/* Result */}
      {compositeUrl && !imageLoading && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600 uppercase tracking-widest">Generated Image</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40 relative">
            {compositing && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 z-10">
                <RefreshCw size={20} className="animate-spin text-zinc-400" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={compositeUrl} alt="Generated" className="w-full object-cover block" />
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-600">{selectedSize.sub} · DALL-E 3</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={11} /> Regenerate
                </button>
                <a
                  href={compositeUrl}
                  download="18thman-image.png"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#e8560a]/10 border border-[#e8560a]/50 text-[#e8560a] hover:bg-[#e8560a]/20 rounded-lg transition-colors"
                >
                  <Download size={11} /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Root Component ───────────────────────────────────────────────────────────

export function ContentEngineClient() {
  const [tab, setTab] = useState<'posts' | 'images'>('posts')

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {([
          { id: 'posts',  label: 'Social Posts', icon: Sparkles },
          { id: 'images', label: 'Image Generator', icon: ImageIcon },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-[#e8560a] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts'  && <SocialPostsTab />}
      {tab === 'images' && <ImageGeneratorTab />}
    </div>
  )
}
