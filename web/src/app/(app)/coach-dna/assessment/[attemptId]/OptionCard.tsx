import { Card } from '@/components/ui/card'

export function OptionCard({
  optionText,
  mark,
  onTap,
}: {
  optionText: string
  mark: 'most' | 'least' | null
  onTap: () => void
}) {
  return (
    <button type="button" onClick={onTap} className="w-full text-left">
      <Card
        className={`p-4 transition-colors hover:bg-zinc-800/60 cursor-pointer ${
          mark === 'most' ? 'ring-2 ring-orange-500 bg-zinc-800/40' : ''
        } ${mark === 'least' ? 'ring-2 ring-zinc-500 bg-zinc-900/60' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-200">{optionText}</p>
          {mark === 'most' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 shrink-0">
              Most like me
            </span>
          )}
          {mark === 'least' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
              Least like me
            </span>
          )}
        </div>
      </Card>
    </button>
  )
}
