import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

import { PTExerciseSchema, type PTExercise } from '@/lib/schemas/pt-exercise'
import { ExerciseAnimationSchema, type ExerciseAnimationData } from '@/lib/schemas/pose'

const EXTRACTION_PROMPT = `You are a physical therapy exercise expert. Based on the exercise name provided, generate a complete PT exercise prescription in structured JSON.

Return ONLY valid JSON with this exact schema:
{
  "exercises": [
    {
      "step_number": 1,
      "name": "<exercise name>",
      "reps": "<string or null>",
      "sets": "<string or null>",
      "duration_seconds": <number or null>,
      "position": "<seated|standing|lying_supine|lying_prone|side_lying|other>",
      "primary_body_parts": ["<body part>"],
      "form_cues": ["<instruction>"],
      "equipment": [],
      "bilateral": <boolean>
    }
  ]
}

Be specific with form cues — include 3-5 clear, practical instructions. Generate 1-3 exercises that make sense for the described exercise or body part.`

async function anthropicCall(system: string, messages: string[], imageUrl?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  const content: object[] = imageUrl
    ? [{ type: 'image', source: { type: 'url', url: imageUrl } }, { type: 'text', text: messages[0] }]
    : [{ type: 'text', text: messages[0] }]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

async function searchTavilyImages(query: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} physical therapy exercise instructions`,
        search_depth: 'basic',
        include_images: true,
        max_results: 5,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.images || []).slice(0, 3)
  } catch {
    return []
  }
}

function parseExercises(raw: string): PTExercise[] {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    const exercises: PTExercise[] = []
    for (const item of parsed.exercises ?? []) {
      const r = PTExerciseSchema.safeParse(item)
      if (r.success) exercises.push(r.data)
    }
    return exercises
  } catch {
    return []
  }
}

async function generateAnimation(exercise: PTExercise): Promise<ExerciseAnimationData | null> {
  const ANIM_SYSTEM = `You are a physical therapy animation keyframe generator. Given a PT exercise, output JSON animation keyframes for a stick figure skeleton.

Output schema (valid JSON only, no prose, no code fences):
{
  "keyframes": [
    { "time": 0, "pose": { "root_x": 400, "root_y": 290 } },
    { "time": 0.5, "pose": { "root_x": 400, "root_y": 290 } },
    { "time": 1, "pose": { "root_x": 400, "root_y": 290 } }
  ],
  "label": "<Exercise name>",
  "highlightParts": ["<muscle: hamstring|quad|calf|glute|hip_flexor|knee|shoulder|bicep|tricep|back|core|chest>"],
  "supportObject": <"chair"|"bench"|"floor"|"wall"|null>
}

Rules: 3-5 keyframes, first and last identical for seamless loop. Only include joints that change. root_y: 290 standing, 355 seated.`

  const prompt = `Generate animation for: ${exercise.name} (${exercise.position}, ${exercise.primary_body_parts.join(', ')}). Form cues: ${exercise.form_cues.slice(0, 3).join('; ')}`

  try {
    const raw = await anthropicCall(ANIM_SYSTEM, [prompt])
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const result = ExerciseAnimationSchema.safeParse(JSON.parse(cleaned))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'No query provided' }, { status: 400 })

  // Try Tavily images → Claude vision, fallback to text generation
  const imageUrls = await searchTavilyImages(query)
  let exercises: PTExercise[] = []

  for (const url of imageUrls) {
    try {
      const raw = await anthropicCall(EXTRACTION_PROMPT, [`Extract PT exercises for: "${query}". JSON only.`], url)
      exercises = parseExercises(raw)
      if (exercises.length > 0) break
    } catch { /* try next image */ }
  }

  if (exercises.length === 0) {
    try {
      const raw = await anthropicCall(EXTRACTION_PROMPT, [`Generate PT exercise prescription for: "${query}". JSON only.`])
      exercises = parseExercises(raw)
    } catch { /* fall through */ }
  }

  if (exercises.length === 0) {
    return NextResponse.json({ error: 'Could not find exercises for that query' }, { status: 404 })
  }

  const animations = await Promise.all(exercises.map(e => generateAnimation(e)))
  const result = exercises.map((exercise, i) => ({ exercise, animation: animations[i] }))

  return NextResponse.json({ exercises: result })
}
