'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, Star } from 'lucide-react'
import type { DrillCategory, DrillDifficulty } from '@/lib/supabase/types'

const DIFFICULTIES: DrillDifficulty[] = ['beginner', 'intermediate', 'advanced']
const AGE_GROUPS = ['Under 10', 'Under 12', 'Under 14', 'Under 16', 'Under 18', 'Open Age']

interface DrillFiltersProps {
  categories: DrillCategory[]
  currentFilters: {
    q?: string
    category?: string
    difficulty?: string
    age_group?: string
    min_rating?: string
  }
}

export function DrillFilters({ categories, currentFilters }: DrillFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [router, pathname, searchParams])

  const hasFilters = Object.values(currentFilters).some(Boolean)
  const RATINGS = ['3', '4', '5'] as const

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search drills..."
          defaultValue={currentFilters.q}
          className="pl-9"
          onChange={e => {
            const val = e.target.value
            const timeout = setTimeout(() => updateParam('q', val || null), 300)
            return () => clearTimeout(timeout)
          }}
        />
      </div>

      {/* Category filter */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={currentFilters.category === cat.slug ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => updateParam('category', currentFilters.category === cat.slug ? null : cat.slug)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Difficulty filter */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Difficulty</p>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map(d => (
            <Badge
              key={d}
              variant={currentFilters.difficulty === d ? 'default' : 'outline'}
              className="cursor-pointer select-none capitalize"
              onClick={() => updateParam('difficulty', currentFilters.difficulty === d ? null : d)}
            >
              {d}
            </Badge>
          ))}
        </div>
      </div>

      {/* Age group filter */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Age Group</p>
        <div className="flex flex-wrap gap-1.5">
          {AGE_GROUPS.map(age => (
            <Badge
              key={age}
              variant={currentFilters.age_group === age ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => updateParam('age_group', currentFilters.age_group === age ? null : age)}
            >
              {age}
            </Badge>
          ))}
        </div>
      </div>

      {/* Min rating filter */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Min Rating</p>
        <div className="flex flex-wrap gap-1.5">
          {RATINGS.map(r => (
            <Badge
              key={r}
              variant={currentFilters.min_rating === r ? 'default' : 'outline'}
              className="cursor-pointer select-none flex items-center gap-1"
              onClick={() => updateParam('min_rating', currentFilters.min_rating === r ? null : r)}
            >
              <Star className="size-3 fill-current" />
              {r}+
            </Badge>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(pathname)}
        >
          <X className="size-3 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
