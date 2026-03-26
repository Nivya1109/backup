import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') || ''

    const categoryFilter = category
      ? {
          categories: {
            some: {
              category: { name: { equals: category, mode: 'insensitive' as const } },
            },
          },
        }
      : {}

    // Total libraries
    const totalLibraries = await prisma.library.count({ where: categoryFilter })

    // Libraries per category
    const librariesPerCategory = category
      ? await prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
          SELECT c.name as category, COUNT(lc."libraryId")::bigint as count
          FROM "Library_Category" lc
          JOIN "Category" c ON c.id = lc."categoryId"
          WHERE c.name ILIKE ${`%${category}%`}
          GROUP BY c.name
          ORDER BY count DESC
        `
      : await prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
          SELECT c.name as category, COUNT(lc."libraryId")::bigint as count
          FROM "Library_Category" lc
          JOIN "Category" c ON c.id = lc."categoryId"
          GROUP BY c.name
          ORDER BY count DESC
        `

    // Libraries per language
    const librariesPerLanguage = category
      ? await prisma.$queryRaw<Array<{ language: string; count: bigint }>>`
          SELECT l.name as language, COUNT(ll."libraryId")::bigint as count
          FROM "Library_Language" ll
          JOIN "Language" l ON l.id = ll."languageId"
          JOIN "Library_Category" lc ON lc."libraryId" = ll."libraryId"
          JOIN "Category" c ON c.id = lc."categoryId"
          WHERE c.name ILIKE ${`%${category}%`}
          GROUP BY l.name
          ORDER BY count DESC
        `
      : await prisma.$queryRaw<Array<{ language: string; count: bigint }>>`
          SELECT l.name as language, COUNT(ll."libraryId")::bigint as count
          FROM "Library_Language" ll
          JOIN "Language" l ON l.id = ll."languageId"
          GROUP BY l.name
          ORDER BY count DESC
        `

    // Platform distribution
    const platformDistribution = category
      ? await prisma.$queryRaw<Array<{ category: string; platform: string; count: bigint }>>`
          SELECT c.name as category, p.name as platform, COUNT(*)::bigint as count
          FROM "Library_Category" lc
          JOIN "Library" lib ON lib.id = lc."libraryId"
          JOIN "Library_Platform" lp ON lp."libraryId" = lib.id
          JOIN "Platform" p ON p.id = lp."platformId"
          JOIN "Category" c ON c.id = lc."categoryId"
          WHERE c.name ILIKE ${`%${category}%`}
          GROUP BY c.name, p.name
          ORDER BY c.name, count DESC
        `
      : await prisma.$queryRaw<Array<{ category: string; platform: string; count: bigint }>>`
          SELECT c.name as category, p.name as platform, COUNT(*)::bigint as count
          FROM "Library_Category" lc
          JOIN "Library" lib ON lib.id = lc."libraryId"
          JOIN "Library_Platform" lp ON lp."libraryId" = lib.id
          JOIN "Platform" p ON p.id = lp."platformId"
          JOIN "Category" c ON c.id = lc."categoryId"
          GROUP BY c.name, p.name
          ORDER BY c.name, count DESC
        `

    // Libraries by organization
    const librariesByOrg = await prisma.$queryRaw<Array<{ org: string; count: bigint }>>`
      SELECT o.name as org, COUNT(lib.id)::bigint as count
      FROM "Organization" o
      JOIN "Library" lib ON lib."organizationId" = o.id
      GROUP BY o.name
      ORDER BY count DESC
      LIMIT 10
    `

    // Free vs paid counts
    const freeCount = await prisma.library.count({ where: { ...categoryFilter, costMinUSD: 0 } })
    const paidCount = await prisma.library.count({
      where: { ...categoryFilter, costMinUSD: { gt: 0 } },
    })

    return NextResponse.json({
      totalLibraries,
      librariesPerCategory: librariesPerCategory.map((r) => ({
        category: r.category,
        count: Number(r.count),
      })),
      librariesPerLanguage: librariesPerLanguage.map((r) => ({
        language: r.language,
        count: Number(r.count),
      })),
      platformDistribution: platformDistribution.map((r) => ({
        category: r.category,
        platform: r.platform,
        count: Number(r.count),
      })),
      librariesByOrg: librariesByOrg.map((r) => ({
        org: r.org,
        count: Number(r.count),
      })),
      licenseBreakdown: {
        free: freeCount,
        paid: paidCount,
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
