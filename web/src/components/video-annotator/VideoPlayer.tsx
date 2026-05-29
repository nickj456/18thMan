'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { VideoAnnotationCanvas } from './VideoAnnotationCanvas'
import { VideoControls } from './VideoControls'
import type { Annotation, AnnotationTool, TextAnnotation } from './types'

interface RenderedRect {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

function getRenderedVideoRect(video: HTMLVideoElement): RenderedRect {
  const elW = video.clientWidth
  const elH = video.clientHeight
  const vW = video.videoWidth
  const vH = video.videoHeight

  if (!vW || !vH) return { width: elW, height: elH, offsetX: 0, offsetY: 0 }

  const videoAspect = vW / vH
  const elAspect = elW / elH

  let renderW: number
  let renderH: number

  if (videoAspect > elAspect) {
    // Wider video — pillarboxed top/bottom
    renderW = elW
    renderH = elW / videoAspect
  } else {
    // Taller video — letterboxed left/right
    renderH = elH
    renderW = elH * videoAspect
  }

  return {
    width: Math.round(renderW),
    height: Math.round(renderH),
    offsetX: Math.round((elW - renderW) / 2),
    offsetY: Math.round((elH - renderH) / 2),
  }
}

interface Props {
  src: string
  activeTool: AnnotationTool | null
  activeColor: string
  annotations: Annotation[]
  onAnnotationsChange: (annotations: Annotation[]) => void
}

interface PendingText {
  x: number
  y: number
  color: string
}

export function VideoPlayer({
  src,
  activeTool,
  activeColor,
  annotations,
  onAnnotationsChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [renderedRect, setRenderedRect] = useState<RenderedRect>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  })
  const [pendingText, setPendingText] = useState<PendingText | null>(null)

  // Auto-focus textarea when it appears
  useEffect(() => {
    if (pendingText) textareaRef.current?.focus()
  }, [pendingText])

  function handleTextPlace(x: number, y: number, color: string) {
    setPendingText({ x, y, color })
  }

  function commitText(text: string) {
    if (text.trim()) {
      const annotation: TextAnnotation = {
        id: nanoid(), type: 'text',
        x: pendingText!.x, y: pendingText!.y,
        text: text.trim(), color: pendingText!.color,
        fontSize: 20,
      }
      onAnnotationsChange([...annotations, annotation])
    }
    setPendingText(null)
  }

  const measure = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setRenderedRect(getRenderedVideoRect(video))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.addEventListener('loadedmetadata', measure)

    const ro = new ResizeObserver(measure)
    ro.observe(video)

    return () => {
      video.removeEventListener('loadedmetadata', measure)
      ro.disconnect()
    }
  }, [measure])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-black">
      {/* Video + overlay */}
      <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={src}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          playsInline
          preload="metadata"
          onLoadedMetadata={measure}
        />

        {/* Konva annotation overlay — positioned over the actual video frame, not the letterbox */}
        {renderedRect.width > 0 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: renderedRect.width,
              height: renderedRect.height,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <VideoAnnotationCanvas
              width={renderedRect.width}
              height={renderedRect.height}
              activeTool={activeTool}
              activeColor={activeColor}
              annotations={annotations}
              onChange={onAnnotationsChange}
              onTextPlace={handleTextPlace}
            />

            {/* DOM text input overlay — appears when user clicks with Text tool */}
            {pendingText && (
              <textarea
                ref={textareaRef}
                rows={1}
                style={{
                  position: 'absolute',
                  left: pendingText.x,
                  top: pendingText.y,
                  color: pendingText.color,
                  fontSize: 20,
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif',
                  background: 'transparent',
                  border: 'none',
                  outline: '1px dashed rgba(255,255,255,0.5)',
                  resize: 'none',
                  padding: '2px 4px',
                  minWidth: 80,
                  lineHeight: 1.2,
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
                onBlur={(e) => commitText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    commitText((e.target as HTMLTextAreaElement).value)
                  }
                  if (e.key === 'Escape') {
                    setPendingText(null)
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls below video */}
      <VideoControls videoRef={videoRef} />
    </div>
  )
}
