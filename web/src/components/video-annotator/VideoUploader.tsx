'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getClipSignedUrl } from '@/app/(app)/drills/[id]/analyze/actions'

const MAX_SIZE_BYTES = 52_428_800 // 50 MB
const MAX_DURATION_SECONDS = 30

interface Props {
  userId: string
  onClipReady: (signedUrl: string) => void
}

async function validateDuration(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration <= MAX_DURATION_SECONDS)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    video.src = url
  })
}

export function VideoUploader({ userId, onClipReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4 or WebM)')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Video must be under 50 MB')
      return
    }

    const validDuration = await validateDuration(file)
    if (!validDuration) {
      toast.error('Video must be 30 seconds or shorter')
      return
    }

    const ext = file.name.split('.').pop() ?? 'mp4'
    const storagePath = `${userId}/${Date.now()}.${ext}`

    setUploading(true)
    setProgress(0)

    try {
      const supabase = createClient()

      // Supabase JS v2 doesn't expose XHR progress for storage uploads.
      // Simulate progress via a polling interval while the upload runs.
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 300)

      const { error: uploadError } = await supabase.storage
        .from('clip-annotations')
        .upload(storagePath, file, { contentType: file.type, upsert: false })

      clearInterval(progressInterval)

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      setProgress(95)

      const { signedUrl, error: urlError } = await getClipSignedUrl(storagePath)
      if (urlError || !signedUrl) {
        toast.error(urlError ?? 'Could not generate playback URL')
        return
      }

      setProgress(100)
      onClipReady(signedUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
          <Upload className="h-7 w-7 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Upload a video clip</p>
          <p className="mt-1 text-xs text-zinc-500">MP4 or WebM · max 30 seconds · max 50 MB</p>
        </div>
      </div>

      {uploading ? (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-500">Uploading… {progress}%</p>
        </div>
      ) : (
        <Button
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Choose video
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Reset input so the same file can be re-selected if needed
          e.target.value = ''
        }}
      />
    </div>
  )
}
