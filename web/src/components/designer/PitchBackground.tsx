'use client'

import { Group, Rect, Line, Text } from 'react-konva'
import { CANVAS_WIDTH, CANVAS_HEIGHT, type PitchBackground } from './types'

const GREEN = '#2d5a27'
const LIGHT_GREEN = '#357a2e'
const WHITE = '#ffffff'
const LINE_WIDTH = 2

function FullPitch() {
  const w = CANVAS_WIDTH
  const h = CANVAS_HEIGHT
  const stripeCount = 10
  const stripeW = w / stripeCount

  const stripes = Array.from({ length: stripeCount }, (_, i) => (
    <Rect
      key={i}
      x={i * stripeW}
      y={0}
      width={stripeW}
      height={h}
      fill={i % 2 === 0 ? GREEN : LIGHT_GREEN}
    />
  ))

  // In-goal areas: ~8% of total length each end
  const ingoalW = w * 0.08

  return (
    <Group>
      {stripes}
      {/* Outer boundary */}
      <Rect x={20} y={20} width={w - 40} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      {/* Left in-goal */}
      <Rect x={20} y={20} width={ingoalW} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      {/* Right in-goal */}
      <Rect x={w - 20 - ingoalW} y={20} width={ingoalW} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      {/* Halfway line */}
      <Line points={[w / 2, 20, w / 2, h - 20]} stroke={WHITE} strokeWidth={LINE_WIDTH} />
      {/* 10m lines */}
      <Line points={[w / 2 - w * 0.09, 20, w / 2 - w * 0.09, h - 20]} stroke={WHITE} strokeWidth={1} dash={[8, 4]} />
      <Line points={[w / 2 + w * 0.09, 20, w / 2 + w * 0.09, h - 20]} stroke={WHITE} strokeWidth={1} dash={[8, 4]} />
      {/* 20m lines */}
      <Line points={[w * 0.08 + 20 + w * 0.12, 20, w * 0.08 + 20 + w * 0.12, h - 20]} stroke={WHITE} strokeWidth={1} dash={[8, 4]} />
      <Line points={[w - 20 - w * 0.08 - w * 0.12, 20, w - 20 - w * 0.08 - w * 0.12, h - 20]} stroke={WHITE} strokeWidth={1} dash={[8, 4]} />
      {/* Centre circle */}
      {/* Labels */}
      <Text text="← Attack" x={30} y={h - 18} fill={WHITE} fontSize={11} opacity={0.6} />
      <Text text="Defence →" x={w - 100} y={h - 18} fill={WHITE} fontSize={11} opacity={0.6} />
    </Group>
  )
}

function HalfPitch() {
  const w = CANVAS_WIDTH
  const h = CANVAS_HEIGHT
  const stripeCount = 6
  const stripeW = w / stripeCount

  const stripes = Array.from({ length: stripeCount }, (_, i) => (
    <Rect key={i} x={i * stripeW} y={0} width={stripeW} height={h} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />
  ))

  const ingoalW = w * 0.14

  return (
    <Group>
      {stripes}
      <Rect x={20} y={20} width={w - 40} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      <Rect x={20} y={20} width={ingoalW} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      <Line points={[w * 0.5, 20, w * 0.5, h - 20]} stroke={WHITE} strokeWidth={LINE_WIDTH} dash={[8, 4]} />
      <Line points={[w * 0.28, 20, w * 0.28, h - 20]} stroke={WHITE} strokeWidth={1} dash={[8, 4]} />
      <Text text="In-Goal" x={28} y={h / 2 - 6} fill={WHITE} fontSize={10} opacity={0.5} rotation={-90} />
      <Text text="← 10m" x={w * 0.5 - 22} y={h - 18} fill={WHITE} fontSize={10} opacity={0.5} />
    </Group>
  )
}

function BlankGrid() {
  const w = CANVAS_WIDTH
  const h = CANVAS_HEIGHT
  const gridSize = 50
  const lines = []

  for (let x = 0; x <= w; x += gridSize) {
    lines.push(<Line key={`v${x}`} points={[x, 0, x, h]} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
  }
  for (let y = 0; y <= h; y += gridSize) {
    lines.push(<Line key={`h${y}`} points={[0, y, w, y]} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
  }

  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} fill="#1a1a2e" />
      {lines}
    </Group>
  )
}

function InGoalArea() {
  const w = CANVAS_WIDTH
  const h = CANVAS_HEIGHT
  const stripeCount = 6
  const stripeW = w / stripeCount

  const stripes = Array.from({ length: stripeCount }, (_, i) => (
    <Rect key={i} x={i * stripeW} y={0} width={stripeW} height={h} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />
  ))

  return (
    <Group>
      {stripes}
      <Rect x={20} y={20} width={w - 40} height={h - 40} stroke={WHITE} strokeWidth={LINE_WIDTH} fill="transparent" />
      {/* Try line */}
      <Line points={[w * 0.2, 20, w * 0.2, h - 20]} stroke={WHITE} strokeWidth={LINE_WIDTH} />
      {/* Dead ball line */}
      <Line points={[w - 20, 20, w - 20, h - 20]} stroke={WHITE} strokeWidth={LINE_WIDTH} />
      {/* Posts */}
      <Line points={[w * 0.2, h / 2 - 30, w * 0.2, h / 2 + 30]} stroke="#f59e0b" strokeWidth={4} />
      <Line points={[w * 0.2 - 40, h / 2 - 30, w * 0.2 + 40, h / 2 - 30]} stroke="#f59e0b" strokeWidth={4} />
      <Text text="In-Goal Area" x={w * 0.5} y={h / 2 - 8} fill={WHITE} fontSize={14} opacity={0.4} />
    </Group>
  )
}

interface PitchBackgroundProps {
  type: PitchBackground
}

export function PitchBackgroundLayer({ type }: PitchBackgroundProps) {
  if (type === 'full') return <FullPitch />
  if (type === 'half') return <HalfPitch />
  if (type === 'ingoal') return <InGoalArea />
  return <BlankGrid />
}
