'use client'

import { useRef, useState, useTransition } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Loader2 } from 'lucide-react'
import { uploadAvatar } from '@/app/(app)/profile/actions'
import { toast } from 'sonner'

interface AvatarUploadProps {
  currentUrl: string | null
  displayName: string | null
  size?: 'lg' | 'xl'
}

export function AvatarUpload({ currentUrl, displayName, size = 'xl' }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const sizeClass = size === 'xl' ? 'size-24' : 'size-16'

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('avatar', file)

    startTransition(async () => {
      const result = await uploadAvatar(formData)
      if (result.error) {
        toast.error(result.error)
        setPreview(currentUrl)
      } else {
        toast.success('Profile picture updated')
      }
    })
  }

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClass}>
        <AvatarImage src={preview ?? undefined} alt={displayName ?? 'Avatar'} />
        <AvatarFallback className="text-lg font-semibold bg-indigo-500/20 text-indigo-300">
          {initials}
        </AvatarFallback>
      </Avatar>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Change profile picture"
      >
        {isPending
          ? <Loader2 size={18} className="animate-spin text-white" />
          : <Camera size={18} className="text-white" />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
