// Shared brand tokens — single source of truth for all compositions
export const B = {
  ember: '#e8560a',
  emberDim: '#b8440a',
  emberGlow: 'rgba(232,86,10,0.15)',
  bg: '#07080d',
  surface: '#0d0f16',
  surface2: '#12151e',
  border: 'rgba(255,255,255,0.07)',
  text: '#e8e4dc',
  muted: '#7a7875',
  dim: '#2a2825',
}

export const difficultyColour: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#fbbf24',
  advanced: '#f87171',
}

export const categoryColour: Record<string, string> = {
  Attack: '#818cf8',
  Defence: '#f87171',
  Kicking: '#34d399',
  Fitness: '#fb923c',
  General: '#94a3b8',
}

export function categoryBg(cat: string): string {
  const c = categoryColour[cat] ?? '#94a3b8'
  return c + '22'
}
