'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { ExerciseResult, SessionMode, VoiceState } from '@/hooks/useVoiceAgent'
import { VoiceOrb } from '@/components/VoiceOrb'
import { PoseCamera } from '@/components/PoseCamera'
import type { ExerciseAnimationData } from '@/lib/schemas/pose'
import { DEMO_ANIMATIONS } from '@/lib/demoFallback'
import type { PTExercise } from '@/lib/schemas/pt-exercise'


const Player = dynamic(
  () => import('@remotion/player').then(m => ({ default: m.Player })),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-800 animate-pulse" /> }
)

function RemotionPlayer({ animData, exerciseName, idx }: {
  animData: ExerciseAnimationData
  exerciseName: string
  idx: number
}) {
  // Lazy-require avoids SSR issues with Remotion internals
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ExerciseAnimation } = require('@/remotion/compositions/ExerciseAnimation')
  const inputProps = {
    keyframes: animData.keyframes,
    durationSeconds: 3,
    label: animData.label || exerciseName,
    highlightParts: animData.highlightParts,
    supportObject: animData.supportObject,
  }
  return (
    <Player
      key={`${idx}-${exerciseName}`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={ExerciseAnimation as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputProps={inputProps as any}
      durationInFrames={90}
      compositionWidth={800}
      compositionHeight={600}
      fps={30}
      style={{ width: '100%', height: '100%' }}
      loop
      autoPlay
      clickToPlay={false}
    />
  )
}

interface SessionViewProps {
  exercises: ExerciseResult[]
  currentIdx: number
  sessionMode: SessionMode
  voiceState: VoiceState
  audioLevel: number
  transcript: string
  partialTranscript: string
  responseText: string
  onAdvance: () => void
  onRestart: () => void
  onExit: () => void
  onStartListening: () => void
}

export function SessionView({
  exercises,
  currentIdx,
  sessionMode,
  voiceState,
  audioLevel,
  transcript,
  partialTranscript,
  responseText,
  onAdvance,
  onRestart,
  onExit,
  onStartListening,
}: SessionViewProps) {
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const current = exercises[currentIdx]

  if (!current) return null

  const { exercise, animation } = current
  const total = exercises.length
  const isLast = currentIdx === total - 1

  // Use demo fallback if no animation
  const animData = animation ?? DEMO_ANIMATIONS[exercise.position] ?? DEMO_ANIMATIONS['standing']

  const displayText = responseText || (transcript || partialTranscript
    ? (transcript || partialTranscript)
    : null)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {exercises.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentIdx ? 20 : 6,
                  height: 6,
                  background: i < currentIdx
                    ? '#6c6bfa'
                    : i === currentIdx
                      ? '#6c6bfa'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="w-20" />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left: Animation + info */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Exercise title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-indigo-400 tracking-widest uppercase">
                Exercise {currentIdx + 1} of {total}
              </span>
              {sessionMode === 'step-by-step' && (
                <span className="text-[10px] text-gray-500 border border-white/10 rounded-full px-2 py-0.5">Step by step</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{exercise.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {exercise.reps && (
                <StatChip label="Reps" value={exercise.reps} />
              )}
              {exercise.sets && (
                <StatChip label="Sets" value={exercise.sets} />
              )}
              {exercise.duration_seconds && (
                <StatChip label="Hold" value={`${exercise.duration_seconds}s`} />
              )}
              {exercise.bilateral && (
                <span className="text-[10px] font-medium text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded-full">Both sides</span>
              )}
            </div>
          </div>

          {/* Remotion animation */}
          <div className="rounded-2xl overflow-hidden bg-gray-900 border border-white/5" style={{ aspectRatio: '4/3' }}>
            <RemotionPlayer animData={animData} exerciseName={exercise.name} idx={currentIdx} />
          </div>

          {/* Form cues */}
          {exercise.form_cues.length > 0 && (
            <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Form cues</p>
              <ul className="space-y-2">
                {exercise.form_cues.map((cue, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-indigo-400">{i + 1}</span>
                    </div>
                    <span className="text-sm text-gray-300 leading-relaxed">{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Camera + Voice */}
        <div className="lg:w-80 xl:w-96 flex flex-col gap-4">
          {/* Camera toggle card */}
          {!cameraEnabled ? (
            <button
              onClick={() => setCameraEnabled(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-indigo-500/40 bg-indigo-600/5 hover:bg-indigo-600/10 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-300">Enable pose tracking</p>
                <p className="text-xs text-gray-500 mt-0.5">Camera + MediaPipe skeleton overlay</p>
              </div>
            </button>
          ) : (
            <div className="relative" style={{ aspectRatio: '4/3' }}>
              <PoseCamera enabled={cameraEnabled} className="w-full h-full" />
              <button
                onClick={() => setCameraEnabled(false)}
                className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-xs text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-colors"
              >
                Hide
              </button>
            </div>
          )}

          {/* Voice orb card */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex flex-col items-center gap-4">
            <VoiceOrb
              state={voiceState}
              audioLevel={audioLevel}
              size="md"
              onTap={voiceState === 'dormant' ? onStartListening : undefined}
            />

            {/* Transcript / response */}
            {displayText && (
              <div className="w-full">
                <p className={`text-sm text-center leading-relaxed ${
                  voiceState === 'speaking' ? 'text-green-300' : 'text-gray-300'
                }`}>
                  {displayText}
                </p>
              </div>
            )}

            {!displayText && voiceState === 'listening' && (
              <p className="text-xs text-center text-gray-500">
                Say <span className="text-indigo-400 font-medium">"done"</span> to advance,{' '}
                <span className="text-indigo-400 font-medium">"repeat"</span> to redo
              </p>
            )}
          </div>

          {/* Manual controls */}
          <div className="flex gap-2">
            <button
              onClick={onRestart}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              ↺ Repeat
            </button>
            <button
              onClick={onAdvance}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
            >
              {isLast ? 'Finish ✓' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  )
}
