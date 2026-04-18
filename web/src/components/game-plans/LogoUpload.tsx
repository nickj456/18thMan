'use client'

import { useRef, useState, useTransition } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { uploadLogo } from '@/app/(app)/game-plans/actions'

interface LogoUploadProps {
  side: 'home' | 'away'
  label: string
  currentUrl: string | null
  onUpload: (url: string) => void
}

export function LogoUpload({ side, label, currentUrl, onUpload }: LogoUploadProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('side', side)

    startTransition(async () => {
      setError(null)
      const result = await uploadLogo(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        onUpload(result.url)
      }
      // reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm leading-none font-medium select-none">
        {label}
      </label>

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="relative flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ minHeight: '80px' }}
      >
        {isPending ? (
          <div className="flex flex-col items-center gap-2 p-4">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
            <span className="text-xs text-zinc-400">Uploading…</span>
          </div>
        ) : currentUrl ? (
          <div className="flex flex-col items-center gap-2 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt={label}
              className="h-16 w-16 rounded-lg object-contain bg-white/5"
            />
            <span className="text-xs text-zinc-400">Click to change</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <ImageIcon className="size-6 text-zinc-500" />
            <span className="text-xs text-zinc-400">Upload logo</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
