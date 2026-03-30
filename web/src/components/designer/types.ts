export type PitchBackground = 'full' | 'half' | 'blank' | 'ingoal'

export type ToolType =
  | 'select'
  | 'attacker'
  | 'defender'
  | 'cone'
  | 'ball'
  | 'arrow'
  | 'line'
  | 'dotted'
  | 'zone'
  | 'text'

export interface CanvasElement {
  id: string
  type: ToolType
  x: number
  y: number
  label?: string
  color?: string
  // Lines / Arrows — absolute canvas coords for start and end
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  // Zones — dimensions (x,y = top-left corner)
  width?: number
  height?: number
  rotation?: number
}

export interface CanvasState {
  background: PitchBackground
  elements: CanvasElement[]
}

export const CANVAS_WIDTH = 900
export const CANVAS_HEIGHT = 600

/** Tools that use drag-to-draw (click start → drag → release end) */
export const DRAW_TOOLS: ToolType[] = ['arrow', 'line', 'dotted']
