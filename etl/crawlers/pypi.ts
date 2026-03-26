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
    },
  })
}

export async function crawlPyPI() {
  console.log(`\n🐍 PyPI Crawler — fetching ${PYPI_PACKAGES.length} packages...\n`)
  let success = 0
  let failed = 0

  for (const { name, category } of PYPI_PACKAGES) {
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

  console.log(`\nPyPI done: ${success} succeeded, ${failed} failed\n`)
  return { success, failed }
}

if (require.main === module) {
  crawlPyPI().finally(() => prisma.$disconnect())
}
