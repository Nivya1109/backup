import { NextResponse } from 'next/server'
import { searchClient, SIP_COLLECTION } from '@/lib/search'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface TypesenseDocument {
  id: string
  name: string
  slug: string
  categories?: string[]
  shortSummary?: string
}

interface TypesenseHit {
  document: TypesenseDocument
  highlights?: Array<{ field?: string; snippet?: string; value?: string }>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ suggestions: [] })
    }

    // Try Typesense first — with typo tolerance + prefix so "reac" → React, "mongose" → Mongoose
    if (searchClient) {
      try {
        const results = await searchClient
          .collections(SIP_COLLECTION)
          .documents()
          .search({
            q: query,
            query_by: 'name,tags,functionDesc,shortSummary,categories',
            query_by_weights: '15,6,5,4,1',
            num_typos: 2,
            prefix: true,
            infix: 'fallback',
            per_page: 6,
            highlight_fields: 'name',
            highlight_full_fields: 'name',
          })

        const suggestions = ((results.hits as TypesenseHit[]) || []).map((hit) => {
          const nameHighlight = hit.highlights?.find((h) => h.field === 'name')
          return {
            id: hit.document.id,
            name: hit.document.name,
            slug: hit.document.slug,
            categories: hit.document.categories || [],
            shortSummary: hit.document.shortSummary || null,
            highlightedName: nameHighlight?.snippet || nameHighlight?.value || hit.document.name,
          }
        })

        return NextResponse.json({ suggestions })
      } catch {
        // Fall through to Postgres
      }
    }

    // Postgres fallback — search name, summary, functionDesc, and tags
    const q = query.trim()
    const libraries = await prisma.library.findMany({
      where: {
        OR: [
          { name:         { contains: q, mode: 'insensitive' } },
          { shortSummary: { contains: q, mode: 'insensitive' } },
          { functionDesc: { contains: q, mode: 'insensitive' } },
          { description:  { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { categories: { include: { category: true } } },
      take: 6,
      orderBy: { name: 'asc' },
    })

    const suggestions = libraries.map((lib) => ({
      id: lib.id,
      name: lib.name,
      slug: lib.slug,
      categories: lib.categories.map((c) => c.category.name),
      shortSummary: lib.shortSummary || null,
      highlightedName: (() => {
        const idx = lib.name.toLowerCase().indexOf(q.toLowerCase())
        if (idx === -1) return lib.name
        return lib.name.slice(0, idx) + '<mark>' + lib.name.slice(idx, idx + q.length) + '</mark>' + lib.name.slice(idx + q.length)
      })(),
    }))

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestion search error:', error)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}
