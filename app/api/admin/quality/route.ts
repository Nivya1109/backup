import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      missingExampleCount,
      missingExampleList,
      missingOfficialCount,
      missingRepoCount,
      missingUrlList,
      recentLibraries,
      sourceBreakdownRaw,
    ] = await Promise.all([
      // Count missing exampleCode (null or empty)
      prisma.library.count({
        where: { OR: [{ exampleCode: null }, { exampleCode: '' }] },
      }),

      // List of libraries missing exampleCode (top 10)
      prisma.library.findMany({
        where: { OR: [{ exampleCode: null }, { exampleCode: '' }] },
        select: {
          id: true,
          name: true,
          slug: true,
          dataSource: true,
          categories: { select: { category: { select: { name: true } } }, take: 1 },
          languages: { select: { language: { select: { name: true } } }, take: 1 },
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),

      // Count missing officialUrl
      prisma.library.count({
        where: { OR: [{ officialUrl: null }, { officialUrl: '' }] },
      }),

      // Count missing repositoryUrl
      prisma.library.count({
        where: { OR: [{ repositoryUrl: null }, { repositoryUrl: '' }] },
      }),

      // List of libraries missing either URL (top 10)
      prisma.library.findMany({
        where: {
          OR: [
            { officialUrl: null },
            { officialUrl: '' },
            { repositoryUrl: null },
            { repositoryUrl: '' },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          officialUrl: true,
          repositoryUrl: true,
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),

      // Recent libraries (newest first)
      prisma.library.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          shortSummary: true,
          dataSource: true,
          createdAt: true,
          categories: { select: { category: { select: { name: true } } }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Source breakdown — use groupBy to avoid BigInt serialization issues
      prisma.library.groupBy({
        by: ['dataSource'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ])

    return NextResponse.json({
      missingExample: {
        count: missingExampleCount,
        list: missingExampleList.map((lib) => ({
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          dataSource: lib.dataSource,
          category: lib.categories[0]?.category.name ?? null,
          language: lib.languages[0]?.language.name ?? null,
        })),
      },
      missingUrls: {
        missingOfficialCount,
        missingRepoCount,
        list: missingUrlList.map((lib) => ({
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          missingOfficial: !lib.officialUrl?.trim(),
          missingRepo: !lib.repositoryUrl?.trim(),
        })),
      },
      recentLibraries: recentLibraries.map((lib) => ({
        id: lib.id,
        name: lib.name,
        slug: lib.slug,
        shortSummary: lib.shortSummary,
        dataSource: lib.dataSource,
        createdAt: lib.createdAt,
        category: lib.categories[0]?.category.name ?? null,
      })),
      sourceBreakdown: sourceBreakdownRaw.map((r) => ({
        source: r.dataSource ?? 'unknown',
        count: r._count.id,
      })),
    })
  } catch (error) {
    console.error('Admin quality error:', error)
    return NextResponse.json({ error: 'Failed to fetch quality data' }, { status: 500 })
  }
}
