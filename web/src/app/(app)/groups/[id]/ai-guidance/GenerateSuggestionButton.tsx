'use client'

import { useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateGroupSessionSuggestion } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
}

export function GenerateSuggestionButton({ groupId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateGroupSessionSuggestion(groupId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Session plan generated!')
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e8560a]/15 border border-[#e8560a]/30 text-[#e8560a] hover:bg-[#e8560a]/25 transition-colors disabled:opacity-50 text-sm font-medium"
    >
      {isPending
        ? <><Loader2 size={15} className="animate-spin" /> Generating — this takes ~10 seconds…</>
        : <><Sparkles size={15} /> Generate session plan</>
      }
    </button>
  )
}
