'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PoseResult } from './usePose'
import type { JointStatus } from './usePose'

// MediaPipe landmark indices
const MP = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  LEFT_HIP_BK: 23,   RIGHT_HIP_BK: 24,
  NOSE: 0,
}

export interface PoseMetrics {
  repCount: number
  formScore: number          // 0–100
  jointStatus: Map<number, JointStatus>
  feedbackText: string
}

interface RepState {
  phase: 'rest' | 'moving' | 'peak'
  value: number              // smoothed angle or ratio driving the rep
  smoothed: number
}

function angle3(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const cross = Math.abs(ab.x * cb.y - ab.y * cb.x)
  return (Math.atan2(cross, dot) * 180) / Math.PI
}

function vis(lm: { visibility?: number }): boolean {
  return (lm.visibility ?? 1) > 0.4
}

// Compute the primary metric (0–1) and joint highlights for a given exercise position
function computeMetrics(
  lm: PoseResult['landmarks'],
  position: string
): { metric: number; jointStatus: Map<number, JointStatus>; formScore: number } {
  const map = new Map<number, JointStatus>()
  let metric = 0
  let formScore = 50

  // Helper: mark a set of joints with a status
  const mark = (status: JointStatus, ...indices: number[]) => {
    for (const i of indices) map.set(i, status)
  }

  if (position.includes('standing') || position.includes('quad') || position.includes('lunge')) {
    // Knee flexion is the primary metric
    const R = lm[MP.RIGHT_HIP], Rk = lm[MP.RIGHT_KNEE], Ra = lm[MP.RIGHT_ANKLE]
    const L = lm[MP.LEFT_HIP], Lk = lm[MP.LEFT_KNEE], La = lm[MP.LEFT_ANKLE]

    if (R && Rk && Ra && vis(Rk)) {
      const kneeAngle = angle3(R, Rk, Ra)
      metric = 1 - kneeAngle / 180         // 0 = straight, 1 = fully bent
      const status: JointStatus = kneeAngle < 70 ? 'good' : kneeAngle < 120 ? 'warn' : 'neutral'
      mark(status, MP.RIGHT_KNEE, MP.RIGHT_HIP, MP.RIGHT_ANKLE)
      formScore = Math.min(100, Math.round((1 - kneeAngle / 180) * 120))
    }
    if (L && Lk && La && vis(Lk)) {
      mark('neutral', MP.LEFT_KNEE, MP.LEFT_HIP, MP.LEFT_ANKLE)
    }
    // Check spine alignment
    const nose = lm[MP.NOSE], rHip = lm[MP.RIGHT_HIP]
    if (nose && rHip) {
      const lean = Math.abs(nose.x - rHip.x)
      if (lean > 0.15) mark('warn', MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER)
    }

  } else if (position.includes('hamstring') || position.includes('seated')) {
    // Hip hinge / knee extension
    const H = lm[MP.LEFT_HIP], K = lm[MP.LEFT_KNEE], A = lm[MP.LEFT_ANKLE]
    if (H && K && A && vis(K)) {
      const kneeAngle = angle3(H, K, A)
      metric = kneeAngle / 180             // seated: more extension = more metric
      const status: JointStatus = kneeAngle > 140 ? 'good' : kneeAngle > 100 ? 'warn' : 'neutral'
      mark(status, MP.LEFT_KNEE, MP.LEFT_HIP, MP.LEFT_ANKLE)
      formScore = Math.min(100, Math.round((kneeAngle / 180) * 110))
    }

  } else if (position.includes('shoulder') || position.includes('arm') || position.includes('rotation')) {
    // Elbow angle
    const LS = lm[MP.LEFT_SHOULDER], LE = lm[MP.LEFT_ELBOW], LW = lm[MP.LEFT_WRIST]
    const RS = lm[MP.RIGHT_SHOULDER], RE = lm[MP.RIGHT_ELBOW], RW = lm[MP.RIGHT_WRIST]
    if (LS && LE && LW && vis(LE)) {
      const elbow = angle3(LS, LE, LW)
      metric = 1 - elbow / 180
      const status: JointStatus = elbow < 100 ? 'good' : elbow < 140 ? 'warn' : 'neutral'
      mark(status, MP.LEFT_ELBOW, MP.LEFT_SHOULDER, MP.LEFT_WRIST)
      formScore = Math.min(100, Math.round((1 - elbow / 180) * 120))
    }
    if (RS && RE && RW && vis(RE)) {
      mark('neutral', MP.RIGHT_ELBOW, MP.RIGHT_SHOULDER, MP.RIGHT_WRIST)
    }

  } else if (position.includes('bird') || position.includes('dog') || position.includes('prone') || position.includes('floor')) {
    // Bird dog: arm + leg extension symmetry
    const RS = lm[MP.RIGHT_SHOULDER], RE = lm[MP.RIGHT_ELBOW], RW = lm[MP.RIGHT_WRIST]
    const LH = lm[MP.LEFT_HIP], LK = lm[MP.LEFT_KNEE], LA = lm[MP.LEFT_ANKLE]
    let score = 0; let count = 0
    if (RS && RE && RW && vis(RE)) {
      const a = angle3(RS, RE, RW)
      metric = 1 - a / 180
      score += metric * 100; count++
      mark(a < 140 ? 'good' : 'warn', MP.RIGHT_ELBOW, MP.RIGHT_SHOULDER, MP.RIGHT_WRIST)
    }
    if (LH && LK && LA && vis(LK)) {
      const a = angle3(LH, LK, LA)
      metric = (metric + a / 180) / 2
      score += (a / 180) * 100; count++
      mark(a > 140 ? 'good' : 'warn', MP.LEFT_KNEE, MP.LEFT_HIP, MP.LEFT_ANKLE)
    }
    if (count > 0) formScore = Math.min(100, Math.round(score / count))

  } else {
    // Generic: use hip-shoulder distance as proxy for engagement
    const LS = lm[MP.LEFT_SHOULDER], LH = lm[MP.LEFT_HIP]
    if (LS && LH) {
      const dy = Math.abs(LS.y - LH.y)
      metric = Math.min(1, dy * 2)
      formScore = Math.round(metric * 90 + 10)
    }
  }

  // Clamp
  formScore = Math.max(0, Math.min(100, formScore))
  metric = Math.max(0, Math.min(1, metric))
  return { metric, jointStatus: map, formScore }
}

