'use client'

import { cn } from '@/lib/utils'
import type { ToolType, PitchBackground } from './types'
import {
  MousePointer2,
  Circle,
  Shield,
  Triangle,
  MoveRight,
  Minus,
  MoreHorizontal,
  Square,
  Type,
  Trash2,
  Undo2,
  Eraser,
  RotateCw,
  TrendingUp,
  RectangleVertical,
  RectangleHorizontal,
  Flag,
  Dot,
  AlignJustify,
} from 'lucide-react'

const TOOLS: { id: ToolType; label: string; icon: React.ReactNode; color?: string }[] = [
  { id: 'select',        label: 'Select',  icon: <MousePointer2 size={15} /> },
  { id: 'attacker',      label: 'Attack',  icon: <Circle size={15} />,              color: 'text-red-400' },
  { id: 'defender',      label: 'Defend',  icon: <Shield size={15} />,              color: 'text-blue-400' },
  { id: 'cone',          label: 'Cone',    icon: <Triangle size={15} />,            color: 'text-amber-400' },
  { id: 'ball',          label: 'Ball',    icon: <Circle size={12} />,              color: 'text-orange-400' },
  { id: 'tackle-bag',    label: 'T.Bag',   icon: <RectangleVertical size={15} />,   color: 'text-red-300' },
  { id: 'tackle-shield', label: 'Shield',  icon: <RectangleHorizontal size={15} />, color: 'text-blue-300' },
  { id: 'flag',          label: 'Flag',    icon: <Flag size={15} />,                color: 'text-green-400' },
  { id: 'disc',          label: 'Disc',    icon: <Dot size={15} />,                 color: 'text-amber-300' },
  { id: 'agility-ladder',label: 'Ladder',  icon: <AlignJustify size={15} />,        color: 'text-indigo-400' },
  { id: 'arrow',         label: 'Run',     icon: <MoveRight size={15} />,           color: 'text-green-400' },
  { id: 'line',          label: 'Pass',    icon: <Minus size={15} />,               color: 'text-zinc-300' },
  { id: 'dotted',        label: 'Dotted',  icon: <MoreHorizontal size={15} />,      color: 'text-zinc-400' },
  { id: 'kick',          label: 'Kick',    icon: <TrendingUp size={15} />,          color: 'text-amber-400' },
  { id: 'zone',          label: 'Zone',    icon: <Square size={15} />,              color: 'text-red-300' },
  { id: 'text',          label: 'Label',   icon: <Type size={15} /> },
]

const BACKGROUNDS: { id: PitchBackground; label: string }[] = [
  { id: 'full',   label: 'Full' },
  { id: 'half',   label: 'Half' },
  { id: 'blank',  label: 'Grid' },
  { id: 'ingoal', label: 'In-Goal' },
]

const SIZES: { id: 'sm' | 'md' | 'lg'; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
]

interface ToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  background: PitchBackground
  onBackgroundChange: (bg: PitchBackground) => void
  pitchFlipped: boolean
  onFlipPitch: () => void
  playerSize: 'sm' | 'md' | 'lg'
  onPlayerSizeChange: (size: 'sm' | 'md' | 'lg') => void
  hasSelection: boolean
  onDelete: () => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  hasElements: boolean
}

export function Toolbar({
  activeTool, onToolChange,
  background, onBackgroundChange,
  pitchFlipped, onFlipPitch,
  playerSize, onPlayerSizeChange,
  hasSelection, onDelete,
  onUndo, onClear,
  canUndo, hasElements,
}: ToolbarProps) {

  return (
    <div className="flex flex-col gap-3 w-[58px] bg-zinc-900 border-r border-zinc-800 py-3 px-1.5 shrink-0 overflow-y-auto">
      {/* Draw tools */}
      <div className="flex flex-col gap-0.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-md py-1.5 px-1 text-[9px] leading-tight transition-colors w-full',
              tool.color ?? 'text-zinc-400',
              activeTool === tool.id
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-zinc-800'
            )}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Pitch backgrounds + flip */}
      <div className="border-t border-zinc-800 pt-2 flex flex-col gap-0.5">
        <span className="text-[8px] text-zinc-600 text-center mb-0.5 uppercase tracking-wide">Pitch</span>
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            title={bg.label}
            onClick={() => onBackgroundChange(bg.id)}
            className={cn(
              'rounded-md py-1 px-1 text-[9px] leading-tight text-center transition-colors',
              background === bg.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {bg.label}
          </button>
        ))}
        <button
          title="Rotate pitch to vertical"
          onClick={onFlipPitch}
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-md py-1 px-1 text-[9px] leading-tight text-center transition-colors mt-0.5',
            pitchFlipped
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          )}
        >
          <RotateCw size={12} />
          <span>Vertical</span>
        </button>
      </div>

      {/* Player size — always visible, sets default for new placements */}
      <div className="border-t border-zinc-800 pt-2 flex flex-col gap-0.5">
        <span className="text-[8px] text-zinc-600 text-center mb-0.5 uppercase tracking-wide">Players</span>
        {SIZES.map((sz) => (
          <button
            key={sz.id}
            title={`${sz.id === 'sm' ? 'Small' : sz.id === 'md' ? 'Medium' : 'Large'} player icon`}
            onClick={() => onPlayerSizeChange(sz.id)}
            className={cn(
              'rounded-md py-1 px-1 text-[9px] text-center font-medium transition-colors',
              playerSize === sz.id
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {sz.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto border-t border-zinc-800 pt-2 flex flex-col gap-0.5">
        <button
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex flex-col items-center gap-0.5 rounded-md py-1.5 px-1 text-[9px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-25 transition-colors"
        >
          <Undo2 size={14} />
          <span>Undo</span>
        </button>

        <button
          title="Clear canvas"
          onClick={onClear}
          disabled={!hasElements}
          className="flex flex-col items-center gap-0.5 rounded-md py-1.5 px-1 text-[9px] text-zinc-400 hover:bg-zinc-800 hover:text-amber-300 disabled:opacity-25 transition-colors"
        >
          <Eraser size={14} />
          <span>Clear</span>
        </button>

        {hasSelection && (
          <button
            title="Delete selected (Del)"
            onClick={onDelete}
            className="flex flex-col items-center gap-0.5 rounded-md py-1.5 px-1 text-[9px] text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  )
}
