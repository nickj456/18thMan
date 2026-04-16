export type AnnotationTool = 'pencil' | 'arrow' | 'circle' | 'rectangle' | 'line' | 'text' | 'spotlight' | 'cross'

export interface PencilAnnotation {
  id: string
  type: 'pencil'
  points: number[] // flat [x0,y0,x1,y1,...] in video pixel coords
  color: string
  strokeWidth: number
}

export interface ArrowAnnotation {
  id: string
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface CircleAnnotation {
  id: string
  type: 'circle'
  cx: number
  cy: number
  radius: number
  color: string
}

export interface RectangleAnnotation {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface LineAnnotation {
  id: string
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface TextAnnotation {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export interface SpotlightAnnotation {
  id: string
  type: 'spotlight'
  cx: number
  cy: number
  radius: number
  color: string
}

export interface CrossAnnotation {
  id: string
  type: 'cross'
  cx: number
  cy: number
  size: number
  color: string
}

export type Annotation =
  | PencilAnnotation
  | ArrowAnnotation
  | CircleAnnotation
  | RectangleAnnotation
  | LineAnnotation
  | TextAnnotation
  | SpotlightAnnotation
  | CrossAnnotation

export const ANNOTATION_COLORS = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'White', value: '#ffffff' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#22c55e' },
] as const
