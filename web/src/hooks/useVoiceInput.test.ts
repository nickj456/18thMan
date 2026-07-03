import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVoiceInput } from './useVoiceInput'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any

describe('useVoiceInput isSupported', () => {
  afterEach(() => {
    delete win.webkitSpeechRecognition
    delete win.SpeechRecognition
  })

  it('reports unsupported when no SpeechRecognition API exists (jsdom default)', () => {
    const { result } = renderHook(() => useVoiceInput(() => {}))
    expect(result.current.isSupported).toBe(false)
  })

  it('reports supported when webkitSpeechRecognition is present', () => {
    win.webkitSpeechRecognition = class {
      start() {}
      stop() {}
      abort() {}
    }
    const { result } = renderHook(() => useVoiceInput(() => {}))
    expect(result.current.isSupported).toBe(true)
  })
})
