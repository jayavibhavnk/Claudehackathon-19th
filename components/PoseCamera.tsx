'use client'

import { useEffect, useRef, useState } from 'react'
import { usePose } from '@/hooks/usePose'
import { usePoseAnalysis } from '@/hooks/usePoseAnalysis'

interface PoseCameraProps {
  enabled: boolean
  className?: string
  exercisePosition?: string
  onRepComplete?: (count: number) => void
  speakFn?: (text: string) => void
}

export function PoseCamera({
  enabled,
  className = '',
  exercisePosition = 'standing',
  onRepComplete,
  speakFn,
}: PoseCameraProps) {
  const { videoRef, canvasRef, ready, poseResult, cameraError, setDrawOptions } = usePose(enabled)
  const [displayMetrics, setDisplayMetrics] = useState({ repCount: 0, formScore: 50, feedbackText: '' })
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onFeedback = (text: string) => {
    setDisplayMetrics(prev => ({ ...prev, feedbackText: text }))
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      setDisplayMetrics(prev => ({ ...prev, feedbackText: '' }))
    }, 5000)
  }

  const onRep = (count: number) => {
    setDisplayMetrics(prev => ({ ...prev, repCount: count }))
    onRepComplete?.(count)
  }

  const { getMetrics } = usePoseAnalysis(poseResult, {
    exercisePosition,
    onRepComplete: onRep,
    onFeedback,
    speakFn,
  })

  // Sync joint colors to canvas draw options
  useEffect(() => {
    const metrics = getMetrics()
    setDisplayMetrics(prev => ({ ...prev, formScore: metrics.formScore }))
    setDrawOptions({ jointStatus: metrics.jointStatus })
  }, [poseResult, getMetrics, setDrawOptions])

  if (!enabled) return null

  const { repCount, formScore, feedbackText } = displayMetrics
  const scoreColor = formScore >= 80 ? '#4ade80' : formScore >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gray-900 ${className}`}>
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
        autoPlay
      />

      {/* Pose skeleton overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full scale-x-[-1]"
        style={{ objectFit: 'cover' }}
      />

      {/* Loading overlay */}
      {!ready && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-xs text-gray-400 tracking-wide">Starting camera...</p>
        </div>
      )}

      {/* Error state */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 gap-2 p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M23 7l-7 5 7 5V7z" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="1" y="5" width="15" height="14" rx="2" stroke="#f87171" strokeWidth="1.5" />
              <line x1="1" y1="1" x2="23" y2="23" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-xs text-red-400">Camera unavailable</p>
          <p className="text-[10px] text-gray-500">{cameraError}</p>
        </div>
      )}

      {ready && (
        <>
          {/* Live badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-white tracking-wide uppercase">Live</span>
          </div>

          {/* Rep counter */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reps</span>
            <span className="text-2xl font-bold text-white leading-none">{repCount}</span>
          </div>

          {/* Form score bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Form</span>
              <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{formScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${formScore}%`, background: scoreColor }}
              />
            </div>
          </div>
        </>
      )}

      {/* Feedback bubble */}
      {feedbackText && ready && (
        <div className="absolute bottom-14 left-3 right-3 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 animate-fade-in-up">
          <p className="text-xs text-white leading-relaxed">{feedbackText}</p>
        </div>
      )}
    </div>
  )
}
