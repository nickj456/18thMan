const CATEGORY_SLUGS = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
] as const

export interface SelfCategoryScore {
  categorySlug: string
  score: number
}

export function computeSelfOnlyCategoryScores(
  responses: { selectedOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[] {
  const optionsById = new Map(options.map(o => [o.id, o]))

  return CATEGORY_SLUGS.map(categorySlug => {
    if (responses.length === 0) return { categorySlug, score: 0 }

    const total = responses.reduce((sum, response) => {
      const option = optionsById.get(response.selectedOptionId)
      const weight = option?.categoryWeights[categorySlug] ?? 0
      return sum + weight
    }, 0)

    return { categorySlug, score: total / responses.length }
  })
}
