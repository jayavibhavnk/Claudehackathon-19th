'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseResult {
  landmarks: PoseLandmark[]
  worldLandmarks: PoseLandmark[]
}

// MediaPipe Pose connection pairs for drawing skeleton
export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
]

export function usePose(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const streamRef = useRef<MediaStream | null>(null)

  const [ready, setReady] = useState(false)
  const [poseResult, setPoseResult] = useState<PoseResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const drawPose = useCallback((result: PoseResult, canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (result.landmarks.length === 0) return

    const lm = result.landmarks

    // Draw connections
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'
    ctx.lineWidth = 2.5
    for (const [a, b] of POSE_CONNECTIONS) {
      if (!lm[a] || !lm[b]) continue
      if ((lm[a].visibility ?? 1) < 0.3 || (lm[b].visibility ?? 1) < 0.3) continue
      ctx.beginPath()
      ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height)
      ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height)
      ctx.stroke()
    }

    // Draw joints
    for (let i = 0; i < lm.length; i++) {
      if ((lm[i].visibility ?? 1) < 0.3) continue
      const x = lm[i].x * canvas.width
      const y = lm[i].y * canvas.height

      ctx.beginPath()
      ctx.arc(x, y, i < 11 ? 3 : 4, 0, Math.PI * 2)
      ctx.fillStyle = i < 11 ? 'rgba(167, 139, 250, 0.9)' : 'rgba(99, 102, 241, 1)'
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function init() {
      try {
        // Dynamically import to avoid SSR issues
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        )

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        if (cancelled) { landmarker.close(); return }
        landmarkerRef.current = landmarker

        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setReady(true)

        // Detection loop
        const detect = () => {
          if (cancelled) return
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || !landmarkerRef.current) {
            animFrameRef.current = requestAnimationFrame(detect)
            return
          }

          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime
            const results = landmarkerRef.current.detectForVideo(video, performance.now())
            if (results.landmarks?.length > 0) {
              const result: PoseResult = {
                landmarks: results.landmarks[0],
                worldLandmarks: results.worldLandmarks?.[0] ?? [],
              }
              setPoseResult(result)
              drawPose(result, canvas, video)
            } else {
              setPoseResult(null)
              canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
            }
          }

          animFrameRef.current = requestAnimationFrame(detect)
        }

        detect()
      } catch (err) {
        if (!cancelled) {
          setCameraError(err instanceof Error ? err.message : 'Camera error')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setReady(false)
      setPoseResult(null)
    }
  }, [enabled, drawPose])

  return { videoRef, canvasRef, ready, poseResult, cameraError }
}
