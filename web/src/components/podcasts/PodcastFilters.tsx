'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'

interface PodcastFiltersProps {
  topTags: string[]
  currentFilters: {
    q?: string
    tags?: string
    sort?: string
    saved?: string
  }
  showSaved?: boolean
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Liked' },
]

export function PodcastFilters({ topTags, currentFilters, showSaved }: PodcastFiltersProps) {
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

  const activeTags = currentFilters.tags ? currentFilters.tags.split(',').filter(Boolean) : []

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag]
    updateParam('tags', next.length > 0 ? next.join(',') : null)
  }

  const hasFilters = !!(currentFilters.q || currentFilters.tags || currentFilters.saved || (currentFilters.sort && currentFilters.sort !== 'newest'))

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search podcasts..."
          defaultValue={currentFilters.q}
          className="pl-9"
          onChange={e => {
            const val = e.target.value
            const timeout = setTimeout(() => updateParam('q', val || null), 300)
            return () => clearTimeout(timeout)
          }}
        />
      </div>

      {/* My List */}
      {showSaved && (
        <div>
          <Badge
            variant={currentFilters.saved === '1' ? 'default' : 'outline'}
            className="cursor-pointer select-none flex items-center gap-1.5"
            onClick={() => updateParam('saved', currentFilters.saved === '1' ? null : '1')}
          >
            <span>🔖</span> My List
          </Badge>
        </div>
      )}

      {/* Sort */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Sort by</p>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map(opt => (
            <Badge
              key={opt.value}
              variant={(currentFilters.sort ?? 'newest') === opt.value ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => updateParam('sort', opt.value === 'newest' ? null : opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {topTags.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(tag => (
              <Badge
                key={tag}
                variant={activeTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

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
