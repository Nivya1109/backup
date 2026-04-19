import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface LibrarySummary {
  name: string
  shortSummary: string | null
  categories: string[]
  languages: string[]
  costMinUSD: number | null
  featureCount: number
}

// POST /api/ai/compare-summary
// Body: { libraries: LibrarySummary[] }
export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

  let libraries: LibrarySummary[]
  try {
    const body = await request.json()
    libraries = body.libraries
    if (!Array.isArray(libraries) || libraries.length < 2 || libraries.length > 4) {
      return NextResponse.json({ error: 'Provide 2–4 libraries' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const libDescriptions = libraries
    .map((lib) => {
      const cost = lib.costMinUSD === 0 || lib.costMinUSD === null ? 'Free' : `$${lib.costMinUSD}+`
      return [
        `**${lib.name}**`,
        lib.shortSummary ? `  Summary: ${lib.shortSummary}` : '',
        lib.categories.length ? `  Categories: ${lib.categories.join(', ')}` : '',
        lib.languages.length ? `  Languages: ${lib.languages.join(', ')}` : '',
        `  Cost: ${cost}`,
        `  Features tracked: ${lib.featureCount}`,
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')

  const prompt = `You are a software library expert. A developer is comparing these libraries:\n\n${libDescriptions}\n\nWrite a concise, friendly comparison summary covering exactly these four points:\n1. **Best for beginners** — which library and why\n2. **Best for advanced/enterprise use** — which library and why\n3. **Key tradeoffs** — 2–3 bullet points highlighting meaningful differences\n4. **Best use case per tool** — one sentence per library\n\nBe direct, specific, and useful. Keep the total response under 250 words.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ai/compare-summary] Groq error:', res.status, err)
      return NextResponse.json({ error: 'AI summary unavailable right now.' }, { status: 502 })
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const summary = data.choices[0]?.message?.content ?? ''
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[ai/compare-summary] fetch error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'AI summary unavailable right now.' }, { status: 502 })
  }
}
