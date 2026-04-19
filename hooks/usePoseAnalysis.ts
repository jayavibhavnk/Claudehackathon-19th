'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PoseResult } from './usePose'
import type { JointStatus } from './usePose'

export interface ExerciseRules {
  repAngle: { a: number; b: number; c: number }
  restAngle: number
  peakAngle: number
  goodFormAngle: number
  inverted: boolean
  keyJoints: number[]
  tip?: string
}

export interface PoseMetrics {
  repCount: number
  formScore: number
  jointStatus: Map<number, JointStatus>
  feedbackText: string
}

interface RepState {
  phase: 'rest' | 'moving' | 'peak'
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

// Normalize angle to 0-1 metric based on rules
function angleToMetric(angleDeg: number, rules: ExerciseRules): number {
  const { restAngle, peakAngle, inverted } = rules
  const range = Math.abs(peakAngle - restAngle)
  if (range < 5) return 0
  const progress = inverted
    ? (restAngle - angleDeg) / range
    : (angleDeg - restAngle) / range
  return Math.max(0, Math.min(1, progress))
}

function formScoreFromAngle(angleDeg: number, rules: ExerciseRules): number {
  const diff = Math.abs(angleDeg - rules.goodFormAngle)
  const range = Math.abs(rules.peakAngle - rules.restAngle)
  return Math.max(0, Math.min(100, Math.round(100 - (diff / range) * 120)))
}

function computeWithRules(
  lm: PoseResult['landmarks'],
  rules: ExerciseRules
): { metric: number; jointStatus: Map<number, JointStatus>; formScore: number } {
  const map = new Map<number, JointStatus>()
  const { a, b, c } = rules.repAngle

  const lmA = lm[a], lmB = lm[b], lmC = lm[c]
  if (!lmA || !lmB || !lmC || !vis(lmB)) {
    return { metric: 0, jointStatus: map, formScore: 50 }
  }

  const angleDeg = angle3(lmA, lmB, lmC)
  const metric = angleToMetric(angleDeg, rules)
  const formScore = formScoreFromAngle(angleDeg, rules)

  const status: JointStatus =
    formScore >= 75 ? 'good' : formScore >= 50 ? 'warn' : 'bad'

  for (const idx of rules.keyJoints) {
    map.set(idx, idx === b ? status : 'neutral')
  }
  map.set(b, status)

  return { metric, jointStatus: map, formScore }
}

// Fallback when rules haven't loaded yet
function computeFallback(
  lm: PoseResult['landmarks'],
  position: string
): { metric: number; jointStatus: Map<number, JointStatus>; formScore: number } {
  const map = new Map<number, JointStatus>()
  // Generic: track left knee angle
  const H = lm[23], K = lm[25], A = lm[27]
  if (H && K && A && vis(K)) {
    const a = angle3(H, K, A)
    const metric = 1 - a / 180
    const formScore = Math.min(100, Math.round(metric * 110))
    const status: JointStatus = formScore > 60 ? 'good' : 'neutral'
    map.set(25, status); map.set(23, 'neutral'); map.set(27, 'neutral')
    return { metric, jointStatus: map, formScore }
  }
  return { metric: 0, jointStatus: map, formScore: 50 }
}

export interface PoseAnalysisOptions {
  exerciseName: string
  exercisePosition: string
  primaryBodyParts?: string[]
  formCues?: string[]
  onRepComplete?: (count: number) => void
  onFeedback?: (text: string) => void
  speakFn?: (text: string) => void
}

export function usePoseAnalysis(poseResult: PoseResult | null, options: PoseAnalysisOptions) {
  const rulesRef = useRef<ExerciseRules | null>(null)
  const rulesLoadedRef = useRef(false)
  const repStateRef = useRef<RepState>({ phase: 'rest', smoothed: 0 })
  const repCountRef = useRef(0)
  const formScoreRef = useRef(50)
  const jointStatusRef = useRef<Map<number, JointStatus>>(new Map())
  const feedbackTextRef = useRef('')
  const lastFeedbackTimeRef = useRef(0)
  const feedbackCooldownRef = useRef(false)

  // Fetch exercise-specific rules from Claude once per exercise
  useEffect(() => {
    rulesLoadedRef.current = false
    rulesRef.current = null
    repCountRef.current = 0
    repStateRef.current = { phase: 'rest', smoothed: 0 }

    fetch('/api/exercise-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseName: options.exerciseName,
        position: options.exercisePosition,
        primaryBodyParts: options.primaryBodyParts,
        formCues: options.formCues,
      }),
    })
      .then(r => r.json())
      .then((rules: ExerciseRules | null) => {
        if (rules?.repAngle) {
          rulesRef.current = rules
        }
        rulesLoadedRef.current = true
      })
      .catch(() => { rulesLoadedRef.current = true })
  }, [options.exerciseName])

  const getMetrics = useCallback((): PoseMetrics => ({
    repCount: repCountRef.current,
    formScore: formScoreRef.current,
    jointStatus: new Map(jointStatusRef.current),
    feedbackText: feedbackTextRef.current,
  }), [])

  useEffect(() => {
    if (!poseResult || !poseResult.landmarks.length) return

    const { metric, jointStatus, formScore } = rulesRef.current
      ? computeWithRules(poseResult.landmarks, rulesRef.current)
      : computeFallback(poseResult.landmarks, options.exercisePosition)

    jointStatusRef.current = jointStatus
    formScoreRef.current = formScore

    // EMA smoothing
    const alpha = 0.7
    const smoothed = alpha * metric + (1 - alpha) * repStateRef.current.smoothed
    repStateRef.current.smoothed = smoothed

    // 3-phase rep counter — thresholds derived from metric range
    const { phase } = repStateRef.current
    const RISE = 0.30
    const PEAK = 0.60
    const FALL = 0.25

    if (phase === 'rest' && smoothed > RISE) {
      repStateRef.current.phase = 'moving'
    } else if (phase === 'moving' && smoothed > PEAK) {
      repStateRef.current.phase = 'peak'
    } else if (phase === 'peak' && smoothed < FALL) {
      repStateRef.current.phase = 'rest'
      repCountRef.current += 1
      options.onRepComplete?.(repCountRef.current)
    }

    // Periodic Claude audio feedback every 6s
    const now = Date.now()
    if (now - lastFeedbackTimeRef.current > 6000 && !feedbackCooldownRef.current && options.speakFn) {
      lastFeedbackTimeRef.current = now
      feedbackCooldownRef.current = true

      const tip = rulesRef.current?.tip
      fetch('/api/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercisePosition: options.exercisePosition,
          exerciseName: options.exerciseName,
          repCount: repCountRef.current,
          formScore: formScoreRef.current,
          tip,
        }),
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
        .finally(() => { feedbackCooldownRef.current = false })
    }
  }, [poseResult, options])

  return { getMetrics }
}
