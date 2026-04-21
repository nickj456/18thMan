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
  size?: 'sm' | 'md' | 'lg'
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

export interface Keyframe {
  time: number  // frame number at 30fps (e.g. 30 = 1 second)
  elementStates: Record<string, Partial<CanvasElement>>  // elementId → animatable props
}

export interface CanvasState {
  background: PitchBackground
  pitchFlipped?: boolean
  elements: CanvasElement[]
  keyframes?: Keyframe[]
  duration?: number  // total frames, default 90 (3s at 30fps)
}

export const CANVAS_WIDTH = 900
export const CANVAS_HEIGHT = 600

/** Tools that use drag-to-draw (click start → drag → release end) */
export const DRAW_TOOLS: ToolType[] = ['arrow', 'line', 'dotted']
