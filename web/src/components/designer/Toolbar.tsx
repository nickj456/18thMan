'use client'

import { Eraser, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PitchBackground, ToolType } from './types'
import { PITCH_OPTIONS, PitchGlyph, TOOL_GROUPS, TOOL_META, TOOL_SHORTCUTS, ToolGlyph } from './tools'

type PlayerSize = 'sm' | 'md' | 'lg'

const SIZES: { id: PlayerSize; label: string; name: string }[] = [
  { id: 'sm', label: 'S', name: 'Small players' },
  { id: 'md', label: 'M', name: 'Medium players' },
  { id: 'lg', label: 'L', name: 'Large players' },
]

interface ToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  background: PitchBackground
  onBackgroundChange: (bg: PitchBackground) => void
  pitchFlipped: boolean
  onFlipPitch: () => void
  playerSize: PlayerSize
  onPlayerSizeChange: (size: PlayerSize) => void
  hasSelection: boolean
  onDelete: () => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  hasElements: boolean
}

// One look for every rail control: flat at rest, muted surface on hover, and an
// ember ring plus tint when active so the piece colours stay legible on top.
const railButton =
  'flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ' +
  'disabled:pointer-events-none disabled:opacity-30'
const railActive = 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary'

function Kbd({ children }: { children: string }) {
  const text = children.length === 1 ? children.toUpperCase() : children
  return (
    <kbd
      data-slot="kbd"
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-background/15 px-1 font-mono text-[10px] font-medium"
    >
      {text}
    </kbd>
  )
}

interface RailButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  shortcut?: string
  /** Pass a boolean for toggle buttons; leave undefined for plain actions. */
  active?: boolean
  children: React.ReactNode
}

function RailButton({ label, shortcut, active, className, children, ...props }: RailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            className={cn(railButton, active && railActive, className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <h3 className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
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
    <TooltipProvider delay={250}>
      <nav
        aria-label="Drill designer tools"
        className="flex w-[92px] shrink-0 flex-col border-r border-border bg-card px-2 py-2"
      >
        {/* The palette scrolls when the timeline shortens the rail; the edit actions below never do. */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:thin]">
        <RailButton
          label={TOOL_META.select.label}
          shortcut={TOOL_SHORTCUTS.select}
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        >
          <ToolGlyph tool="select" />
        </RailButton>

        {TOOL_GROUPS.map((group) => (
          <section key={group.id} aria-label={group.label} className="flex flex-col gap-1">
            <GroupLabel>{group.label}</GroupLabel>
            <div className="grid grid-cols-2 gap-1">
              {group.tools.map((tool) => (
                <RailButton
                  key={tool}
                  label={TOOL_META[tool].label}
                  shortcut={TOOL_SHORTCUTS[tool]}
                  active={activeTool === tool}
                  onClick={() => onToolChange(tool)}
                >
                  <ToolGlyph tool={tool} />
                </RailButton>
              ))}
            </div>

            {group.id === 'players' && (
              <div
                role="radiogroup"
                aria-label="Player size"
                className="grid grid-cols-3 gap-0.5 rounded-md bg-muted/50 p-0.5"
              >
                {SIZES.map((sz) => (
                  <Tooltip key={sz.id}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          role="radio"
                          aria-checked={playerSize === sz.id}
                          aria-label={sz.name}
                          onClick={() => onPlayerSizeChange(sz.id)}
                          className={cn(
                            'h-6 rounded-[5px] font-mono text-[11px] font-medium text-muted-foreground transition-colors',
                            'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                            playerSize === sz.id && 'bg-background text-foreground ring-1 ring-inset ring-border',
                          )}
                        />
                      }
                    >
                      {sz.label}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>{sz.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </section>
        ))}

        <section aria-label="Pitch" className="flex flex-col gap-1">
          <GroupLabel>Pitch</GroupLabel>
          <div className="grid grid-cols-2 gap-1">
            {PITCH_OPTIONS.map((opt) => (
              <RailButton
                key={opt.id}
                label={opt.label}
                active={background === opt.id}
                onClick={() => onBackgroundChange(opt.id)}
              >
                <PitchGlyph pitch={opt.id} />
              </RailButton>
            ))}
          </div>
          <RailButton
            label={pitchFlipped ? 'Vertical pitch (click for horizontal)' : 'Rotate pitch to vertical'}
            active={pitchFlipped}
            onClick={onFlipPitch}
            className="h-7"
          >
            <RotateCw size={16} aria-hidden />
          </RailButton>
        </section>
        </div>

        <div className="mt-2 flex shrink-0 flex-col gap-1 border-t border-border pt-2">
          <div className="grid grid-cols-2 gap-1">
            <RailButton label="Undo" shortcut="Ctrl+Z" onClick={onUndo} disabled={!canUndo}>
              <Undo2 size={17} aria-hidden />
            </RailButton>
            <RailButton
              label="Delete selected"
              shortcut="Del"
              onClick={onDelete}
              disabled={!hasSelection}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={17} aria-hidden />
            </RailButton>
          </div>
          <RailButton label="Clear canvas" onClick={onClear} disabled={!hasElements} className="h-7">
            <Eraser size={16} aria-hidden />
          </RailButton>
        </div>
      </nav>
    </TooltipProvider>
  )
}
