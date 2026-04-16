'use client'

import { Pencil, MoveRight, Circle, Eraser, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANNOTATION_COLORS, type AnnotationTool } from './types'

interface Props {
  activeTool: AnnotationTool | null
  activeColor: string
  onToolChange: (tool: AnnotationTool | null) => void
  onColorChange: (color: string) => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
}

const TOOLS: { id: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { id: 'pencil', icon: <Pencil className="h-4 w-4" />, label: 'Pencil' },
  { id: 'arrow',  icon: <MoveRight className="h-4 w-4" />, label: 'Arrow' },
  { id: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
]

export function AnnotationToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
  onUndo,
  onClear,
  canUndo,
}: Props) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-900 py-3">
      {/* Drawing tools */}
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
          className={cn(
            'flex h-10 w-10 flex-col items-center justify-center rounded-lg text-xs transition-colors',
            activeTool === tool.id
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          {tool.icon}
          <span className="mt-0.5 text-[9px] leading-none">{tool.label}</span>
        </button>
      ))}

      <div className="my-1 h-px w-8 bg-zinc-800" />

      {/* Color swatches */}
      {ANNOTATION_COLORS.map((c) => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => onColorChange(c.value)}
          className={cn(
            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
            activeColor === c.value ? 'border-white scale-110' : 'border-transparent'
          )}
          style={{ backgroundColor: c.value }}
        />
      ))}

      <div className="my-1 h-px w-8 bg-zinc-800" />

      {/* Undo */}
      <button
        title="Undo"
        onClick={onUndo}
        disabled={!canUndo}
        className="flex h-10 w-10 flex-col items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 className="h-4 w-4" />
        <span className="mt-0.5 text-[9px] leading-none">Undo</span>
      </button>

      {/* Clear */}
      <button
        title="Clear all"
        onClick={onClear}
        className="flex h-10 w-10 flex-col items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <Eraser className="h-4 w-4" />
        <span className="mt-0.5 text-[9px] leading-none">Clear</span>
      </button>
    </div>
  )
}
