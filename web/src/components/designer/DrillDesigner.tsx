'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import type Konva from 'konva'
import { DrillCanvas } from './DrillCanvas'
import { Timeline, FPS } from './Timeline'
import { AnimationPreview } from './AnimationPreview'
import { type CanvasState, type CanvasElement, type ToolType, type Keyframe } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DrillCategory, DrillVisibility } from '@/lib/supabase/types'
import { saveDrillDesign, updateDrillDesign } from '@/app/(discover)/drills/designer-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Monitor, Timer, Video, ImageDown, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UpgradePrompt, useUpgradePrompt } from '@/components/ui/UpgradePrompt'

const AGE_GROUPS = [
  'Mini (U6–U8)',
  'Juniors (U9–U12)',
  'Youth (U13–U16)',
  'Colts (U17–U20)',
  'Open Age',
  'Masters (35+)',
  'All Ages',
]

const PLAYER_COUNTS = [
  '2–4', '4–6', '6–8', '8–10', '10–12',
  '12–15', '15–18', '18–20', '20+', 'Full Squad',
]

const INITIAL_STATE: CanvasState = { background: 'full', elements: [] }
const MAX_HISTORY = 50

interface InitialDrill {
  id: string
  title: string
  description: string | null
  category_id: string | null
  difficulty: string | null
  age_group: string | null
  player_count: string | null
  canvas_json: CanvasState | null
  youtube_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  preview_image_url: string | null
  canvas_preview_url: string | null
  is_public: boolean
  club_id: string | null
}

interface DrillDesignerProps {
  categories: DrillCategory[]
  initialDrill?: InitialDrill
  userClubId?: string | null
  userClubName?: string | null
}

