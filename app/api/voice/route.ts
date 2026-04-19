import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { PTExercise } from '@/lib/schemas/pt-exercise'

export const runtime = 'nodejs'
export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
Mode: ${mode === 'step-by-step' ? 'Step-by-step (wait for user acknowledgment between exercises)' : 'All-at-once (exercises play automatically)'}
Exercise ${currentIdx + 1} of ${total}: ${current.name}
Reps: ${current.reps ?? 'not specified'} | Sets: ${current.sets ?? 'not specified'}${current.duration_seconds ? ` | Hold: ${current.duration_seconds}s` : ''}
Position: ${current.position}
Form cues: ${current.form_cues.join('; ')}
Body parts: ${current.primary_body_parts.join(', ')}

Full plan:
${exerciseList}

ACTION COMMANDS — append to end of response when appropriate:
[NEXT] — user says done/finished/next/yes/continue/ok → advance to next exercise
[REPEAT] — user says repeat/again/redo → restart current
[PAUSE] — user says stop/pause/wait/break → pause session
[COMPLETE] — after [NEXT] on the last exercise (${isLast ? 'THIS IS THE LAST EXERCISE' : `last is exercise ${total}`})
[START_SESSION] — if user asks to begin/start (in browse mode only)

${mode === 'step-by-step' ? `In step-by-step mode: guide through current exercise, wait for "done" before [NEXT].` : `In all-at-once mode: exercises auto-advance, but user can still ask questions.`}
${isLast ? 'This is the FINAL exercise — use [COMPLETE] instead of [NEXT] when they finish.' : ''}`
}

interface SessionContext {
  phase: 'browse' | 'session'
  exercises: PTExercise[]
  currentIdx: number
  mode: 'step-by-step' | 'all-at-once'
}

export async function POST(req: NextRequest) {
  const { messages, session } = await req.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 120,
          system: buildSystemPrompt(session ?? null),
          messages,
          stream: true,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
