export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    keyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 15) ?? 'missing',
  })
}
