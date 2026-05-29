'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createPodcast } from '@/app/(app)/podcasts/actions'
import { Loader2, ExternalLink } from 'lucide-react'

interface Preview {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

export function NewPodcastForm() {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleUrlChange(value: string) {
    setUrl(value)
    setPreview(null)
    setPreviewError(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    let parsed: URL
    try {
      parsed = new URL(value.trim())
    } catch {
      return
    }
    if (!parsed.protocol.startsWith('http')) return

    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setPreview(data)
        } else {
          setPreviewError(true)
        }
      } catch {
        setPreviewError(true)
      } finally {
        setPreviewLoading(false)
      }
    }, 600)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    const formData = new FormData(e.currentTarget)

    // Pass the already-fetched preview data so the server action doesn't re-fetch
    if (preview?.title) formData.set('preview_title', preview.title)
    if (preview?.description) formData.set('preview_description', preview.description)
    if (preview?.image) formData.set('preview_image', preview.image)

    startTransition(async () => {
      const result = await createPodcast(formData)
      if (result?.error) setSubmitError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* URL */}
      <div className="space-y-1.5">
        <Label htmlFor="external_url">Podcast URL</Label>
        <div className="relative">
          <Input
            id="external_url"
            name="external_url"
            type="url"
            placeholder="https://open.spotify.com/episode/..."
            required
            autoFocus
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
          />
          {previewLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
          {preview.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.image}
              alt=""
              className="w-full aspect-video object-cover rounded-md"
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              {preview.title && (
                <p className="text-sm font-medium leading-snug">{preview.title}</p>
              )}
              {preview.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{preview.description}</p>
              )}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{preview.domain}</p>
        </div>
      )}

      {previewError && (
        <p className="text-xs text-muted-foreground">
          Could not load a preview — the podcast will still be added correctly.
        </p>
      )}

      {/* User note */}
      <div className="space-y-1.5">
        <Label htmlFor="note">
          Why are you sharing this?
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
        <Textarea
          id="note"
          name="note"
          placeholder="e.g. Great breakdown of defensive line speed — really helped our u16s..."
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Your note will appear as the first comment on the podcast.
        </p>
      </div>

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <Button type="submit" disabled={isPending || !url} className="w-full">
        {isPending ? (
          <><Loader2 className="size-4 mr-2 animate-spin" />Adding...</>
        ) : 'Add Podcast'}
      </Button>
    </form>
  )
}
