export type ServiceType = 'match-review' | 'opposition-scouting'

export const RUGBY_LEAGUE_POSITIONS = [
  'Full Back',
  'Right Wing',
  'Right Centre',
  'Left Centre',
  'Left Wing',
  'Stand-off',
  'Half Back',
  'Hooker',
  'Prop',
  'Second Row',
  'Loose Forward',
  'Interchange',
] as const

export type Position = (typeof RUGBY_LEAGUE_POSITIONS)[number]

export interface PlayerStats {
  carries: number
  metresMade: number
  lineBreaks: number
  offloads: number
  tries: number
  tryAssists: number
  tacklesMade: number
  missedTackles: number
  handlingErrors: number
  penalties: number
}

export interface PlayerReport {
  name: string
  position: string
  stats: PlayerStats
  strengths: string
  areasToImprove: string
  actionPoints: string
}

export interface TeamSummary {
  overallShape: string
  defensivePatterns: string
  attackingThreats: string
  setPieceNotes: string
}

export interface MatchReportData {
  serviceType: ServiceType
  customerEmail: string
  matchDate: string
  opposition: string
  competition: string
  players: PlayerReport[]
  teamSummary?: TeamSummary
}

export const DEFAULT_STATS: PlayerStats = {
  carries: 0,
  metresMade: 0,
  lineBreaks: 0,
  offloads: 0,
  tries: 0,
  tryAssists: 0,
  tacklesMade: 0,
  missedTackles: 0,
  handlingErrors: 0,
  penalties: 0,
}
