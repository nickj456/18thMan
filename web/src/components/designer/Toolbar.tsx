'use client'

import { memo } from 'react'
import { Eraser, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PitchBackground, PlayerSize, ToolType } from './types'
import { PITCH_OPTIONS, PitchGlyph, TOOL_GROUPS, TOOL_META, TOOL_SHORTCUTS, ToolGlyph } from './tools'

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
// On touch devices (no hover, so no tooltips) the tiles grow to fit a short name.
const railButton =
  'flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
  'pointer-coarse:h-11 pointer-coarse:flex-col pointer-coarse:gap-0.5 ' +
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
  /** Short name shown under the glyph on touch devices only. */
  short?: string
  /** Second tooltip line: what the tool does on the pitch. */
  description?: string
  shortcut?: string
  /** Pass a boolean for toggle buttons; leave undefined for plain actions. */
  active?: boolean
  children: React.ReactNode
}

function RailButton({ label, short, description, shortcut, active, className, children, ...props }: RailButtonProps) {
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
        {short && (
          <span aria-hidden className="hidden text-[10px] leading-none pointer-coarse:block">
            {short}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className={description ? 'flex-col items-start gap-0.5' : undefined}>
        <span className="flex items-center">
          {label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </span>
        {description && <span className="opacity-70">{description}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div aria-hidden className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

// Memoised: the designer re-renders every animation frame during playback and on
// every pointer move while drawing, and none of those renders change the rail.
export const Toolbar = memo(function Toolbar({
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
        className="flex w-[92px] shrink-0 flex-col border-r border-border bg-card px-2 py-2 pointer-coarse:w-[108px]"
      >
        {/* The palette scrolls when the timeline shortens the rail; the edit actions below never do. */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:thin]">
        <RailButton
          label={TOOL_META.select.label}
          short={TOOL_META.select.short}
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
                  short={TOOL_META[tool].short}
                  description={TOOL_META[tool].description}
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
                onKeyDown={(e) => {
                  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
                  if (!step) return
                  e.preventDefault()
                  const i = SIZES.findIndex((sz) => sz.id === playerSize)
                  const next = SIZES[(i + step + SIZES.length) % SIZES.length]
                  onPlayerSizeChange(next.id)
                  e.currentTarget.querySelector<HTMLButtonElement>(`[data-size="${next.id}"]`)?.focus()
                }}
              >
                {SIZES.map((sz) => (
                  <Tooltip key={sz.id}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          role="radio"
                          aria-checked={playerSize === sz.id}
                          tabIndex={playerSize === sz.id ? 0 : -1}
                          data-size={sz.id}
                          aria-label={sz.name}
                          onClick={() => onPlayerSizeChange(sz.id)}
                          className={cn(
                            'h-7 rounded-[5px] font-mono text-xs font-medium text-muted-foreground transition-colors',
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
                short={opt.short}
                active={background === opt.id}
                onClick={() => onBackgroundChange(opt.id)}
              >
                <PitchGlyph pitch={opt.id} />
              </RailButton>
            ))}
          </div>
          <RailButton
            label={pitchFlipped ? 'Vertical pitch (click for horizontal)' : 'Rotate pitch to vertical'}
            short="Rotate"
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
            <RailButton label="Undo" short="Undo" shortcut="Ctrl+Z" onClick={onUndo} disabled={!canUndo}>
              <Undo2 size={17} aria-hidden />
            </RailButton>
            <RailButton
              label="Delete selected"
              short="Delete"
              shortcut="Del"
              onClick={onDelete}
              disabled={!hasSelection}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={17} aria-hidden />
            </RailButton>
          </div>
          <RailButton label="Clear canvas" short="Clear" onClick={onClear} disabled={!hasElements} className="h-7">
            <Eraser size={16} aria-hidden />
          </RailButton>
        </div>
      </nav>
    </TooltipProvider>
  )
})
