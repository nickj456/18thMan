'use client'

import { useState, useTransition } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { GripVertical, X, ChevronDown, ChevronUp, Clock, Plus, Search, Globe, Lock, Users2, Calendar, Puzzle, Copy } from 'lucide-react'
import { createSession, updateSession } from '@/app/(app)/sessions/actions'
import type { Drill, DrillCategory, SessionPlan, SessionDrillItem } from '@/lib/supabase/types'

interface SessionItem {
  drill_id?: string
  custom_title?: string
  custom_type?: string
  duration_minutes: number
  notes?: string
  drill?: Drill  // present for drill items, absent for custom blocks
  _key: string
}

const CUSTOM_TYPES = ['Team Talk', 'Game Plan', 'Warm Up', 'Video Review', 'Conditioning', 'Positional', 'Break', 'Other']

function customBlockColor(type?: string): string {
  const map: Record<string, string> = {
    'Team Talk': 'bg-indigo-500/20 text-indigo-300',
    'Game Plan': 'bg-amber-500/20 text-amber-300',
    'Warm Up': 'bg-emerald-500/20 text-emerald-300',
    'Video Review': 'bg-violet-500/20 text-violet-300',
    'Conditioning': 'bg-red-500/20 text-red-300',
    'Positional': 'bg-sky-500/20 text-sky-300',
    'Break': 'bg-zinc-700 text-zinc-400',
    'Other': 'bg-zinc-700 text-zinc-400',
  }
  return map[type ?? ''] ?? 'bg-zinc-700 text-zinc-400'
}

