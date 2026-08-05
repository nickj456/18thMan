export interface OrderedQuestion {
  id: string
}

export interface QuestionProgress {
  nextQuestion: OrderedQuestion | null
  position: number
  total: number
  isComplete: boolean
}

export function getQuestionProgress(
  orderedQuestions: OrderedQuestion[],
  answeredQuestionIds: string[],
): QuestionProgress {
  const answered = new Set(answeredQuestionIds)
  const total = orderedQuestions.length
  const nextQuestion = orderedQuestions.find(q => !answered.has(q.id)) ?? null
  const position = nextQuestion ? orderedQuestions.indexOf(nextQuestion) + 1 : total + 1
  return { nextQuestion, position, total, isComplete: nextQuestion === null }
}

export function getPreviousQuestionId(
  orderedQuestions: OrderedQuestion[],
  currentQuestionId: string,
): string | null {
  const idx = orderedQuestions.findIndex(q => q.id === currentQuestionId)
  if (idx <= 0) return null
  return orderedQuestions[idx - 1].id
}
