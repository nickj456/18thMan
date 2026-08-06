import { describe, it, expect } from 'vitest'
import { getQuestionProgress, getPreviousQuestionId, type OrderedQuestion } from './assessment-progress'

const questions: OrderedQuestion[] = [
  { id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' },
]

describe('getQuestionProgress', () => {
  it('returns the first question and position 1 when nothing is answered', () => {
    const result = getQuestionProgress(questions, [])
    expect(result).toEqual({ nextQuestion: { id: 'q1' }, position: 1, total: 4, isComplete: false })
  })

  it('returns the next unanswered question after some are answered, regardless of answer order', () => {
    const result = getQuestionProgress(questions, ['q2', 'q1'])
    expect(result).toEqual({ nextQuestion: { id: 'q3' }, position: 3, total: 4, isComplete: false })
  })

  it('marks the assessment complete when every question is answered', () => {
    const result = getQuestionProgress(questions, ['q1', 'q2', 'q3', 'q4'])
    expect(result).toEqual({ nextQuestion: null, position: 5, total: 4, isComplete: true })
  })

  it('ignores answered-question ids that are not in the ordered list', () => {
    const result = getQuestionProgress(questions, ['q1', 'stale-id-from-a-retired-question'])
    expect(result.nextQuestion).toEqual({ id: 'q2' })
  })

  it('returns complete for an empty question list', () => {
    const result = getQuestionProgress([], [])
    expect(result).toEqual({ nextQuestion: null, position: 1, total: 0, isComplete: true })
  })
})

describe('getPreviousQuestionId', () => {
  it('returns the id of the question before the current one', () => {
    expect(getPreviousQuestionId(questions, 'q3')).toBe('q2')
  })

  it('returns null when the current question is first in the list', () => {
    expect(getPreviousQuestionId(questions, 'q1')).toBeNull()
  })

  it('returns null when the current question id is not found', () => {
    expect(getPreviousQuestionId(questions, 'not-in-list')).toBeNull()
  })
})
