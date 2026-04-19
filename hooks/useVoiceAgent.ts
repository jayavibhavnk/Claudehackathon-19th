'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PTExercise } from '@/lib/schemas/pt-exercise'
import type { ExerciseAnimationData } from '@/lib/schemas/pose'

export type VoiceState = 'dormant' | 'listening' | 'processing' | 'speaking' | 'error'
export type SessionMode = 'step-by-step' | 'all-at-once'
export type AppPhase = 'browse' | 'searching' | 'session' | 'complete'

export interface ExerciseResult {
  exercise: PTExercise
  animation: ExerciseAnimationData | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SessionContext {
  phase: AppPhase
  exercises: PTExercise[]
  currentIdx: number
  mode: SessionMode
}

const SILENCE_MS = 1400
const MAX_HISTORY = 12

export function useVoiceAgent() {
  const [voiceState, setVoiceState] = useState<VoiceState>('dormant')
  const [appPhase, setAppPhase] = useState<AppPhase>('browse')
  const [exercises, setExercises] = useState<ExerciseResult[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sessionMode, setSessionMode] = useState<SessionMode>('step-by-step')
  const [messages, setMessages] = useState<Message[]>([])
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [responseText, setResponseText] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  const voiceStateRef = useRef<VoiceState>('dormant')
  const appPhaseRef = useRef<AppPhase>('browse')
  const exercisesRef = useRef<ExerciseResult[]>([])
  const currentIdxRef = useRef(0)
  const sessionModeRef = useRef<SessionMode>('step-by-step')
  const messagesRef = useRef<Message[]>([])
  const accumulatedRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recognitionRef = useRef<any>(null)
  const isRunningRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  function setVS(s: VoiceState) {
    voiceStateRef.current = s
    setVoiceState(s)
  }

  function setAP(p: AppPhase) {
    appPhaseRef.current = p
    setAppPhase(p)
  }

  // ── Audio meter ───────────────────────────────────
  async function startMeter() {
    if (micStreamRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      micStreamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!mountedRef.current) return
        analyser.getByteFrequencyData(data)
        setAudioLevel(Math.min(data.reduce((a, b) => a + b, 0) / data.length / 60, 1))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* mic permission may be denied */ }
  }

