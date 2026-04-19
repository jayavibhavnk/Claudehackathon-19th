'use client'

import type { VoiceState } from '@/hooks/useVoiceAgent'

const ORB_COLORS: Record<VoiceState, string> = {
  dormant: '#3a3a5c',
  listening: '#6c6bfa',
  processing: '#a78bfa',
  speaking: '#4ade80',
  error: '#f87171',
}

const GLOW_COLORS: Record<VoiceState, string> = {
  dormant: 'rgba(58,58,92,0)',
  listening: 'rgba(108,107,250,0.4)',
  processing: 'rgba(167,139,250,0.4)',
  speaking: 'rgba(74,222,128,0.4)',
  error: 'rgba(248,113,113,0.4)',
}

const STATE_LABELS: Record<VoiceState, string> = {
  dormant: 'Tap to start',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  error: 'Error',
}

interface VoiceOrbProps {
  state: VoiceState
  audioLevel: number
  size?: 'sm' | 'md' | 'lg'
  onTap?: () => void
  showLabel?: boolean
}

export function VoiceOrb({ state, audioLevel, size = 'lg', onTap, showLabel = true }: VoiceOrbProps) {
  const sizes = { sm: 64, md: 96, lg: 140 }
  const orbSize = sizes[size]
  const containerSize = orbSize + 60

  const scale = state === 'listening' ? 1 + audioLevel * 0.25 : 1

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onTap}
        disabled={state === 'processing' || state === 'speaking'}
        className="relative flex items-center justify-center focus:outline-none"
        style={{ width: containerSize, height: containerSize }}
        aria-label={STATE_LABELS[state]}
      >
        {/* Pulse rings */}
        {state === 'listening' && (
          <>
            <div className="absolute rounded-full orb-ring" style={{ width: containerSize, height: containerSize, borderColor: ORB_COLORS.listening, animationDelay: '0s' }} />
            <div className="absolute rounded-full orb-ring" style={{ width: containerSize, height: containerSize, borderColor: ORB_COLORS.listening, animationDelay: '0.7s' }} />
          </>
        )}
        {state === 'speaking' && (
          <div className="absolute rounded-full orb-ring" style={{ width: containerSize, height: containerSize, borderColor: ORB_COLORS.speaking, animationDelay: '0s' }} />
        )}
        {state === 'processing' && (
          <div className="absolute rounded-full orb-spin" style={{ width: containerSize, height: containerSize, borderColor: ORB_COLORS.processing }} />
        )}

        {/* Core orb */}
        <div
          style={{
            width: orbSize,
            height: orbSize,
            borderRadius: '50%',
            background: ORB_COLORS[state],
            boxShadow: `0 0 ${orbSize * 0.4}px ${GLOW_COLORS[state]}, 0 0 ${orbSize * 0.8}px ${GLOW_COLORS[state]}`,
            transform: `scale(${scale})`,
            transition: 'transform 0.1s ease, background 0.4s ease, box-shadow 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state === 'listening' && <WaveformBars speed="normal" />}
          {state === 'speaking' && <WaveformBars speed="fast" />}
          {state === 'processing' && <ThinkingDots />}
          {state === 'dormant' && <MicIcon />}
          {state === 'error' && <ErrorIcon />}
        </div>
      </button>

      {showLabel && (
        <p className="text-sm font-medium tracking-widest uppercase transition-all duration-300"
          style={{ color: state === 'dormant' ? 'rgba(240,240,245,0.35)' : 'rgba(240,240,245,0.7)' }}>
          {STATE_LABELS[state]}
        </p>
      )}
    </div>
  )
}

function WaveformBars({ speed }: { speed: 'normal' | 'fast' }) {
  const durations = speed === 'fast'
    ? [0.35, 0.28, 0.42, 0.32, 0.38]
    : [0.55, 0.45, 0.65, 0.5, 0.6]

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 32 }}>
      {durations.map((d, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.9)',
            animation: `waveform ${d}s ease-in-out infinite`,
            animationDelay: `${i * 0.08}s`,
            height: 32,
          }}
        />
      ))}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            animation: 'thinking-dot 1.4s ease infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" fill="rgba(255,255,255,0.6)" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <line x1="12" y1="8" x2="12" y2="13" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="rgba(255,255,255,0.7)" />
    </svg>
  )
}
