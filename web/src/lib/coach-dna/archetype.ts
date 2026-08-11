import type { SelfCategoryScore } from './self-score'

const CATEGORY_ORDER = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
]

export interface ArchetypeResult {
  primaryType: string
  secondaryType: string | null
  pros: string[]
  cons: string[]
}

function sortByScoreThenOrder(scores: SelfCategoryScore[]): SelfCategoryScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug)
  })
}

export function deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult {
  const ranked = sortByScoreThenOrder(scores)
  const primary = ranked[0]
  const secondary = ranked[1]

  return {
    primaryType: primary.categorySlug,
    secondaryType: secondary && primary.score - secondary.score <= 10 ? secondary.categorySlug : null,
    pros: ranked.slice(0, 3).map(r => r.categorySlug),
    cons: ranked.slice(-3).reverse().map(r => r.categorySlug),
  }
}
