'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Search, CheckSquare, Square, Sparkles } from 'lucide-react'
import { fetchPlaylistVideos, importPlaylistDrills } from './actions'
import type { PlaylistVideo } from './actions'
import type { DrillCategory } from '@/lib/supabase/types'

export function PlaylistImporter({ categories }: { categories: DrillCategory[] }) {
  const [url, setUrl] = useState('')
  const [playlistTitle, setPlaylistTitle] = useState('')
  const [videos, setVideos] = useState<PlaylistVideo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [categoryId, setCategoryId] = useState('')
  const [generateGuides, setGenerateGuides] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null)

  const [isFetching, startFetch] = useTransition()
  const [isImporting, startImport] = useTransition()

  function handleFetch() {
    if (!url.trim()) return
    setVideos([])
    setSelected(new Set())
    setImportResult(null)
    startFetch(async () => {
      const result = await fetchPlaylistVideos(url.trim())
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setPlaylistTitle(result.playlistTitle)
      setVideos(result.videos)
      setSelected(new Set(result.videos.map(v => v.videoId)))
      toast.success(`Found ${result.videos.length} videos in "${result.playlistTitle}"`)
    })
  }

  function toggleAll() {
    if (selected.size === videos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(videos.map(v => v.videoId)))
    }
  }

  function toggle(videoId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(videoId) ? next.delete(videoId) : next.add(videoId)
      return next
    })
  }

  function handleImport() {
    const toImport = videos.filter(v => selected.has(v.videoId))
    if (!toImport.length) { toast.error('Select at least one video'); return }

    startImport(async () => {
      toast.info(generateGuides
        ? `Importing ${toImport.length} drills with AI guides — this may take a few minutes…`
        : `Importing ${toImport.length} drills…`
      )
      const result = await importPlaylistDrills(toImport, categoryId || null, generateGuides)
      setImportResult(result)
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} drill${result.imported !== 1 ? 's' : ''} successfully`)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} drill${result.failed !== 1 ? 's' : ''} failed to import`)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* URL input */}
      <div className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="space-y-1.5">
          <Label htmlFor="playlist-url">YouTube Playlist URL</Label>
          <div className="flex gap-2">
            <Input
              id="playlist-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="flex-1"
            />
            <Button onClick={handleFetch} disabled={isFetching || !url.trim()}>
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {isFetching ? 'Fetching…' : 'Fetch'}
            </Button>
          </div>
        </div>
      </div>

      {/* Video selection */}
      {videos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{playlistTitle}</h2>
              <p className="text-sm text-muted-foreground">{videos.length} videos · {selected.size} selected</p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selected.size === videos.length
                ? <><Square size={14} className="mr-1.5" />Deselect all</>
                : <><CheckSquare size={14} className="mr-1.5" />Select all</>
              }
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.map(video => {
              const isSelected = selected.has(video.videoId)
              return (
                <div
                  key={video.videoId}
                  onClick={() => toggle(video.videoId)}
                  className={`relative rounded-lg border cursor-pointer transition-colors overflow-hidden ${
                    isSelected ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900 opacity-60'
                  }`}
                >
                  <div className="relative aspect-video">
                    <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                    <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-black/10' : 'bg-black/40'}`} />
                    <div className="absolute top-2 right-2">
                      <Checkbox checked={isSelected} className="pointer-events-none bg-white/90" />
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-2 leading-snug">{video.title}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Import options */}
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 space-y-4">
            <h3 className="font-medium text-sm">Import Options</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Category (optional)</Label>
                <Select value={categoryId} onValueChange={v => setCategoryId(v ?? '')}>
                  <SelectTrigger className="h-8 text-sm">
                    <span className={categoryId ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {categoryId ? (categories.find(c => c.id === categoryId)?.name ?? 'Select category') : 'No category'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-5">
                <Checkbox
                  id="generate-guides"
                  checked={generateGuides}
                  onCheckedChange={v => setGenerateGuides(!!v)}
                />
                <div>
                  <Label htmlFor="generate-guides" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-400" />
                    Generate AI guides
                  </Label>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Slower — fetches transcript per video</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting || selected.size === 0}
              className="w-full sm:w-auto"
            >
              {isImporting ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              {isImporting ? 'Importing…' : `Import ${selected.size} drill${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>

          {/* Results */}
          {importResult && (
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 space-y-2">
              <div className="flex gap-3">
                {importResult.imported > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    {importResult.imported} imported
                  </Badge>
                )}
                {importResult.failed > 0 && (
                  <Badge className="bg-red-500/15 text-red-400 border-red-500/20">
                    {importResult.failed} failed
                  </Badge>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs text-zinc-500 space-y-0.5 mt-2">
                  {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
