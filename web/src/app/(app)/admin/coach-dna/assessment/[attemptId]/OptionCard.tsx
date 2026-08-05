import { Card } from '@/components/ui/card'
import { answerQuestion } from './actions'

export function OptionCard({
  attemptId,
  questionId,
  optionId,
  optionText,
  isSelected,
}: {
  attemptId: string
  questionId: string
  optionId: string
  optionText: string
  isSelected: boolean
}) {
  const submit = answerQuestion.bind(null, attemptId, questionId, optionId)

  return (
    <form action={submit}>
      <button type="submit" className="w-full text-left">
        <Card
          className={`p-4 transition-colors hover:bg-zinc-800/60 cursor-pointer ${
            isSelected ? 'ring-2 ring-[#f97316] bg-zinc-800/40' : ''
          }`}
        >
          <p className="text-sm text-zinc-200">{optionText}</p>
        </Card>
      </button>
    </form>
  )
}
