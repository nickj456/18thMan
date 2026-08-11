'use client'

import { useReducer, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionCard } from './OptionCard'
import { pickReducer, type PickState } from './pickReducer'
import { answerQuestion } from './actions'

export function QuestionOptions({
  attemptId,
  questionId,
  options,
  initialMostId,
  initialLeastId,
}: {
  attemptId: string
  questionId: string
  options: { id: string; optionText: string }[]
  initialMostId: string | null
  initialLeastId: string | null
}) {
  const initialState: PickState = { mostId: initialMostId, leastId: initialLeastId }
  const [state, dispatch] = useReducer(pickReducer, initialState)
  const [isPending, startTransition] = useTransition()

  const canContinue = state.mostId !== null && state.leastId !== null

  return (
    <div className="space-y-3">
      {options.map(option => (
        <OptionCard
          key={option.id}
          optionText={option.optionText}
          mark={state.mostId === option.id ? 'most' : state.leastId === option.id ? 'least' : null}
          onTap={() => dispatch({ type: 'tap', optionId: option.id })}
        />
      ))}

      <div className="flex items-center gap-3 pt-2">
        <Button
          disabled={!canContinue || isPending}
          onClick={() => {
            const { mostId, leastId } = state
            if (!mostId || !leastId) return
            startTransition(() => {
              answerQuestion(attemptId, questionId, mostId, leastId)
            })
          }}
        >
          {isPending ? 'Saving...' : 'Continue'}
        </Button>
        {!canContinue && (
          <p className="text-xs text-zinc-500">Pick your most and least like you.</p>
        )}
      </div>
    </div>
  )
}
