'use client'

import { usePose } from '@/hooks/usePose'

interface PoseCameraProps {
  enabled: boolean
  className?: string
}

export function PoseCamera({ enabled, className = '' }: PoseCameraProps) {
  const { videoRef, canvasRef, ready, cameraError } = usePose(enabled)

  if (!enabled) return null

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

      {/* Pose overlay — mirror flip too */}
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

      {/* Live badge */}
      {ready && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-white tracking-wide uppercase">Live</span>
        </div>
      )}

      {/* Pose label */}
      {ready && (
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="text-[10px] font-medium text-indigo-300 tracking-wide">Pose tracking active</span>
        </div>
      )}
    </div>
  )
}