function customBlockInitials(type?: string): string {
  if (!type) return '•'
  return type.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

interface GroupOption {
  id: string
  name: string
}

interface SessionBuilderProps {
  allDrills: Drill[]
  categories: DrillCategory[]
  initialSession?: SessionPlan & { resolvedDrills: Drill[] }
  groups?: GroupOption[]
  initialGroupId?: string
}

export function SessionBuilder({ allDrills, categories, initialSession, groups, initialGroupId }: SessionBuilderProps) {
  const isEdit = !!initialSession

  const [title, setTitle] = useState(initialSession?.title ?? '')
  const [isShared, setIsShared] = useState(initialSession?.is_shared ?? false)
  const [selectedGroupId, setSelectedGroupId] = useState(initialSession?.group_id ?? initialGroupId ?? '')
  const [scheduledAt, setScheduledAt] = useState(
    initialSession?.scheduled_at
      ? new Date(initialSession.scheduled_at).toISOString().slice(0, 16)
      : ''
  )
  const [items, setItems] = useState<SessionItem[]>(() => {
    if (!initialSession) return []
    return (initialSession.drills_order as SessionDrillItem[]).flatMap((item, i) => {
      if (item.drill_id) {
        const drill = initialSession.resolvedDrills.find(d => d.id === item.drill_id)
        if (!drill) return []
        return [{ ...item, drill, _key: `${item.drill_id}-${i}` }]
      }
      // Custom block — no drill lookup needed
      return [{ ...item, _key: `custom-${i}-${Date.now()}` }]
    })
  })
  const [customTitle, setCustomTitle] = useState('')
  const [customType, setCustomType] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [drillSearch, setDrillSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIndex = prev.findIndex(i => i._key === active.id)
      const newIndex = prev.findIndex(i => i._key === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function addDrill(drill: Drill) {
    const key = `${drill.id}-${Date.now()}`
    setItems(prev => [...prev, { drill_id: drill.id, duration_minutes: 10, notes: '', drill, _key: key }])
  }

  function duplicateItem(key: string) {
    setItems(prev => {
      const idx = prev.findIndex(i => i._key === key)
      if (idx === -1) return prev
      const original = prev[idx]
      const copy = { ...original, _key: `${original._key}-copy-${Date.now()}` }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function addCustomBlock() {
    if (!customTitle.trim()) return
    const key = `custom-${Date.now()}`
    setItems(prev => [...prev, {
      custom_title: customTitle.trim(),
      custom_type: customType || undefined,
      duration_minutes: 10,
      notes: '',
      _key: key,
    }])
    setCustomTitle('')
    setCustomType('')
  }

  function removeDrill(key: string) {
    setItems(prev => prev.filter(i => i._key !== key))
  }

  function updateDuration(key: string, value: number) {
    setItems(prev => prev.map(i => i._key === key ? { ...i, duration_minutes: value } : i))
  }

  function updateNotes(key: string, value: string) {
    setItems(prev => prev.map(i => i._key === key ? { ...i, notes: value } : i))
  }

  function toggleNotes(key: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const totalMinutes = items.reduce((sum, i) => sum + (i.duration_minutes || 0), 0)
  const addedDrillIds = new Set(items.filter(i => i.drill_id).map(i => i.drill_id!))
  const filteredDrills = allDrills.filter(d => {
    if (addedDrillIds.has(d.id)) return false
    if (drillSearch && !d.title.toLowerCase().includes(drillSearch.toLowerCase())) return false
    if (categoryFilter && d.category_id !== categoryFilter) return false
    return true
  })

  // Only show categories that have drills not yet added
  const availableCategories = categories.filter(c =>
    allDrills.some(d => d.category_id === c.id && !addedDrillIds.has(d.id))
  )

  function handleSave() {
    if (!title.trim()) return
    const drillsOrder: SessionDrillItem[] = items.map(({ drill_id, custom_title, custom_type, duration_minutes, notes }) => {
      const item: SessionDrillItem = { duration_minutes, notes }
      if (drill_id) item.drill_id = drill_id
      if (custom_title) item.custom_title = custom_title
      if (custom_type) item.custom_type = custom_type
      return item
    })
    startTransition(async () => {
      if (isEdit) {
        await updateSession(initialSession.id, title.trim(), drillsOrder, isShared)
      } else {
        await createSession(
          title.trim(),
          drillsOrder,
          isShared,
          selectedGroupId || undefined,
          scheduledAt || undefined,
        )
      }
    })
  }

  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const durationLabel = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`

  return (
    <div className="space-y-6">
      {/* Group + schedule (new sessions only) */}
      {!isEdit && groups && groups.length > 0 && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Users2 size={12} /> Group <span className="text-zinc-600">(optional)</span>
            </Label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Personal session</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          {selectedGroupId && (
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar size={12} /> Schedule <span className="text-zinc-600">(optional)</span>
              </Label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Title + share */}
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="session-title">Session title</Label>
          <Input
            id="session-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Pre-season conditioning session"
            className="text-base"
          />
        </div>
        <div className="flex items-center gap-2.5 pb-0.5 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900">
          {isShared
            ? <Globe size={14} className="text-indigo-400" />
            : <Lock size={14} className="text-zinc-500" />
          }
          <span className="text-sm text-muted-foreground">
            {isShared ? 'Shared with coaches' : 'Private'}
          </span>
          <Switch id="share-toggle" checked={isShared} onCheckedChange={setIsShared} />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* Left — session drill list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Training plan ({items.length})
            </h2>
            {totalMinutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} />
                {durationLabel} total
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-zinc-700 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-medium">Nothing added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add drills or custom blocks from the right panel</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i._key)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <SortableDrillRow
                      key={item._key}
                      item={item}
                      index={index}
                      notesExpanded={expandedNotes.has(item._key)}
                      onRemove={() => removeDrill(item._key)}
                      onDuplicate={() => duplicateItem(item._key)}
                      onDurationChange={v => updateDuration(item._key, v)}
                      onNotesChange={v => updateNotes(item._key, v)}
                      onToggleNotes={() => toggleNotes(item._key)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right — drill picker */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add drills
          </h2>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drills…"
              value={drillSearch}
              onChange={e => setDrillSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Category filter pills */}
          {availableCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === null
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                All
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Drill list */}
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {filteredDrills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {drillSearch || categoryFilter ? 'No drills match your filters' : 'All drills have been added'}
              </p>
            ) : (
              filteredDrills.map(drill => {
                const cat = categories.find(c => c.id === drill.category_id)
                return (
                  <button
                    key={drill.id}
                    onClick={() => addDrill(drill)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors text-left group"
                  >
                    <div className="relative w-14 h-9 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                      {(drill.canvas_preview_url || drill.preview_image_url) && (
                        <Image
                          src={drill.canvas_preview_url ?? drill.preview_image_url!}
                          alt={drill.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-medium leading-snug line-clamp-1">{drill.title}</p>
                      {cat && <p className="text-[10px] text-zinc-500">{cat.name}</p>}
                    </div>
                    <Plus size={13} className="text-zinc-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                  </button>
                )
              })
            )}
          </div>
          {/* Custom block form */}
          <div className="pt-3 mt-1 border-t border-zinc-800 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Puzzle size={11} /> Custom block
            </h2>
            <Input
              placeholder="e.g. Game Plan Walkthrough, Team Talk…"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customTitle.trim()) addCustomBlock() }}
              className="text-sm"
            />
            <select
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Type (optional)</option>
              {CUSTOM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!customTitle.trim()}
              onClick={addCustomBlock}
            >
              <Plus size={13} className="mr-1.5" />
              Add to session
            </Button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <Button onClick={handleSave} disabled={isPending || !title.trim()}>
          {isPending ? 'Saving…' : isEdit ? 'Update session' : 'Create session'}
        </Button>
      </div>
    </div>
  )
}

// ─── Sortable drill row ──────────────────────────────────────────────────────

interface SortableDrillRowProps {
  item: SessionItem
  index: number
  notesExpanded: boolean
  onRemove: () => void
  onDuplicate: () => void
  onDurationChange: (v: number) => void
  onNotesChange: (v: string) => void
  onToggleNotes: () => void
}

// ─── Per-item helpers ────────────────────────────────────────────────────────

function SortableDrillRow({
  item, index, notesExpanded,
  onRemove, onDuplicate, onDurationChange, onNotesChange, onToggleNotes,
}: SortableDrillRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._key,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          {...attributes}
          {...listeners}
          className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          tabIndex={-1}
        >
          <GripVertical size={15} />
        </button>

        <span className="text-xs text-zinc-600 font-mono w-4 flex-shrink-0 select-none">{index + 1}</span>

        {item.drill ? (
          <div className="relative w-14 h-9 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
            {(item.drill.canvas_preview_url || item.drill.preview_image_url) && (
              <Image
                src={item.drill.canvas_preview_url ?? item.drill.preview_image_url!}
                alt={item.drill.title}
                fill
                className="object-cover"
              />
            )}
          </div>
        ) : (
          <div className={`w-14 h-9 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold ${customBlockColor(item.custom_type)}`}>
            {customBlockInitials(item.custom_type)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">{item.drill ? item.drill.title : item.custom_title}</p>
          {!item.drill && item.custom_type && (
            <p className="text-[10px] text-zinc-500 mt-0.5">{item.custom_type}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Input
            type="number"
            min={1}
            max={120}
            value={item.duration_minutes}
            onChange={e => onDurationChange(parseInt(e.target.value) || 1)}
            className="w-14 h-7 text-xs text-center px-1"
          />
          <span className="text-xs text-zinc-500 select-none">min</span>
        </div>

        <button
          onClick={onToggleNotes}
          className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          title="Toggle notes"
        >
          {notesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          onClick={onDuplicate}
          className="text-zinc-600 hover:text-indigo-400 transition-colors flex-shrink-0"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>

        <button
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {notesExpanded && (
        <div className="px-3 pb-3 pt-0">
          <Textarea
            placeholder="Notes for this drill segment…"
            value={item.notes ?? ''}
            onChange={e => onNotesChange(e.target.value)}
            className="text-xs h-20 resize-none"
          />
        </div>
      )}
    </div>
  )
}