export function DrillDesigner({ categories, initialDrill, userClubId, userClubName }: DrillDesignerProps) {
  const router = useRouter()
  const stageRef = useRef<Konva.Stage | null>(null)
  const isEditing = !!initialDrill
  const { show: showUpgrade, checkError, dismiss: dismissUpgrade } = useUpgradePrompt()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const startState = initialDrill?.canvas_json ?? INITIAL_STATE
  const [history, setHistory] = useState<CanvasState[]>([startState])
  const [historyIndex, setHistoryIndex] = useState(0)
  const canvasState = history[historyIndex]

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolType>('select')

  const [title, setTitle] = useState(initialDrill?.title ?? '')
  const [description, setDescription] = useState(initialDrill?.description ?? '')
  const [categoryId, setCategoryId] = useState(initialDrill?.category_id ?? '')
  const [difficulty, setDifficulty] = useState(initialDrill?.difficulty ?? '')
  const [ageGroup, setAgeGroup] = useState(initialDrill?.age_group ?? '')
  const [playerCount, setPlayerCount] = useState(initialDrill?.player_count ?? '')

  const [youtubeUrl, setYoutubeUrl] = useState(initialDrill?.youtube_url ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(initialDrill?.tiktok_url ?? '')
  const [facebookUrl, setFacebookUrl] = useState(initialDrill?.facebook_url ?? '')

  const initialVisibility: DrillVisibility = initialDrill
    ? (initialDrill.club_id ? 'club' : initialDrill.is_public ? 'public' : 'private')
    : 'public'
  const [visibility, setVisibility] = useState<DrillVisibility>(initialVisibility)

  const [isPending, startTransition] = useTransition()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Timeline state
  const [showTimeline, setShowTimeline] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number | null>(null)
  const currentFrameRef = useRef(0)

  // Keep ref in sync so RAF callback reads latest value
  useEffect(() => { currentFrameRef.current = currentFrame }, [currentFrame])

  // ── Playback loop ────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTickRef.current = null
      return
    }
    const duration = canvasState.duration ?? 90
    function tick(ts: number) {
      if (lastTickRef.current === null) lastTickRef.current = ts
      const elapsed = ts - lastTickRef.current
      const framesElapsed = (elapsed / 1000) * FPS
      if (framesElapsed >= 1) {
        lastTickRef.current = ts
        setCurrentFrame(prev => {
          const next = prev + Math.floor(framesElapsed)
          if (next >= duration) { setIsPlaying(false); return 0 }
          return next
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, canvasState.duration])

  // ── Interpolation ────────────────────────────────────────────
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

  function getInterpolatedElements(frame: number): CanvasElement[] {
    const keyframes = canvasState.keyframes
    if (!keyframes || keyframes.length === 0) return canvasState.elements
    return canvasState.elements.map(el => {
      const elKfs = keyframes.filter(k => k.elementStates[el.id])
      if (elKfs.length === 0) return el
      // Find surrounding keyframes
      const before = [...elKfs].reverse().find(k => k.time <= frame)
      const after = elKfs.find(k => k.time > frame)
      if (!before && !after) return el
      if (!before) return { ...el, ...after!.elementStates[el.id] }
      if (!after) return { ...el, ...before.elementStates[el.id] }
      const t = (frame - before.time) / (after.time - before.time)
      const bState = before.elementStates[el.id]
      const aState = after.elementStates[el.id]
      const interpolated: Partial<CanvasElement> = {}
      const numKeys = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height'] as const
      type NumKey = typeof numKeys[number]
      for (const key of numKeys) {
        const bv = (bState as Record<NumKey, number | undefined>)[key]
        const av = (aState as Record<NumKey, number | undefined>)[key]
        if (bv !== undefined && av !== undefined) {
          (interpolated as Record<NumKey, number>)[key] = lerp(bv, av, t)
        }
      }
      return { ...el, ...interpolated }
    })
  }

  // During playback show interpolated state; otherwise show editable state
  const displayState: CanvasState = isPlaying
    ? { ...canvasState, elements: getInterpolatedElements(currentFrame) }
    : canvasState

  function handleAddKeyframe() {
    const elementStates: Keyframe['elementStates'] = {}
    for (const el of canvasState.elements) {
      if (el.type === 'arrow' || el.type === 'line' || el.type === 'dotted') {
        elementStates[el.id] = { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 }
      } else if (el.type === 'zone') {
        elementStates[el.id] = { x: el.x, y: el.y, width: el.width, height: el.height }
      } else {
        elementStates[el.id] = { x: el.x, y: el.y }
      }
    }
    const existing = (canvasState.keyframes ?? []).filter(k => k.time !== currentFrame)
    const newKf: Keyframe = { time: currentFrame, elementStates }
    pushState({
      ...canvasState,
      keyframes: [...existing, newKf].sort((a, b) => a.time - b.time),
    })
    toast.success(`Keyframe added at ${(currentFrame / FPS).toFixed(1)}s`)
  }

  function handleDeleteKeyframe(time: number) {
    pushState({
      ...canvasState,
      keyframes: (canvasState.keyframes ?? []).filter(k => k.time !== time),
    })
  }

  function handleDurationChange(frames: number) {
    // Clamp any existing keyframes that exceed the new duration
    const clamped = (canvasState.keyframes ?? []).map(k => ({
      ...k,
      time: Math.min(k.time, frames),
    }))
    // Deduplicate after clamping (two kfs may land on same frame)
    const seen = new Set<number>()
    const deduped = clamped.filter(k => { if (seen.has(k.time)) return false; seen.add(k.time); return true })
    setIsPlaying(false)
    setCurrentFrame(0)
    pushState({ ...canvasState, duration: frames, keyframes: deduped })
  }

  function handleTogglePlay() {
    if ((canvasState.keyframes ?? []).length < 2) {
      toast.error('Add at least 2 keyframes to preview animation')
      return
    }
    setIsPlaying(v => !v)
  }

  const pushState = useCallback((next: CanvasState) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, next].slice(-MAX_HISTORY)
    })
    setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    setHistoryIndex((i) => Math.max(i - 1, 0))
  }, [])

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear all elements from the canvas?')) return
    pushState({ ...canvasState, elements: [] })
    setSelectedId(null)
  }, [canvasState, pushState])

  function handleDownloadPng() {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${title.trim() || 'drill'}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleSave() {
    if (!title.trim()) { toast.error('Please enter a drill title'); return }
    const hasVideo = !!(youtubeUrl.trim() || tiktokUrl.trim() || facebookUrl.trim())
    if (!isMobile && canvasState.elements.length === 0 && !hasVideo) { toast.error('Add at least one element to the canvas, or include a video link'); return }

    startTransition(async () => {
      const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 1 }) ?? null
      const base = {
        title: title.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        difficulty: (difficulty as 'beginner' | 'intermediate' | 'advanced') || null,
        ageGroup: ageGroup || null,
        playerCount: playerCount || null,
        canvasJson: canvasState,
        previewDataUrl: dataUrl,
        youtubeUrl: youtubeUrl.trim() || null,
        tiktokUrl: tiktokUrl.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        visibility,
        clubId: userClubId ?? null,
      }
      const result = isEditing
        ? await updateDrillDesign({ ...base, drillId: initialDrill.id, existingPreviewUrl: initialDrill.preview_image_url, existingCanvasPreviewUrl: initialDrill.canvas_preview_url, existingYoutubeUrl: initialDrill.youtube_url, existingTiktokUrl: initialDrill.tiktok_url, existingFacebookUrl: initialDrill.facebook_url, existingClubId: initialDrill.club_id })
        : await saveDrillDesign(base)
      if (result.error) {
        if (!checkError(result.error)) toast.error(result.error)
      } else {
        toast.success(isEditing ? 'Drill updated!' : 'Drill saved!')
        router.push(`/drills/${result.drillId}`)
      }
    })
  }

  // ── Shared form fields ──────────────────────────────────────
  const formFields = (
    <div className="flex flex-col gap-4 p-4 flex-1">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs">Title <span className="text-red-400">*</span></Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 3v2 Attack Drill" className="h-8 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the drill objective..." className="text-sm resize-none" rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
          <SelectTrigger className="h-8 text-sm">
            <span className={categoryId ? 'text-sm' : 'text-sm text-muted-foreground'}>
              {categoryId ? (categories.find(c => c.id === categoryId)?.name ?? 'Select category') : 'Select category'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Difficulty</Label>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? '')}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Age Group</Label>
        <Select value={ageGroup} onValueChange={(v) => setAgeGroup(v ?? '')}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select age group" />
          </SelectTrigger>
          <SelectContent>
            {AGE_GROUPS.map((ag) => (
              <SelectItem key={ag} value={ag}>{ag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Player Count</Label>
        <Select value={playerCount} onValueChange={(v) => setPlayerCount(v ?? '')}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select player count" />
          </SelectTrigger>
          <SelectContent>
            {PLAYER_COUNTS.map((pc) => (
              <SelectItem key={pc} value={pc}>{pc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Visibility</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as DrillVisibility)}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="public">🌐 Public</SelectItem>
            {userClubId && (
              <SelectItem value="club">🔒 {userClubName ?? 'My Club'} only</SelectItem>
            )}
            <SelectItem value="private">👁 Only me</SelectItem>
          </SelectContent>
        </Select>
        {visibility === 'club' && (
          <p className="text-[11px] text-zinc-500">Only members of your club can see this drill</p>
        )}
      </div>

      <div className="space-y-3 pt-1 border-t border-zinc-800">
        <p className="text-xs font-medium text-zinc-400">Video Links</p>

        <div className="space-y-1.5">
          <Label htmlFor="youtube" className="text-xs flex items-center gap-1.5">
            YouTube
            <span className="text-[10px] text-indigo-400 font-normal">Primary — AI guide</span>
          </Label>
          <Input
            id="youtube"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="h-8 text-sm"
          />
          {youtubeUrl.trim() && (
            <p className="text-[11px] text-zinc-500">AI coaching guide generated on save</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tiktok" className="text-xs">TikTok</Label>
          <Input
            id="tiktok"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@user/video/..."
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="facebook" className="text-xs">Facebook</Label>
          <Input
            id="facebook"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/..."
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )

  const saveButton = (
    <div className="p-4 border-t border-zinc-800">
      <Button onClick={handleSave} disabled={isPending} className="w-full gap-2">
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {isPending ? (youtubeUrl.trim() ? 'Generating guide…' : 'Saving…') : isEditing ? 'Update Drill' : 'Save Drill'}
      </Button>
      {!isMobile && (
        <p className="text-[11px] text-zinc-600 text-center mt-2">
          {canvasState.elements.length} element{canvasState.elements.length !== 1 ? 's' : ''} on canvas
        </p>
      )}
    </div>
  )

  // ── Mobile layout ────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-zinc-950">
        {/* Canvas unavailable notice */}
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
          <Monitor size={18} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-200">Canvas designer requires a larger screen</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              You can save the drill details and video links now — open on a desktop or tablet to add the pitch diagram.
            </p>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div className="px-4 pt-4 pb-1">
            <h2 className="font-semibold text-sm text-white">Drill Details</h2>
          </div>
          {formFields}
          {saveButton}
        </div>
      </div>
    )
  }

  // ── Desktop layout ───────────────────────────────────────────
  return (
    <>
    {showUpgrade && (
      <UpgradePrompt
        modal
        feature="Unlimited drills"
        description="You've created 20 drills — the free limit. Upgrade your club subscription to create unlimited drills."
        onDismiss={dismissUpgrade}
      />
    )}
    <div className={cn("flex h-full overflow-hidden", isFullscreen && "fixed inset-0 z-50 bg-zinc-950")}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          <DrillCanvas
            state={displayState}
            selectedId={isPlaying ? null : selectedId}
            activeTool={isPlaying ? 'select' : activeTool}
            onStateChange={isPlaying ? () => {} : pushState}
            onSelectId={isPlaying ? () => {} : setSelectedId}
            onToolChange={isPlaying ? () => {} : setActiveTool}
            onUndo={handleUndo}
            onClear={handleClear}
            canUndo={historyIndex > 0}
            stageRef={stageRef}
          />
          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] text-amber-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Playing · {(currentFrame / FPS).toFixed(1)}s
              </div>
            </div>
          )}
        </div>

        {/* Timeline toggle bar */}
        <div className="flex items-center justify-between px-3 h-8 bg-zinc-900 border-t border-zinc-800 shrink-0">
          <span className="text-[11px] text-zinc-600">
            {(canvasState.keyframes ?? []).length > 0
              ? `${(canvasState.keyframes ?? []).length} keyframe${(canvasState.keyframes ?? []).length !== 1 ? 's' : ''}`
              : 'No keyframes'}
          </span>
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors border border-indigo-500 disabled:opacity-50"
                title="Save drill"
              >
                {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </button>
            )}
            <button
              onClick={handleDownloadPng}
              disabled={canvasState.elements.length === 0}
              className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-30"
              title="Download canvas as PNG"
            >
              <ImageDown size={11} />
              PNG
            </button>
            {(canvasState.keyframes ?? []).length >= 2 && (
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 transition-colors border border-amber-500/20"
              >
                <Video size={11} />
                Preview & Export
              </button>
            )}
            <button
              onClick={() => setShowTimeline(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded transition-colors border ${
                showTimeline
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/25'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Timer size={11} />
              {showTimeline ? 'Hide Timeline' : 'Animate'}
            </button>
            <button
              onClick={() => setIsFullscreen(v => !v)}
              className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded transition-colors border bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* Timeline panel */}
        {showTimeline && (
          <Timeline
            state={canvasState}
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            onFrameChange={setCurrentFrame}
            onAddKeyframe={handleAddKeyframe}
            onDeleteKeyframe={handleDeleteKeyframe}
            onTogglePlay={handleTogglePlay}
            onDurationChange={handleDurationChange}
          />
        )}
      </div>

      {!isFullscreen && <aside className="w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <h2 className="font-semibold text-sm text-white">Drill Details</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Fill in before saving</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {formFields}
        </div>
        {saveButton}
      </aside>}

      {showPreview && (
        <AnimationPreview
          canvasJson={canvasState}
          drillTitle={title || undefined}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
    </>
  )
}