export interface PoseAnalysisOptions {
  exercisePosition: string
  onRepComplete?: (count: number) => void
  onFeedback?: (text: string) => void
  speakFn?: (text: string) => void
}

export function usePoseAnalysis(poseResult: PoseResult | null, options: PoseAnalysisOptions) {
  const repStateRef = useRef<RepState>({ phase: 'rest', value: 0, smoothed: 0 })
  const repCountRef = useRef(0)
  const formScoreRef = useRef(50)
  const jointStatusRef = useRef<Map<number, JointStatus>>(new Map())
  const feedbackTextRef = useRef('')
  const lastFeedbackTimeRef = useRef(0)
  const feedbackCooldownRef = useRef(false)

  // Returns current snapshot
  const getMetrics = useCallback((): PoseMetrics => ({
    repCount: repCountRef.current,
    formScore: formScoreRef.current,
    jointStatus: new Map(jointStatusRef.current),
    feedbackText: feedbackTextRef.current,
  }), [])

  useEffect(() => {
    if (!poseResult || !poseResult.landmarks.length) return

    const { metric, jointStatus, formScore } = computeMetrics(
      poseResult.landmarks,
      options.exercisePosition
    )

    // Update refs
    jointStatusRef.current = jointStatus
    formScoreRef.current = formScore

    // EMA smoothing
    const alpha = 0.7
    const prev = repStateRef.current.smoothed
    const smoothed = alpha * metric + (1 - alpha) * prev
    repStateRef.current.smoothed = smoothed

    // 3-phase rep counter
    const { phase } = repStateRef.current
    const RISE_THRESH = 0.35
    const PEAK_THRESH = 0.60
    const FALL_THRESH = 0.30

    if (phase === 'rest' && smoothed > RISE_THRESH) {
      repStateRef.current.phase = 'moving'
    } else if (phase === 'moving' && smoothed > PEAK_THRESH) {
      repStateRef.current.phase = 'peak'
    } else if (phase === 'peak' && smoothed < FALL_THRESH) {
      repStateRef.current.phase = 'rest'
      repCountRef.current += 1
      options.onRepComplete?.(repCountRef.current)
    }

    // Periodic Claude feedback every 6 seconds
    const now = Date.now()
    if (
      now - lastFeedbackTimeRef.current > 6000 &&
      !feedbackCooldownRef.current &&
      options.speakFn
    ) {
      lastFeedbackTimeRef.current = now
      feedbackCooldownRef.current = true

      const reps = repCountRef.current
      const score = formScoreRef.current
      const pos = options.exercisePosition

      fetch('/api/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercisePosition: pos, repCount: reps, formScore: score }),
      })
        .then(r => r.json())
        .then((data: { feedback: string }) => {
          if (data.feedback) {
            feedbackTextRef.current = data.feedback
            options.onFeedback?.(data.feedback)
            options.speakFn!(data.feedback)
          }
        })
        .catch(() => {})
        .finally(() => {
          feedbackCooldownRef.current = false
        })
    }
  }, [poseResult, options])

  return { getMetrics }
}
