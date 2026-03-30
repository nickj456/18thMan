'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import type Konva from 'konva'
import { DrillCanvas } from './DrillCanvas'
import { type CanvasState, type ToolType } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DrillCategory } from '@/lib/supabase/types'
import { saveDrillDesign, updateDrillDesign } from '@/app/(app)/drills/designer-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Monitor } from 'lucide-react'

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
}

interface DrillDesignerProps {
  categories: DrillCategory[]
  initialDrill?: InitialDrill
}

export function DrillDesigner({ categories, initialDrill }: DrillDesignerProps) {
  const router = useRouter()
  const stageRef = useRef<Konva.Stage | null>(null)
  const isEditing = !!initialDrill
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

  const [isPending, startTransition] = useTransition()

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

  function handleSave() {
    if (!title.trim()) { toast.error('Please enter a drill title'); return }
    if (!isMobile && canvasState.elements.length === 0) { toast.error('Add at least one element to the canvas'); return }

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
      }
      const result = isEditing
        ? await updateDrillDesign({ ...base, drillId: initialDrill.id, existingPreviewUrl: initialDrill.preview_image_url, existingCanvasPreviewUrl: initialDrill.canvas_preview_url, existingYoutubeUrl: initialDrill.youtube_url, existingTiktokUrl: initialDrill.tiktok_url, existingFacebookUrl: initialDrill.facebook_url })
        : await saveDrillDesign(base)
      if (result.error) { toast.error(result.error) }
      else { toast.success(isEditing ? 'Drill updated!' : 'Drill saved!'); router.push(`/drills/${result.drillId}`) }
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
    <div className="flex h-full overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden">
        <DrillCanvas
          state={canvasState}
          selectedId={selectedId}
          activeTool={activeTool}
          onStateChange={pushState}
          onSelectId={setSelectedId}
          onToolChange={setActiveTool}
          onUndo={handleUndo}
          onClear={handleClear}
          canUndo={historyIndex > 0}
          stageRef={stageRef}
        />
      </div>

      <aside className="w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold text-sm text-white">Drill Details</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Fill in before saving</p>
        </div>
        {formFields}
        {saveButton}
      </aside>
    </div>
  )
}
