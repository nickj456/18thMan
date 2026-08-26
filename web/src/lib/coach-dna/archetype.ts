import type { SelfCategoryScore } from './self-score'

const CATEGORY_ORDER = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
]

export type CategoryTier = 'strength' | 'solid' | 'focus'

export interface CategoryBreakdownEntry {
  categorySlug: string
  score: number
  tier: CategoryTier
}

export interface ArchetypeResult {
  primaryType: string
  secondaryType: string | null
  categories: CategoryBreakdownEntry[]
}

function sortByScoreThenOrder(scores: SelfCategoryScore[]): SelfCategoryScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug)
  })
}

function tierForRank(rank: number): CategoryTier {
  if (rank < 3) return 'strength'
  if (rank < 5) return 'solid'
  return 'focus'
}

export function deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult {
  const ranked = sortByScoreThenOrder(scores)
  const primary = ranked[0]
  const secondary = ranked[1]

  return {
    primaryType: primary.categorySlug,
    secondaryType: secondary && primary.score - secondary.score <= 10 ? secondary.categorySlug : null,
    categories: ranked.map((entry, rank) => ({
      categorySlug: entry.categorySlug,
      score: entry.score,
      tier: tierForRank(rank),
    })),
  }
}
