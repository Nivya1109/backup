import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') || ''

    // When a category filter is active, pre-fetch the matching library IDs so
    // every subsequent query can use them as an `id: { in: [...] }` filter.
    // This avoids complex raw SQL joins and BigInt serialization issues.
    let libraryIds: string[] | undefined
    if (category) {
      const libs = await prisma.library.findMany({
        where: {
          categories: {
            some: {
              category: { name: { equals: category, mode: 'insensitive' } },
            },
          },
        },
        select: { id: true },
      })
      libraryIds = libs.map((l) => l.id)
      // Short-circuit: category exists but has no libraries
      if (libraryIds.length === 0) {
        return NextResponse.json({
          totalLibraries: 0,
          librariesPerCategory: [],
          librariesPerLanguage: [],
          platformDistribution: [],
          librariesByOrg: [],
          licenseBreakdown: { free: 0, paid: 0 },
        })
      }
    }

    const libWhere = libraryIds ? { id: { in: libraryIds } } : {}

    // --- Total libraries ---
    const totalLibraries = await prisma.library.count({ where: libWhere })

    // --- Libraries per category ---
    // Fetch each category with the filtered subset of libraries and count in JS
    // (avoids raw SQL and BigInt)
    const categoryRows = await prisma.category.findMany({
      where: libraryIds
        ? { libraries: { some: { libraryId: { in: libraryIds } } } }
        : { libraries: { some: {} } },
      select: {
        name: true,
        libraries: {
          where: libraryIds ? { libraryId: { in: libraryIds } } : {},
          select: { libraryId: true },
        },
      },
    })
    const librariesPerCategory = categoryRows
      .map((c) => ({ category: c.name, count: c.libraries.length }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)

    // --- Libraries per language ---
    const languageRows = await prisma.language.findMany({
      where: libraryIds
        ? { libraries: { some: { libraryId: { in: libraryIds } } } }
        : { libraries: { some: {} } },
      select: {
        name: true,
        libraries: {
          where: libraryIds ? { libraryId: { in: libraryIds } } : {},
          select: { libraryId: true },
        },
      },
    })
    const librariesPerLanguage = languageRows
      .map((l) => ({ language: l.name, count: l.libraries.length }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count)

    // --- Platform distribution (category × platform) ---
    // Fetch filtered libraries with their category and platform names, then
    // aggregate the (category, platform) pairs in JavaScript.
    const libsForPlatform = await prisma.library.findMany({
      where: libWhere,
      select: {
        categories: { select: { category: { select: { name: true } } } },
        platforms:  { select: { platform:  { select: { name: true } } } },
      },
    })
    const platformMap = new Map<string, number>()
    for (const lib of libsForPlatform) {
      for (const lc of lib.categories) {
        for (const lp of lib.platforms) {
          const key = `${lc.category.name}|||${lp.platform.name}`
          platformMap.set(key, (platformMap.get(key) ?? 0) + 1)
        }
      }
    }
    const platformDistribution = Array.from(platformMap.entries())
      .map(([key, count]) => {
        const [cat, platform] = key.split('|||')
        return { category: cat, platform, count }
      })
      .sort((a, b) => a.category.localeCompare(b.category) || b.count - a.count)

    // --- Top organizations (up to 10) ---
    const orgRows = await prisma.organization.findMany({
      where: libraryIds
        ? { libraries: { some: { id: { in: libraryIds } } } }
        : { libraries: { some: {} } },
      select: {
        name: true,
        libraries: {
          where: libraryIds ? { id: { in: libraryIds } } : {},
          select: { id: true },
        },
      },
    })
    const librariesByOrg = orgRows
      .map((o) => ({ org: o.name, count: o.libraries.length }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // --- License breakdown ---
    const [freeCount, paidCount] = await Promise.all([
      prisma.library.count({ where: { ...libWhere, costMinUSD: 0 } }),
      prisma.library.count({ where: { ...libWhere, costMinUSD: { gt: 0 } } }),
    ])

    return NextResponse.json({
      totalLibraries,
      librariesPerCategory,
      librariesPerLanguage,
      platformDistribution,
      librariesByOrg,
      licenseBreakdown: { free: freeCount, paid: paidCount },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
