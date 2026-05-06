import { Skeleton } from '@/components/ui/skeleton'

export default function DrillDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
