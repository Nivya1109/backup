/**
 * PyPI Crawler
 * Fetches popular Python packages from the Python Package Index public API.
 * No authentication required.
 * API: https://pypi.org/pypi/{package}/json
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PYPI_PACKAGES: Array<{ name: string; category: string }> = [
  // HTTP
  { name: 'requests', category: 'HTTP & Networking' },
  { name: 'httpx', category: 'HTTP & Networking' },
  { name: 'aiohttp', category: 'HTTP & Networking' },
  { name: 'urllib3', category: 'HTTP & Networking' },
  { name: 'httpcore', category: 'HTTP & Networking' },
  { name: 'grpcio', category: 'HTTP & Networking' },
  // Web frameworks
  { name: 'django', category: 'HTTP & Networking' },
  { name: 'flask', category: 'HTTP & Networking' },
  { name: 'fastapi', category: 'HTTP & Networking' },
  { name: 'starlette', category: 'HTTP & Networking' },
  { name: 'tornado', category: 'HTTP & Networking' },
  { name: 'sanic', category: 'HTTP & Networking' },
  // Auth & Security
  { name: 'cryptography', category: 'Security & Cryptography' },
  { name: 'pyjwt', category: 'Authentication & Security' },
  { name: 'bcrypt', category: 'Security & Cryptography' },
  { name: 'passlib', category: 'Authentication & Security' },
  { name: 'python-jose', category: 'Authentication & Security' },
  { name: 'authlib', category: 'Authentication & Security' },
  // Database
  { name: 'sqlalchemy', category: 'Database & ORM' },
  { name: 'psycopg2', category: 'Database & ORM' },
  { name: 'pymongo', category: 'Database & ORM' },
  { name: 'redis', category: 'Database & ORM' },
  { name: 'motor', category: 'Database & ORM' },
  { name: 'tortoise-orm', category: 'Database & ORM' },
  { name: 'peewee', category: 'Database & ORM' },
  { name: 'alembic', category: 'Database & ORM' },
  { name: 'pymysql', category: 'Database & ORM' },
  // Testing
  { name: 'pytest', category: 'Testing' },
  { name: 'unittest', category: 'Testing' },
  { name: 'hypothesis', category: 'Testing' },
  { name: 'factory-boy', category: 'Testing' },
  { name: 'faker', category: 'Testing' },
  { name: 'coverage', category: 'Testing' },
  { name: 'pytest-asyncio', category: 'Testing' },
  // Data Science
  { name: 'numpy', category: 'Data Science & ML' },
  { name: 'pandas', category: 'Data Science & ML' },
  { name: 'scipy', category: 'Data Science & ML' },
  { name: 'scikit-learn', category: 'Data Science & ML' },
  { name: 'tensorflow', category: 'Data Science & ML' },
  { name: 'torch', category: 'Data Science & ML' },
  { name: 'keras', category: 'Data Science & ML' },
  { name: 'matplotlib', category: 'Data Science & ML' },
  { name: 'seaborn', category: 'Data Science & ML' },
  { name: 'plotly', category: 'Data Science & ML' },
  { name: 'transformers', category: 'Data Science & ML' },
  { name: 'xgboost', category: 'Data Science & ML' },
  // Logging
  { name: 'loguru', category: 'Logging & Monitoring' },
  { name: 'structlog', category: 'Logging & Monitoring' },
  { name: 'python-json-logger', category: 'Logging & Monitoring' },
  { name: 'sentry-sdk', category: 'Logging & Monitoring' },
  // Messaging
  { name: 'celery', category: 'Messaging & Events' },
  { name: 'pika', category: 'Messaging & Events' },
  { name: 'kafka-python', category: 'Messaging & Events' },
  { name: 'aiokafka', category: 'Messaging & Events' },
  // Utilities
  { name: 'pydantic', category: 'Authentication & Security' },
  { name: 'click', category: 'DevOps & Infrastructure' },
  { name: 'rich', category: 'Logging & Monitoring' },
  { name: 'python-dotenv', category: 'DevOps & Infrastructure' },
  { name: 'boto3', category: 'DevOps & Infrastructure' },
  { name: 'paramiko', category: 'DevOps & Infrastructure' },
]

interface PypiPackageData {
  info: {
    name: string
    summary?: string
    description?: string
    version: string
    author?: string
    author_email?: string
    license?: string
    home_page?: string
    project_urls?: Record<string, string>
    requires_dist?: string[]
    keywords?: string
    classifiers?: string[]
  }
  releases?: Record<string, Array<{ upload_time?: string }>>
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function fetchPypiPackage(packageName: string): Promise<PypiPackageData | null> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Extracts the first real code block from a README/description string.
function extractExampleCode(text: string | undefined): string | null {
  if (!text) return null
  let m = text.match(/```(?:python|py)[ \t]*\n([\s\S]{20,}?)\n```/)
  if (m) return m[1].trim().slice(0, 2000)
  m = text.match(/```[ \t]*\n([\s\S]{20,}?)\n```/)
  return m ? m[1].trim().slice(0, 2000) : null
}

function extractPypiTags(info: PypiPackageData['info'], category: string): string[] {
  // 1. Direct keywords field (space or comma separated)
  const kwString = info.keywords || ''
  const kwTags = kwString.split(/[\s,;]+/).map((k) => k.toLowerCase().trim()).filter((k) => k.length > 1)

  // 2. Extract useful labels from classifiers
  //    e.g. "Framework :: Django" → "django"
  //         "Topic :: Internet :: WWW/HTTP :: HTTP Servers" → "http servers"
  const classifierTags: string[] = []
  for (const c of info.classifiers || []) {
    const parts = c.split('::').map((p) => p.trim().toLowerCase())
    if (parts[0] === 'framework' && parts[1]) classifierTags.push(parts[1])
    if (parts[0] === 'topic' && parts.length > 1) classifierTags.push(parts[parts.length - 1])
  }

  // 3. Category-derived tags
  const categoryTags = category.toLowerCase().split(/[\s&]+/).filter((t) => t.length > 2)

  return Array.from(new Set([...kwTags, ...classifierTags, ...categoryTags])).slice(0, 30)
}

async function upsertLibrary(data: PypiPackageData, category: string) {
  const { info } = data
  const name = info.name
  const slug = slugify(name)
  const description = info.summary || ''
  const fullDesc = info.description?.slice(0, 2000) || description
  const homepage = info.home_page || info.project_urls?.Homepage || info.project_urls?.Documentation || `https://pypi.org/project/${name}`
  const repoUrl = info.project_urls?.Source || info.project_urls?.Repository || info.project_urls?.['Source Code'] || null
  const authorName = info.author?.split(',')[0].trim() || null
  const isFree = !info.license?.toLowerCase().includes('commercial')

  const tags = extractPypiTags(info, category)

  // Latest release date
  const releases = data.releases || {}
  const latestRelease = releases[info.version]?.[0]?.upload_time

  const platformNames = ['macOS', 'Windows', 'Linux']
  const platforms = await Promise.all(
    platformNames.map((pName) =>
      prisma.platform.upsert({ where: { name: pName }, create: { name: pName }, update: {} })
    )
  )

  const pyLang = await prisma.language.upsert({ where: { name: 'Python' }, create: { name: 'Python' }, update: {} })
  const cat = await prisma.category.upsert({ where: { name: category }, create: { name: category }, update: {} })

  let developerId: string | undefined
  if (authorName) {
    const dev = await prisma.developer.upsert({
      where: { name: authorName },
      create: { name: authorName },
      update: {},
    })
    developerId = dev.id
  }

  // Preserve exampleCode: fetch existing value so the update block never overwrites it
  const existing = await prisma.library.findUnique({ where: { slug }, select: { exampleCode: true } })
  const readmeCode = extractExampleCode(info.description)

  await prisma.library.upsert({
    where: { slug },
    create: {
      name,
      slug,
      shortSummary: description.slice(0, 200) || `${name} Python package`,
      description: fullDesc || null,
      functionDesc: description || null,
      officialUrl: homepage || null,
      repositoryUrl: repoUrl || null,
      costMinUSD: isFree ? 0 : null,
      costMaxUSD: isFree ? 0 : null,
      dataSource: 'pypi-crawler',
      tags,
      exampleCode: readmeCode || null,
      developerId: developerId || null,
      categories: { create: [{ categoryId: cat.id }] },
      platforms: { create: platforms.map((p) => ({ platformId: p.id })) },
      languages: { create: [{ languageId: pyLang.id }] },
      versions: {
        create: [{
          name: info.version,
          releasedAt: latestRelease ? new Date(latestRelease) : undefined,
          notes: `Latest release from PyPI`,
        }],
      },
    },
    update: {
      shortSummary: description.slice(0, 200) || undefined,
      description: fullDesc || undefined,
      officialUrl: homepage || undefined,
      repositoryUrl: repoUrl || undefined,
      dataSource: 'pypi-crawler',
      tags,
      // Preserve existing real code; only backfill from description if currently missing
      exampleCode: existing?.exampleCode ?? readmeCode ?? undefined,
    },
  })
}

function inferPypiCategory(info: PypiPackageData['info']): string {
  const classifiers = info.classifiers ?? []
  const text = (info.name + ' ' + (info.summary ?? '')).toLowerCase()

  for (const c of classifiers) {
    if (c.includes('Machine Learning') || c.includes('Deep Learning')) return 'Data Science & ML'
    if (c.includes('Database'))                                         return 'Database & ORM'
    if (c.includes('Testing') || c.includes('Test'))                   return 'Testing'
    if (c.includes('Security') || c.includes('Cryptograph'))           return 'Security & Cryptography'
    if (c.includes('Logging') || c.includes('Monitoring'))             return 'Logging & Monitoring'
    if (c.includes('Internet') || c.includes('WWW') || c.includes('HTTP')) return 'HTTP & Networking'
  }
  if (text.match(/machine.learning|neural|data.science|nlp|ml /))      return 'Data Science & ML'
  if (text.match(/database|orm|sql|postgres|mongo/))                   return 'Database & ORM'
  if (text.match(/test|mock|assert|coverage/))                         return 'Testing'
  if (text.match(/security|crypto|cipher|auth|jwt/))                   return 'Security & Cryptography'
  if (text.match(/log|monitor|trace/))                                 return 'Logging & Monitoring'
  if (text.match(/http|web|api|rest|request|flask|django/))            return 'HTTP & Networking'
  if (text.match(/queue|message|celery|kafka|worker/))                 return 'Messaging & Events'
  if (text.match(/devops|deploy|docker|cloud|aws|gcp|azure/))         return 'DevOps & Infrastructure'
  return 'Utilities'
}

async function discoverNewPypiPackages(knownSlugs: Set<string>, limit: number): Promise<number> {
  console.log(`\n🔍 PyPI Discovery — fetching top packages list...\n`)
  let newCount = 0

  try {
    // Top PyPI packages by downloads — public JSON snapshot updated daily
    const res = await fetch(
      'https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.min.json'
    )
    if (!res.ok) {
      console.warn('  ⚠️  Could not fetch top-pypi-packages list')
      return 0
    }
    const json = await res.json() as { rows: Array<{ project: string }> }
    const rows = json.rows ?? []

    for (const row of rows.slice(0, 500)) {
      if (newCount >= limit) break
      const pkgName = row.project
      const slug = pkgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (knownSlugs.has(slug)) continue

      const data = await fetchPypiPackage(pkgName)
      if (data) {
        const category = inferPypiCategory(data.info)
        await upsertLibrary(data, category)
        knownSlugs.add(slug)
        newCount++
        console.log(`  🆕  ${pkgName} (${category}) — top downloads`)
      }
      await new Promise((r) => setTimeout(r, 200))
    }
  } catch (err) {
    console.warn('  ⚠️  PyPI discovery failed:', err)
  }

  console.log(`\n  Discovery found ${newCount} new PyPI packages\n`)
  return newCount
}

interface CrawlPyPIOptions {
  limit?: number          // max packages from curated list (default: all)
  skipDiscovery?: boolean // skip discovery phase (default: false)
  discoveryLimit?: number // max new packages to find via discovery (default: 50)
}

export async function crawlPyPI(options: CrawlPyPIOptions = {}) {
  const { limit = PYPI_PACKAGES.length, skipDiscovery = false } = options
  const packagesToProcess = PYPI_PACKAGES.slice(0, limit)

  console.log(`\n🐍 PyPI Crawler — fetching ${packagesToProcess.length} packages (limit=${limit}, skipDiscovery=${skipDiscovery})...\n`)
  let success = 0
  let failed = 0

  for (const { name, category } of packagesToProcess) {
    try {
      const data = await fetchPypiPackage(name)
      if (!data) {
        console.log(`  ⚠️  ${name} — not found`)
        failed++
        continue
      }
      await upsertLibrary(data, category)
      console.log(`  ✅  ${name} v${data.info.version} (${category})`)
      success++
    } catch (err) {
      console.log(`  ❌  ${name} — ${err}`)
      failed++
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  // Discovery phase — top PyPI downloads (skipped in API/batch mode)
  let discovered = 0
  if (!skipDiscovery) {
    const allSlugs = await prisma.library.findMany({ select: { slug: true } })
    const knownSlugs = new Set(allSlugs.map((l) => l.slug))
    discovered = await discoverNewPypiPackages(knownSlugs, options.discoveryLimit ?? 50)
  }
  success += discovered

  console.log(`\nPyPI done: ${success} succeeded, ${failed} failed\n`)
  return { success, failed }
}

if (require.main === module) {
  crawlPyPI().finally(() => prisma.$disconnect())
}
