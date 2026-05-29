'use client'

import { useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Window & Record<string, any>

function getSpeechRecognition(): ISpeechRecognitionConstructor | null {
  const win = window as AnyWindow
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition) as ISpeechRecognitionConstructor | undefined ?? null
}

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  useEffect(() => {
    setIsSupported(!!getSpeechRecognition())
  }, [])

  function start() {
    const SpeechRecognitionAPI = getSpeechRecognition()
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      if (interimText) setInterim(interimText)
      if (finalText) {
        onResult(finalText.trim())
        setInterim('')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterim('')
      recognitionRef.current = null
    }

    recognition.onerror = () => {
      setIsListening(false)
      setInterim('')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
  }

  function toggle() {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return { isListening, isSupported, interim, start, stop, toggle }
}
