import { DrillGridSkeleton } from '@/components/drills/DrillGridSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function DrillsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <DrillGridSkeleton />
      </div>
    </div>
  )
}
