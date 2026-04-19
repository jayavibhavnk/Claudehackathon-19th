'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVoiceAgent } from '@/hooks/useVoiceAgent'
import { VoiceOrb } from '@/components/VoiceOrb'
import { SessionView } from '@/components/SessionView'
import type { ExerciseResult, SessionMode } from '@/hooks/useVoiceAgent'
import type { PTExercise } from '@/lib/schemas/pt-exercise'
import type { ExerciseAnimationData } from '@/lib/schemas/pose'

type UploadPhase = 'idle' | 'uploading'

function CompletionScreen({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">Session complete!</h1>
        <p className="text-gray-400 text-base max-w-xs">
          Great work. You finished all your exercises.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
        >
          Do it again
        </button>
        <button
          onClick={onExit}
          className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          New session
        </button>
      </div>
    </div>
  )
}

function SearchingScreen({ query }: { query: string | null }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Finding exercises...</p>
        {query && <p className="text-gray-400 text-sm mt-1">"{query}"</p>}
      </div>
    </div>
  )
}

export default function Home() {
  const agent = useVoiceAgent()
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [showModeModal, setShowModeModal] = useState(false)
  const [pendingExercises, setPendingExercises] = useState<ExerciseResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // When agent finds exercises via voice, show mode selector first
  const prevPhase = useRef(agent.appPhase)
  useEffect(() => {
    if (prevPhase.current === 'searching' && agent.appPhase === 'session') {
      // exercises already loaded, session starts
    }
    prevPhase.current = agent.appPhase
  }, [agent.appPhase])

  const handleFile = useCallback(async (file: File) => {
    setUploadPhase('uploading')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.exercises?.length > 0) {
        setPendingExercises(data.exercises)
        setShowModeModal(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploadPhase('idle')
    }
  }, [])

  const handleSample = useCallback(async () => {
    setUploadPhase('uploading')
    try {
      const res = await fetch('/api/sample')
      const data = await res.json()
      if (res.ok && data.exercises?.length > 0) {
        setPendingExercises(data.exercises)
        setShowModeModal(true)
      }
    } finally {
      setUploadPhase('idle')
    }
  }, [])

  const handleModeSelect = useCallback((mode: SessionMode) => {
    if (pendingExercises) {
      agent.loadExercises(pendingExercises, mode)
      setPendingExercises(null)
      setShowModeModal(false)
    }
  }, [pendingExercises, agent])

  // ── Render states ─────────────────────────────────
  if (agent.appPhase === 'searching') {
    return <SearchingScreen query={agent.searchQuery} />
  }

  if (agent.appPhase === 'complete') {
    return (
      <CompletionScreen
        onRestart={agent.restartSession}
        onExit={agent.goToBrowse}
      />
    )
  }

  if (agent.appPhase === 'session' && agent.exercises.length > 0) {
    return (
      <SessionView
        exercises={agent.exercises}
        currentIdx={agent.currentIdx}
        sessionMode={agent.sessionMode}
        voiceState={agent.voiceState}
        audioLevel={agent.audioLevel}
        transcript={agent.transcript}
        partialTranscript={agent.partialTranscript}
        responseText={agent.responseText}
        onAdvance={agent.advanceExercise}
        onRestart={agent.restartSession}
        onExit={agent.goToBrowse}
        onStartListening={agent.startListening}
      />
    )
  }

  // ── Browse / Landing ──────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(108,107,250,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,107,250,0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-indigo-400 tracking-tight">Steplet</span>
          <span className="text-[10px] font-semibold text-gray-600 border border-white/10 px-1.5 py-0.5 rounded-full">PT Coach</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSample}
            disabled={uploadPhase === 'uploading'}
            className="text-xs font-semibold text-gray-500 hover:text-indigo-400 transition-colors"
          >
            Try demo
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">
        {/* Hero text */}
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Your AI{' '}
            <span className="text-indigo-400">PT coach</span>
            {' '}is listening
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Say an exercise — like <span className="text-gray-200 italic">"hamstring stretch"</span> or <span className="text-gray-200 italic">"shoulder exercises"</span> — and I'll guide you through it.
          </p>
        </div>

        {/* Orb */}
        <VoiceOrb
          state={agent.voiceState}
          audioLevel={agent.audioLevel}
          size="lg"
          onTap={agent.voiceState === 'dormant' ? agent.startListening : undefined}
          showLabel
        />

        {/* Transcript */}
        {(agent.transcript || agent.partialTranscript || agent.responseText) && (
          <div className="w-full max-w-sm space-y-2">
            {(agent.transcript || agent.partialTranscript) && (
              <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-2xl px-4 py-3 text-right">
                <p className="text-sm text-indigo-200">{agent.transcript || agent.partialTranscript}</p>
              </div>
            )}
            {agent.responseText && (
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-sm text-gray-200 leading-relaxed">{agent.responseText}</p>
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        {agent.voiceState === 'dormant' && (
          <p className="text-xs text-gray-600 tracking-wide">Tap the orb to activate voice</p>
        )}
        {agent.voiceState === 'listening' && !agent.transcript && !agent.partialTranscript && (
          <p className="text-xs text-gray-500">Just speak naturally</p>
        )}

        {/* Divider */}
        <div className="w-full max-w-sm flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs font-medium text-gray-600">or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Upload */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhase === 'uploading'}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 border border-white/10 hover:border-indigo-500/50 bg-white/3 hover:bg-indigo-600/10 rounded-2xl text-sm font-semibold text-gray-300 hover:text-white transition-all"
          >
            {uploadPhase === 'uploading' ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload PT prescription
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Error */}
        {agent.error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
            {agent.error}
          </div>
        )}
      </main>

      {/* Mode selector modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">How do you want to go?</h2>
              <p className="text-sm text-gray-400 mt-1">
                {pendingExercises?.length} exercise{pendingExercises?.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleModeSelect('step-by-step')}
                className="w-full text-left p-4 rounded-2xl border border-indigo-500/40 bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors"
              >
                <div className="font-semibold text-white text-sm">Step by step</div>
                <div className="text-xs text-gray-400 mt-0.5">Coach waits for you to say "done" between each exercise</div>
              </button>
              <button
                onClick={() => handleModeSelect('all-at-once')}
                className="w-full text-left p-4 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/8 transition-colors"
              >
                <div className="font-semibold text-white text-sm">All at once</div>
                <div className="text-xs text-gray-400 mt-0.5">Advance manually through exercises, coach available any time</div>
              </button>
            </div>
            <button
              onClick={() => { setShowModeModal(false); setPendingExercises(null) }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
