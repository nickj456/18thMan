'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import { createProduct } from './actions'
import type { ProductContentType, SubscriptionTier } from '@/lib/supabase/types'

export function NewProductForm() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState('')
  const [fileName, setFileName] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/shop-assets/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
        return
      }
      setStoragePath(data.path)
      setFileName(file.name)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const priceRaw = form.get('price') as string
    const tierRaw = form.get('minTier') as string

    setSubmitting(true)
    const result = await createProduct({
      title: form.get('title') as string,
      description: (form.get('description') as string) ?? '',
      contentType: form.get('contentType') as ProductContentType,
      priceCents: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : null,
      minSubscriptionTier: tierRaw ? (tierRaw as SubscriptionTier) : null,
      storagePath,
      previewImageUrl: (form.get('previewImageUrl') as string) ?? '',
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setStoragePath('')
    setFileName('')
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <h2 className="app-heading text-lg">New product</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Title</label>
          <input name="title" required className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Content type</label>
          <select name="contentType" required defaultValue="pdf" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="bundle">Bundle</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Description</label>
        <textarea name="description" rows={2} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Price (£, blank = not sold individually)</label>
          <input name="price" type="number" min="0" step="0.01" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Minimum tier to unlock (optional)</label>
          <select name="minTier" defaultValue="" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            <option value="">Purchase required</option>
            <option value="coach">Coach Pro</option>
            <option value="club">Club</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Preview image URL (optional)</label>
        <input name="previewImageUrl" type="url" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Content file (PDF or video)</label>
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm cursor-pointer hover:border-zinc-500 transition-colors">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          <span className="text-zinc-400">{fileName || (uploading ? 'Uploading…' : 'Choose file')}</span>
          <input type="file" accept=".pdf,video/mp4,video/quicktime,video/webm" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || uploading || !storagePath}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating…' : 'Create product'}
      </button>
    </form>
  )
}
