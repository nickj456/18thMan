'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoControls({ videoRef }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const scrubberRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function onPlay()     { setIsPlaying(true) }
    function onPause()    { setIsPlaying(false) }
    function onEnded()    { setIsPlaying(false) }
    function onTimeUpdate() {
      setCurrentTime(video!.currentTime)
      if (scrubberRef.current) {
        scrubberRef.current.value = String(video!.currentTime)
      }
    }
    function onLoadedMetadata() {
      setDuration(video!.duration)
      if (scrubberRef.current) {
        scrubberRef.current.max = String(video!.duration)
      }
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [videoRef])

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    const t = Number(e.target.value)
    video.currentTime = t
    setCurrentTime(t)
  }

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-2">
      <button
        onClick={togglePlayback}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <input
        ref={scrubberRef}
        type="range"
        min={0}
        max={duration || 30}
        step={0.05}
        defaultValue={0}
        onChange={handleScrub}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
      />

      <span className="shrink-0 font-mono text-xs text-zinc-500">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}