  function stopMeter() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null
    setAudioLevel(0)
  }

  function safeStart() {
    const r = recognitionRef.current
    if (!r || isRunningRef.current) return
    try { r.start(); isRunningRef.current = true } catch { /* ignore */ }
  }

  // ── TTS ───────────────────────────────────────────
  async function speakText(text: string) {
    currentAudioRef.current?.pause()
    currentAudioRef.current = null
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const audio = new Audio(url)
      currentAudioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); reject() }
        audio.play().catch(reject)
      })
    } catch { /* silent fallback */ }
  }

  // ── Parse embedded actions from Claude response ───
  function parseActions(text: string): { cleanText: string; action: string | null; searchTarget: string | null } {
    let action: string | null = null
    let searchTarget: string | null = null

    const searchMatch = text.match(/\[SEARCH:([^\]]+)\]/)
    if (searchMatch) {
      action = 'SEARCH'
      searchTarget = searchMatch[1].trim()
    } else if (text.includes('[COMPLETE]')) {
      action = 'COMPLETE'
    } else if (text.includes('[NEXT]')) {
      action = 'NEXT'
    } else if (text.includes('[REPEAT]')) {
      action = 'REPEAT'
    } else if (text.includes('[PAUSE]')) {
      action = 'PAUSE'
    } else if (text.includes('[START_SESSION]')) {
      action = 'START_SESSION'
    }

    const cleanText = text
      .replace(/\[SEARCH:[^\]]+\]/g, '')
      .replace(/\[(COMPLETE|NEXT|REPEAT|PAUSE|START_SESSION)\]/g, '')
      .trim()

    return { cleanText, action, searchTarget }
  }

  // ── Handle actions after Claude responds ──────────
  async function handleAction(action: string, searchTarget: string | null) {
    if (action === 'SEARCH' && searchTarget) {
      setAP('searching')
      setSearchQuery(searchTarget)
      try {
        const res = await fetch('/api/search-exercise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchTarget }),
        })
        const data = await res.json()
        if (res.ok && data.exercises?.length > 0) {
          exercisesRef.current = data.exercises
          setExercises(data.exercises)
          currentIdxRef.current = 0
          setCurrentIdx(0)
          setAP('session')
          setSearchQuery(null)
        } else {
          await speakText(`Couldn't find exercises for ${searchTarget}. Try a different name.`)
          setAP('browse')
          setSearchQuery(null)
        }
      } catch {
        setAP('browse')
        setSearchQuery(null)
      }
    } else if (action === 'NEXT') {
      const next = currentIdxRef.current + 1
      if (next < exercisesRef.current.length) {
        currentIdxRef.current = next
        setCurrentIdx(next)
      }
    } else if (action === 'COMPLETE') {
      setAP('complete')
    } else if (action === 'REPEAT') {
      setCurrentIdx(currentIdxRef.current) // triggers re-render to reset
    }
  }

  // ── Main Claude call ──────────────────────────────
  async function sendToClaude(userText: string) {
    setVS('processing')
    setResponseText('')
    stopMeter()

    const userMsg: Message = { role: 'user', content: userText }
    const updated = [...messagesRef.current, userMsg].slice(-MAX_HISTORY)
    messagesRef.current = updated
    setMessages([...updated])

    const sessionCtx: SessionContext = {
      phase: appPhaseRef.current === 'session' ? 'session' : 'browse',
      exercises: exercisesRef.current.map(r => r.exercise),
      currentIdx: currentIdxRef.current,
      mode: sessionModeRef.current,
    }

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          session: sessionCtx,
        }),
      })
      if (!res.ok) throw new Error()

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setVS('speaking')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setResponseText(fullText)
      }

      const { cleanText, action, searchTarget } = parseActions(fullText)

      const asstMsg: Message = { role: 'assistant', content: cleanText }
      const final = [...messagesRef.current, asstMsg].slice(-MAX_HISTORY)
      messagesRef.current = final
      setMessages([...final])

      if (cleanText) await speakText(cleanText)

      if (action) await handleAction(action, searchTarget)

      accumulatedRef.current = ''
      setTranscript('')
      setPartialTranscript('')
      setResponseText('')
      setVS('listening')
      startMeter()
      safeStart()
    } catch {
      setError('Something went wrong. Try again.')
      setVS('error')
      setTimeout(() => {
        if (!mountedRef.current) return
        setError(null)
        setVS('dormant')
        safeStart()
      }, 3000)
    }
  }

  // ── Public controls ───────────────────────────────
  const startListening = useCallback(() => {
    setVS('listening')
    startMeter()
    safeStart()
  }, [])

  const setMode = useCallback((mode: SessionMode) => {
    sessionModeRef.current = mode
    setSessionMode(mode)
  }, [])

  const advanceExercise = useCallback(() => {
    const next = currentIdxRef.current + 1
    if (next < exercisesRef.current.length) {
      currentIdxRef.current = next
      setCurrentIdx(next)
    } else {
      setAP('complete')
    }
  }, [])

  const restartSession = useCallback(() => {
    currentIdxRef.current = 0
    setCurrentIdx(0)
    setAP('session')
  }, [])

  const goToBrowse = useCallback(() => {
    setAP('browse')
    setExercises([])
    exercisesRef.current = []
    currentIdxRef.current = 0
    setCurrentIdx(0)
    messagesRef.current = []
    setMessages([])
  }, [])

  const loadExercises = useCallback((results: ExerciseResult[], mode?: SessionMode) => {
    exercisesRef.current = results
    setExercises(results)
    currentIdxRef.current = 0
    setCurrentIdx(0)
    if (mode) {
      sessionModeRef.current = mode
      setSessionMode(mode)
    }
    setAP('session')
  }, [])

  // ── Speech recognition setup ──────────────────────
  useEffect(() => {
    mountedRef.current = true

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported. Use Chrome.')
      setVS('error')
      return
    }

    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    r.maxAlternatives = 3
    recognitionRef.current = r

    r.onstart = () => { isRunningRef.current = true }

    r.onresult = (event: any) => {
      const s = voiceStateRef.current
      if (s === 'processing' || s === 'speaking' || s === 'dormant') return

      let interim = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else for (let j = 0; j < result.length; j++) interim += result[j].transcript + ' '
      }

      setPartialTranscript(interim.trim())

      if (finalText.trim()) {
        const newAccum = (accumulatedRef.current + ' ' + finalText).trim()
        accumulatedRef.current = newAccum
        setTranscript(newAccum)

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          const text = accumulatedRef.current.trim()
          if (text && voiceStateRef.current === 'listening') {
            accumulatedRef.current = ''
            setTranscript('')
            setPartialTranscript('')
            sendToClaude(text)
          }
        }, SILENCE_MS)
      }
    }

    r.onerror = (event: any) => {
      isRunningRef.current = false
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.')
        setVS('error')
      }
    }

    r.onend = () => {
      isRunningRef.current = false
      const s = voiceStateRef.current
      if (!mountedRef.current || s === 'error' || s === 'processing' || s === 'speaking') return
      setTimeout(() => { if (!mountedRef.current) return; safeStart() }, 500)
    }

    return () => {
      mountedRef.current = false
      isRunningRef.current = false
      try { r.stop() } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      stopMeter()
      currentAudioRef.current?.pause()
    }
  }, []) // eslint-disable-line

  return {
    voiceState,
    appPhase,
    exercises,
    currentIdx,
    sessionMode,
    messages,
    transcript,
    partialTranscript,
    responseText,
    audioLevel,
    error,
    searchQuery,
    // controls
    startListening,
    setMode,
    advanceExercise,
    restartSession,
    goToBrowse,
    loadExercises,
    speakText,
  }
}
