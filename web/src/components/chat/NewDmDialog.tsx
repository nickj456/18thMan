'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Pencil, User, Loader2, Search } from 'lucide-react'
import { searchProfiles, startDm } from '@/app/(app)/chat/dm/actions'
import { toast } from 'sonner'

type Profile = {
  id: string
  display_name: string | null
  username: string
  avatar_url: string | null
}

export function NewDmDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const { results: found } = await searchProfiles(value)
      setResults(found ?? [])
      setIsSearching(false)
    }, 300)
  }

  function handleSelect(userId: string) {
    startTransition(async () => {
      const result = await startDm(userId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setQuery('')
      setResults([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil size={14} className="mr-2" />
        New message
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <Input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search by name or username…"
              className="pl-9"
              autoFocus
            />
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-6 text-zinc-500">
              <Loader2 size={16} className="animate-spin mr-2" />
              <span className="text-sm">Searching…</span>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <ul className="rounded-lg border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {results.map(profile => (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(profile.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left disabled:opacity-50"
                  >
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name ?? profile.username}
                        width={36}
                        height={36}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <User size={16} className="text-zinc-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">
                        {profile.display_name ?? profile.username}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">@{profile.username}</p>
                    </div>
                    {isPending && <Loader2 size={14} className="ml-auto animate-spin text-zinc-500 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-6">No coaches found for &ldquo;{query}&rdquo;</p>
          )}

          {query.trim().length < 2 && (
            <p className="text-xs text-zinc-600 text-center py-4">Type at least 2 characters to search</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
