'use client'

import { useState, useCallback } from 'react'
import { VideoUploader } from './VideoUploader'
import { VideoPlayer } from './VideoPlayer'
import { AnnotationToolbar } from './AnnotationToolbar'
import type { Annotation, AnnotationTool } from './types'

interface Props {
  userId: string
}

export function VideoAnnotator({ userId }: Props) {
  const [clipSignedUrl, setClipSignedUrl] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null)
  const [activeColor, setActiveColor] = useState('#ef4444')

  // Undo history — same pattern as DrillDesigner
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  const annotations = history[historyIndex] ?? []

  const pushAnnotations = useCallback(
    (next: Annotation[]) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1)
        return [...truncated, next]
      })
      setHistoryIndex((i) => i + 1)
    },
    [historyIndex]
  )

  function handleUndo() {
    if (historyIndex === 0) return
    setHistoryIndex((i) => i - 1)
  }

  function handleClear() {
    pushAnnotations([])
  }

  function handleToolChange(tool: AnnotationTool | null) {
    setActiveTool(tool)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <AnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        onToolChange={handleToolChange}
        onColorChange={setActiveColor}
        onUndo={handleUndo}
        onClear={handleClear}
        canUndo={historyIndex > 0}
      />

      {clipSignedUrl ? (
        <VideoPlayer
          src={clipSignedUrl}
          activeTool={activeTool}
          activeColor={activeColor}
          annotations={annotations}
          onAnnotationsChange={pushAnnotations}
        />
      ) : (
        <VideoUploader userId={userId} onClipReady={setClipSignedUrl} />
      )}
    </div>
  )
}
