import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

interface LibraryPayload {
  name: string
  shortSummary: string | null
  description: string | null
  categories: string[]
  languages: string[]
  features: string[]
  isFree: boolean
}

// POST /api/ai/explain
// Body: { library: LibraryPayload, level: SkillLevel }
export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

  let library: LibraryPayload
  let level: SkillLevel
  try {
    const body = await request.json()
    library = body.library
    level = body.level
    if (!library?.name || !['beginner', 'intermediate', 'advanced'].includes(level)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const prompt = `Explain whether the library is suitable for the user.

Library name: ${library.name}
Description: ${library.shortSummary ?? library.description ?? 'N/A'}
Category: ${library.categories.join(', ') || 'N/A'}
User level: ${level.charAt(0).toUpperCase() + level.slice(1)}

IMPORTANT RULES:
- Keep the response SHORT
- Use simple, clear language
- Do NOT write paragraphs
- Use bullet points only
- Maximum 3 bullet points per section
- Each bullet point must be on a new line
- Do NOT merge sections into one paragraph
- Do NOT use markdown like ** or *
- Start each bullet with "• "
- Leave a line break between sections

FORMAT (follow exactly):

Best for:
• ...
• ...

Why use it:
• ...
• ...

Consider:
• ...
• ...

Verdict:
• ...`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 250,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ai/explain] Groq error:', res.status, err)
      return NextResponse.json({ error: 'AI unavailable right now.' }, { status: 502 })
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const explanation = data.choices[0]?.message?.content ?? ''
    return NextResponse.json({ explanation })
  } catch (err) {
    console.error('[ai/explain] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'AI unavailable right now.' }, { status: 502 })
  }
}
