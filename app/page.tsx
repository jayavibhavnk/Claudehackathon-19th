'use client'

import { useState, useCallback, useRef } from 'react'
import { useVoiceAgent } from '@/hooks/useVoiceAgent'
import { VoiceOrb } from '@/components/VoiceOrb'
import { SessionView } from '@/components/SessionView'
import type { ExerciseResult, SessionMode } from '@/hooks/useVoiceAgent'

type UploadPhase = 'idle' | 'uploading'

// ── Searching ─────────────────────────────────────────────────────────────────
function SearchingScreen({ query }: { query: string | null }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 px-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
          <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full animate-glow-breathe"
          style={{ background: 'radial-gradient(circle, rgba(108,107,250,0.2) 0%, transparent 70%)' }} />
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-semibold text-xl tracking-tight">Finding exercises...</p>
        {query && (
          <p className="text-indigo-400 text-sm font-medium">
            &ldquo;{query}&rdquo;
          </p>
        )}
        <p className="text-gray-500 text-xs">Searching Tavily + Claude vision</p>
      </div>
    </div>
  )
}

// ── Completion ────────────────────────────────────────────────────────────────
function CompletionScreen({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-10 px-4">
      <div className="text-center space-y-5 animate-slide-up">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full animate-glow-breathe"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 70%)' }} />
          <div className="relative w-24 h-24 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Session complete!</h1>
          <p className="text-gray-400 text-base">Great work. You finished all your exercises.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="flex-1 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-colors"
        >
          Do it again
        </button>
        <button
          onClick={onExit}
          className="flex-1 py-3.5 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
        >
          New session
        </button>
      </div>
    </div>
  )
}

// ── Feature chip ──────────────────────────────────────────────────────────────
function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1.5">
      <span className="text-indigo-400">{icon}</span>
      <span className="text-xs font-medium text-gray-400">{label}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const agent = useVoiceAgent()
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [showModeModal, setShowModeModal] = useState(false)
  const [pendingExercises, setPendingExercises] = useState<ExerciseResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ── Phase routing ──────────────────────────────────
  if (agent.appPhase === 'searching') return <SearchingScreen query={agent.searchQuery} />
  if (agent.appPhase === 'complete') return <CompletionScreen onRestart={agent.restartSession} onExit={agent.goToBrowse} />
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
        speakFn={agent.speakText}
      />
    )
  }

  const isActive = agent.voiceState !== 'dormant'

  // ── Landing ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-glow-breathe"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
        <div className="absolute -bottom-48 -left-24 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl animate-glow-breathe"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="11" rx="3" fill="white" />
              <path d="M5 10a7 7 0 0 0 14 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="9" y1="21" x2="15" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">Steplet</span>
          <span className="hidden sm:block text-[10px] font-semibold text-gray-600 border border-white/10 px-2 py-0.5 rounded-full">AI PT Coach</span>
        </div>
        <button
          onClick={handleSample}
          disabled={uploadPhase === 'uploading'}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/8 rounded-full px-3.5 py-2 transition-all disabled:opacity-50"
        >
          {uploadPhase === 'uploading'
            ? <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
          Try demo
        </button>
      </header>

      {/* Main hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8 gap-8">

        {/* Headline */}
        <div className="text-center space-y-3 max-w-md animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-indigo-400 tracking-[0.2em] uppercase">AI Physical Therapy</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Your PT coach,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #6c6bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              listening.
            </span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
            Say an exercise — like <em className="text-gray-300 not-italic font-medium">"hamstring stretch"</em> or <em className="text-gray-300 not-italic font-medium">"shoulder PT"</em> — and get guided through it.
          </p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>} label="Voice-first" />
          <Chip icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="22" x2="12" y2="14"/><line x1="15" y1="22" x2="12" y2="14"/><line x1="9" y1="14" x2="6" y2="18"/><line x1="15" y1="14" x2="18" y2="18"/></svg>} label="Pose tracking" />
          <Chip icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>} label="AI coaching" />
          <Chip icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="Upload scripts" />
        </div>

        {/* Orb + glow */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Ambient orb glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none animate-glow-breathe"
            style={{ background: 'radial-gradient(circle, rgba(108,107,250,0.12) 0%, transparent 70%)' }} />

          <div className="animate-float">
            <VoiceOrb
              state={agent.voiceState}
              audioLevel={agent.audioLevel}
              size="lg"
              onTap={agent.voiceState === 'dormant' ? agent.startListening : undefined}
              showLabel
            />
          </div>
        </div>

        {/* Transcript / response */}
        {(agent.transcript || agent.partialTranscript || agent.responseText) && (
          <div className="w-full max-w-sm space-y-2 animate-fade-in-up">
            {(agent.transcript || agent.partialTranscript) && (
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl px-4 py-3 text-right">
                <p className="text-sm text-indigo-200 leading-relaxed">
                  {agent.transcript || agent.partialTranscript}
                </p>
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
        {!isActive && !agent.transcript && !agent.responseText && (
          <p className="text-xs text-gray-600 tracking-wide animate-fade-in-up">
            Tap the orb to activate voice
          </p>
        )}
        {agent.voiceState === 'listening' && !agent.transcript && !agent.partialTranscript && (
          <p className="text-xs text-indigo-400/70 animate-fade-in-up">Just speak naturally...</p>
        )}

        {/* Divider */}
        <div className="w-full max-w-xs flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07))' }} />
          <span className="text-xs font-medium text-gray-600">or</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.07))' }} />
        </div>

        {/* Upload */}
        <div className="w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhase === 'uploading'}
            className="w-full group flex items-center justify-center gap-2.5 py-4 border border-dashed border-white/12 hover:border-indigo-500/50 bg-white/2 hover:bg-indigo-600/8 rounded-2xl text-sm font-semibold text-gray-400 hover:text-indigo-300 transition-all duration-200"
          >
            {uploadPhase === 'uploading' ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Upload PT prescription
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-gray-600 mt-2">PDF or image · up to 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

      </main>

      {/* Error toast */}
      {agent.error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/20 border border-red-500/30 rounded-2xl px-5 py-3 text-sm text-red-400 backdrop-blur-sm animate-fade-in-up z-50 max-w-sm text-center">
          {agent.error}
        </div>
      )}

      {/* Mode selector modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900/95 border border-white/10 rounded-3xl p-6 space-y-5 animate-slide-up shadow-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {pendingExercises?.length} exercise{pendingExercises?.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">How do you want to go?</h2>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleModeSelect('step-by-step')}
                className="w-full text-left p-4 rounded-2xl border border-indigo-500/40 bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Step by step</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">Coach waits for you to say <span className="text-indigo-400">"done"</span> before advancing</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleModeSelect('all-at-once')}
                className="w-full text-left p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/8 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">All at once</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">Advance manually, coach available any time via voice</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => { setShowModeModal(false); setPendingExercises(null) }}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors rounded-xl hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
