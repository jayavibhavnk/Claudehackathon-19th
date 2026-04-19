import { NextRequest, NextResponse } from 'next/server'
import type { PTExercise } from '@/lib/schemas/pt-exercise'

export const runtime = 'nodejs'
export const maxDuration = 30

function buildSystemPrompt(session: SessionContext | null): string {
  const base = `You are Coach, an encouraging physical therapy voice assistant for Steplet. You speak naturally and concisely.

VOICE RULES (critical):
- Max 2 sentences, never exceed 35 words
- No markdown, bullets, or headers — speak naturally
- Be warm, motivating, and direct
- Vary sentence starters — never begin with "I"
- No filler phrases like "Great question!" or "Certainly!"`

  if (!session || session.phase === 'browse') {
    return `${base}

You help users find and start exercises. When the user mentions wanting to do an exercise or describes a body part to work on, respond enthusiastically and confirm what you're searching for. End your response with [SEARCH:<exercise name>] using the clearest exercise name.

Example: User says "I want to stretch my hamstrings" → respond "Let's get those hamstrings loosened up! Looking that up for you now. [SEARCH:hamstring stretch]"

If asked about the app: explain users can speak exercise names or upload PT sheets.`
  }

  const { exercises, currentIdx, mode } = session
  const current = exercises[currentIdx]
  const total = exercises.length
  const isLast = currentIdx === total - 1

  const exerciseList = exercises.map((e, i) =>
    `${i + 1}. ${e.name} — ${e.reps ?? '?'} reps × ${e.sets ?? '?'} sets — ${e.form_cues.slice(0, 2).join('; ')}`
  ).join('\n')

  return `${base}

SESSION CONTEXT:
Mode: ${mode === 'step-by-step' ? 'Step-by-step (wait for user acknowledgment)' : 'All-at-once'}
Exercise ${currentIdx + 1} of ${total}: ${current.name}
Reps: ${current.reps ?? 'not specified'} | Sets: ${current.sets ?? 'not specified'}${current.duration_seconds ? ` | Hold: ${current.duration_seconds}s` : ''}
Position: ${current.position}
Form cues: ${current.form_cues.join('; ')}
Body parts: ${current.primary_body_parts.join(', ')}

Full plan:
${exerciseList}

ACTION COMMANDS — append to end of response when appropriate:
[NEXT] — user says done/finished/next/yes/continue → advance to next exercise
[REPEAT] — user says repeat/again/redo → restart current
[COMPLETE] — use instead of [NEXT] on the last exercise (${isLast ? 'THIS IS THE LAST' : `exercise ${total} is last`})

${isLast ? 'This is the FINAL exercise — use [COMPLETE] instead of [NEXT] when done.' : ''}`
}

interface SessionContext {
  phase: 'browse' | 'session'
  exercises: PTExercise[]
  currentIdx: number
  mode: 'step-by-step' | 'all-at-once'
}

export async function POST(req: NextRequest) {
  try {
    const { messages, session } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return new NextResponse('Missing API key', { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: buildSystemPrompt(session ?? null),
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[/api/voice] Anthropic error:', err)
      return new NextResponse(err, { status: 500 })
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/voice]', msg)
    return new NextResponse(msg, { status: 500 })
  }
}
