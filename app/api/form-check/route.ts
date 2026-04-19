import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { exercisePosition, exerciseName, repCount, formScore, tip } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return NextResponse.json({ feedback: '' })

  const scoreLabel = formScore >= 80 ? 'excellent' : formScore >= 60 ? 'good' : formScore >= 40 ? 'fair' : 'needs work'

  const prompt = `You are a friendly physical therapy coach giving real-time audio feedback.
Exercise: ${exerciseName ?? exercisePosition}, Reps done: ${repCount}, Form score: ${formScore}/100 (${scoreLabel})${tip ? `\nKey form tip for this exercise: ${tip}` : ''}

Give ONE short sentence of coaching (under 15 words). If score>=80 praise and encourage, if 50-79 mention the form tip, if <50 give a gentle correction. Sound warm, vary your language.
Return only the sentence, no preamble.`

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
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return NextResponse.json({ feedback: '' })
    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const feedback = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    return NextResponse.json({ feedback })
  } catch {
    return NextResponse.json({ feedback: '' })
  }
}
