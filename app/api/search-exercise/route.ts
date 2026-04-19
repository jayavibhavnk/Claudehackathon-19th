import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PTExerciseSchema, type PTExercise } from '@/lib/schemas/pt-exercise'
import { ExerciseAnimationSchema, type ExerciseAnimationData } from '@/lib/schemas/pose'
import { generateExerciseAnimation } from '@/lib/claude/extract-pt'

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

async function extractFromImageUrl(imageUrl: string, exerciseName: string): Promise<PTExercise[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: `Extract PT exercise details for: "${exerciseName}". Return JSON only.`,
            },
          ],
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text.trim() : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    const exercises: PTExercise[] = []
    for (const item of parsed.exercises ?? []) {
      const r = PTExerciseSchema.safeParse(item)
      if (r.success) exercises.push(r.data)
    }
    return exercises.length > 0 ? exercises : null
  } catch {
    return null
  }
}

async function generateFromName(exerciseName: string): Promise<PTExercise[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a PT exercise prescription for: "${exerciseName}". Return JSON only.`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text.trim() : ''
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

export async function POST(req: NextRequest) {
  const { query } = await req.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 })
  }

  // Try Tavily image search → Claude vision first
  const imageUrls = await searchTavilyImages(query)
  let exercises: PTExercise[] = []

  for (const url of imageUrls) {
    const result = await extractFromImageUrl(url, query)
    if (result && result.length > 0) {
      exercises = result
      break
    }
  }

  // Fall back to text-only generation
  if (exercises.length === 0) {
    exercises = await generateFromName(query)
  }

  if (exercises.length === 0) {
    return NextResponse.json({ error: 'Could not find exercises for that query' }, { status: 404 })
  }

  // Generate animations in parallel
  const animationResults = await Promise.all(exercises.map(e => generateExerciseAnimation(e)))

  const result = exercises.map((exercise, i) => ({
    exercise,
    animation: animationResults[i].success ? animationResults[i].animation : null,
    animationError: animationResults[i].success ? undefined : animationResults[i].error,
  }))

  return NextResponse.json({ exercises: result })
}
