import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { exercisePosition, repCount, formScore } = await req.json()

  const scoreLabel =
    formScore >= 80 ? 'excellent' : formScore >= 60 ? 'good' : formScore >= 40 ? 'fair' : 'needs work'

  const prompt = `You are a friendly physical therapy coach giving real-time audio feedback.
Exercise position: ${exercisePosition}
Reps completed so far: ${repCount}
Current form score: ${formScore}/100 (${scoreLabel})

Give ONE short sentence of coaching feedback (under 15 words).
- If score >= 80: praise the form and encourage continuing
- If score 50-79: give one specific form cue to improve
- If score < 50: give one gentle correction
- Vary the language each call — don't always say the same thing
- Sound warm and encouraging, not clinical
Do NOT include any preamble, just the feedback sentence.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    })

    const feedback = (response.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ feedback })
  } catch {
    return NextResponse.json({ feedback: '' })
  }
}
