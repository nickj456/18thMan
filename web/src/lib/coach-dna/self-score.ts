const CATEGORY_SLUGS = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
] as const

export interface SelfCategoryScore {
  categorySlug: string
  score: number
}

// A category is offered as a choosable option in exactly 12 of the 24
// self-assessment questions (96 options, 12 per category, one category per
// option, per the seed data). Each response can contribute at most +1
// ("most") or -1 ("least") to a category's tally, so the tally across a full
// attempt naturally ranges -12..+12. Rescaling that fixed range to 0-100
// gives a real, undiluted score -- this is why the formula uses the literal
// structural constants (12, 24) rather than responses.length: the scale is a
// property of the question set, not of how many responses happen to be
// passed into this pure function.
const TIMES_EACH_CATEGORY_IS_OFFERED = 12
const TOTAL_QUESTIONS = 24

export function computeSelfOnlyCategoryScores(
  responses: { mostOptionId: string; leastOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[] {
  const optionsById = new Map(options.map(o => [o.id, o]))

  return CATEGORY_SLUGS.map(categorySlug => {
    const sum = responses.reduce((total, response) => {
      const mostOption = optionsById.get(response.mostOptionId)
      const leastOption = optionsById.get(response.leastOptionId)
      const isMost = (mostOption?.categoryWeights[categorySlug] ?? 0) > 0
      const isLeast = (leastOption?.categoryWeights[categorySlug] ?? 0) > 0
      return total + (isMost ? 1 : 0) - (isLeast ? 1 : 0)
    }, 0)

    const score = (sum + TIMES_EACH_CATEGORY_IS_OFFERED) * 100 / TOTAL_QUESTIONS
    return { categorySlug, score }
  })
}
