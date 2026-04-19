import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 15

// MediaPipe landmark indices for reference (sent to Claude in prompt)
const LANDMARK_MAP = `
MediaPipe Pose landmark indices (use these numbers):
0=nose, 11=left_shoulder, 12=right_shoulder,
13=left_elbow, 14=right_elbow, 15=left_wrist, 16=right_wrist,
23=left_hip, 24=right_hip, 25=left_knee, 26=right_knee,
27=left_ankle, 28=right_ankle`

export async function POST(req: NextRequest) {
  const { exerciseName, position, primaryBodyParts, formCues } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json(null)

  const prompt = `${LANDMARK_MAP}

Exercise: "${exerciseName}"
Position: ${position}
Body parts targeted: ${primaryBodyParts?.join(', ') ?? 'unknown'}
Form cues: ${formCues?.join('; ') ?? 'none'}

Return a JSON object with MediaPipe tracking rules for this specific exercise. Choose the most relevant joint angle for rep counting.

{
  "repAngle": { "a": <landmark_idx>, "b": <landmark_idx>, "c": <landmark_idx> },
  "restAngle": <degrees when at rest, 0-180>,
  "peakAngle": <degrees at full movement range, 0-180>,
  "goodFormAngle": <angle that represents excellent form>,
  "inverted": <true if lower angle = more movement, false if higher angle = more movement>,
  "keyJoints": [<landmark indices to highlight on skeleton, max 8>],
  "tip": "<one specific form cue tied to this angle, e.g. keep knee behind toe>"
}

Rules:
- repAngle.b is the JOINT being measured (middle point)
- For knee exercises: a=hip, b=knee, c=ankle
- For shoulder/elbow: a=shoulder, b=elbow, c=wrist
- For hip hinge: a=shoulder, b=hip, c=knee
- restAngle and peakAngle must differ by at least 30 degrees
- Return valid JSON only, no prose`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return NextResponse.json(null)
    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const rules = JSON.parse(cleaned)
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json(null)
  }
}
