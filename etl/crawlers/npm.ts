/**
 * npm Registry Crawler
 * Fetches popular JavaScript/TypeScript libraries from the npm registry public API.
 * No authentication required.
 * API: https://registry.npmjs.org/-/v1/search and https://registry.npmjs.org/{package}
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Top npm packages grouped by category — curated list for reliable, high-quality data
const NPM_PACKAGES: Array<{ name: string; category: string }> = [
  // HTTP & Networking
  { name: 'axios', category: 'HTTP & Networking' },
  { name: 'node-fetch', category: 'HTTP & Networking' },
  { name: 'got', category: 'HTTP & Networking' },
  { name: 'superagent', category: 'HTTP & Networking' },
  { name: 'ky', category: 'HTTP & Networking' },
  { name: 'undici', category: 'HTTP & Networking' },
  // Web Frameworks
  { name: 'express', category: 'HTTP & Networking' },
  { name: 'fastify', category: 'HTTP & Networking' },
  { name: 'koa', category: 'HTTP & Networking' },
  { name: 'hapi', category: 'HTTP & Networking' },
  { name: 'nestjs', category: 'HTTP & Networking' },
  // Auth & Security
  { name: 'passport', category: 'Authentication & Security' },
  { name: 'jsonwebtoken', category: 'Authentication & Security' },
  { name: 'bcrypt', category: 'Authentication & Security' },
  { name: 'bcryptjs', category: 'Authentication & Security' },
  { name: 'argon2', category: 'Authentication & Security' },
  { name: 'helmet', category: 'Authentication & Security' },
  { name: 'cors', category: 'Authentication & Security' },
  { name: 'next-auth', category: 'Authentication & Security' },
  // Database & ORM
  { name: 'mongoose', category: 'Database & ORM' },
  { name: 'sequelize', category: 'Database & ORM' },
  { name: 'typeorm', category: 'Database & ORM' },
  { name: 'prisma', category: 'Database & ORM' },
  { name: 'drizzle-orm', category: 'Database & ORM' },
  { name: 'pg', category: 'Database & ORM' },
  { name: 'mysql2', category: 'Database & ORM' },
  { name: 'redis', category: 'Database & ORM' },
  { name: 'ioredis', category: 'Database & ORM' },
  { name: 'knex', category: 'Database & ORM' },
  // Testing
  { name: 'jest', category: 'Testing' },
  { name: 'vitest', category: 'Testing' },
  { name: 'mocha', category: 'Testing' },
  { name: 'chai', category: 'Testing' },
  { name: 'sinon', category: 'Testing' },
  { name: 'supertest', category: 'Testing' },
  { name: 'playwright', category: 'Testing' },
  { name: 'cypress', category: 'Testing' },
  { name: 'puppeteer', category: 'Testing' },
  // Logging
  { name: 'winston', category: 'Logging & Monitoring' },
  { name: 'pino', category: 'Logging & Monitoring' },
  { name: 'bunyan', category: 'Logging & Monitoring' },
  { name: 'morgan', category: 'Logging & Monitoring' },
  { name: 'debug', category: 'Logging & Monitoring' },
  // Messaging
  { name: 'kafkajs', category: 'Messaging & Events' },
  { name: 'amqplib', category: 'Messaging & Events' },
  { name: 'bull', category: 'Messaging & Events' },
  { name: 'bullmq', category: 'Messaging & Events' },
  { name: 'socket.io', category: 'Messaging & Events' },
  // UI
  { name: 'react', category: 'UI Frameworks' },
  { name: 'vue', category: 'UI Frameworks' },
  { name: 'svelte', category: 'UI Frameworks' },
  { name: '@angular/core', category: 'UI Frameworks' },
  { name: 'solid-js', category: 'UI Frameworks' },
  { name: 'next', category: 'UI Frameworks' },
  { name: 'nuxt', category: 'UI Frameworks' },
  // Utilities
  { name: 'lodash', category: 'HTTP & Networking' },
  { name: 'date-fns', category: 'HTTP & Networking' },
  { name: 'zod', category: 'Authentication & Security' },
  { name: 'yup', category: 'Authentication & Security' },
]

interface NpmPackageData {
  name: string
  description?: string
  version?: string
  homepage?: string
  repository?: { url?: string }
  author?: { name?: string } | string
  license?: string
  keywords?: string[]
  readme?: string
  dist?: { tarball?: string }
  'dist-tags'?: { latest?: string }
  versions?: Record<string, { description?: string; homepage?: string; repository?: { url?: string }; author?: { name?: string } | string; license?: string }>
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractAuthor(author: NpmPackageData['author']): string | null {
  if (!author) return null
  if (typeof author === 'string') return author.split('<')[0].trim() || null
  return author.name || null
}

// Extracts the first real code block from a README/markdown string.
// Returns null rather than a template string if nothing found.
function extractExampleCode(text: string | undefined): string | null {
  if (!text) return null
  // Prefer language-tagged JS/TS blocks
  let m = text.match(/```(?:js|javascript|ts|typescript|jsx|tsx)[ \t]*\n([\s\S]{20,}?)\n```/)
  if (m) return m[1].trim().slice(0, 2000)
  // Fall back to any fenced block with at least 20 chars
  m = text.match(/```[ \t]*\n([\s\S]{20,}?)\n```/)
  return m ? m[1].trim().slice(0, 2000) : null
}

function extractRepoUrl(repo: NpmPackageData['repository']): string | null {
  if (!repo?.url) return null
  return repo.url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^ssh:\/\/git@github\.com/, 'https://github.com')
    .replace(/^git:\/\/github\.com/, 'https://github.com')
}

async function fetchNpmPackage(packageName: string): Promise<NpmPackageData | null> {
  try {
    const encodedName = packageName.startsWith('@')
      ? '@' + encodeURIComponent(packageName.slice(1))
      : packageName
    const res = await fetch(`https://registry.npmjs.org/${encodedName}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function upsertLibrary(pkgData: NpmPackageData, category: string) {
  const latestVersion = pkgData['dist-tags']?.latest || '0.0.0'
  const versionData = pkgData.versions?.[latestVersion] || {}

  const name = pkgData.name
  const slug = slugify(name)
  const description = pkgData.description || versionData.description || ''
  const homepage = pkgData.homepage || versionData.homepage || `https://www.npmjs.com/package/${name}`
  const repoUrl = extractRepoUrl(pkgData.repository || versionData.repository)
  const authorName = extractAuthor(pkgData.author || versionData.author)
  const license = pkgData.license || versionData.license || 'MIT'
  const isFree = !license?.toLowerCase().includes('commercial')

  // Build a rich tags list from npm keywords + derived terms
  const npmKeywords = (pkgData.keywords || []).map((k) => k.toLowerCase()).filter((k) => k.length > 1)
  const categoryTags = category.toLowerCase().split(/[\s&]+/).filter((t) => t.length > 2)
  const tags = Array.from(new Set([...npmKeywords, ...categoryTags])).slice(0, 30)

  // Ensure platforms exist
  const platformNames = ['macOS', 'Windows', 'Linux', 'Web']
  const platforms = await Promise.all(
    platformNames.map((pName) =>
      prisma.platform.upsert({ where: { name: pName }, create: { name: pName }, update: {} })
    )
  )

  // Ensure languages exist
  const jsLang = await prisma.language.upsert({ where: { name: 'JavaScript' }, create: { name: 'JavaScript' }, update: {} })
  const tsLang = await prisma.language.upsert({ where: { name: 'TypeScript' }, create: { name: 'TypeScript' }, update: {} })

  // Ensure category
  const cat = await prisma.category.upsert({ where: { name: category }, create: { name: category }, update: {} })

  // Ensure developer if author exists
  let developerId: string | undefined
  if (authorName) {
    const dev = await prisma.developer.upsert({
      where: { name: authorName },
      create: { name: authorName, url: homepage },
      update: {},
    })
    developerId = dev.id
  }

  // Preserve exampleCode: fetch existing value so the update block never overwrites it
  const existing = await prisma.library.findUnique({ where: { slug }, select: { exampleCode: true } })
  const readmeCode = extractExampleCode(pkgData.readme)

  // Upsert library
  await prisma.library.upsert({
    where: { slug },
    create: {
      name,
      slug,
      shortSummary: description?.slice(0, 200) || `${name} npm package`,
      description: description || null,
      functionDesc: description || null,
      officialUrl: homepage || null,
      repositoryUrl: repoUrl || null,
      costMinUSD: isFree ? 0 : null,
      costMaxUSD: isFree ? 0 : null,
      dataSource: 'npm-crawler',
      tags,
      exampleCode: readmeCode || null,
      developerId: developerId || null,
      categories: { create: [{ categoryId: cat.id }] },
      platforms: { create: platforms.map((p) => ({ platformId: p.id })) },
      languages: { create: [{ languageId: jsLang.id }, { languageId: tsLang.id }] },
      versions: {
        create: [{
          name: latestVersion,
          notes: `Latest release from npm registry`,
        }],
      },
    },
    update: {
      shortSummary: description?.slice(0, 200) || undefined,
      description: description || undefined,
      officialUrl: homepage || undefined,
      repositoryUrl: repoUrl || undefined,
      dataSource: 'npm-crawler',
      tags,
      // Preserve existing real code; only backfill from README if currently missing
      exampleCode: existing?.exampleCode ?? readmeCode ?? undefined,
    },
  })
}

// Search terms used for discovery — broad enough to surface many unique packages
const DISCOVERY_TERMS = [
  'react component', 'nodejs utility', 'typescript helper', 'cli tool',
  'data validation', 'animation library', 'chart visualization', 'markdown parser',
  'state management', 'api client', 'graphql client', 'build bundler',
  'image processing', 'email sender', 'date time', 'file upload',
  'payment gateway', 'oauth login', 'caching layer', 'websocket client',
]

function inferCategoryFromKeywords(keywords: string[], searchTerm: string): string {
  const all = [...keywords, searchTerm].join(' ').toLowerCase()
  if (all.match(/react|vue|angular|svelte|ui|component/)) return 'UI Frameworks'
  if (all.match(/test|mock|assert|spec/))                  return 'Testing'
  if (all.match(/database|orm|sql|mongo|redis/))           return 'Database & ORM'
  if (all.match(/auth|oauth|jwt|crypto|security/))         return 'Authentication & Security'
  if (all.match(/log|monitor|trace|sentry/))               return 'Logging & Monitoring'
  if (all.match(/message|queue|kafka|event|pubsub/))       return 'Messaging & Events'
  if (all.match(/devops|deploy|docker|ci|infra/))          return 'DevOps & Infrastructure'
  if (all.match(/http|api|rest|fetch|request|axios/))      return 'HTTP & Networking'
  if (all.match(/data|ml|chart|graph|csv|analytics/))      return 'Data Science & ML'
  return 'Utilities'
}

async function discoverNewNpmPackages(knownNames: Set<string>, limit: number): Promise<number> {
  console.log(`\n🔍 NPM Discovery — searching for up to ${limit} new packages...\n`)
  let newCount = 0

  for (const term of DISCOVERY_TERMS) {
    if (newCount >= limit) break
    try {
      const res = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=50`
      )
      if (!res.ok) continue
      const json = await res.json() as { objects?: Array<{ package: { name: string; keywords?: string[] } }> }
      const objects = json.objects ?? []

      for (const obj of objects) {
        if (newCount >= limit) break
        const pkgName = obj.package?.name
        if (!pkgName || knownNames.has(pkgName)) continue

        const data = await fetchNpmPackage(pkgName)
        if (data) {
          const category = inferCategoryFromKeywords(obj.package.keywords ?? [], term)
          await upsertLibrary(data, category)
          knownNames.add(pkgName)
          newCount++
          console.log(`  🆕  ${pkgName} (${category}) — via "${term}"`)
        }
        await new Promise((r) => setTimeout(r, 150))
      }
    } catch (err) {
      console.warn(`  ⚠️  Discovery search "${term}" failed:`, err)
    }
  }

  console.log(`\n  Discovery found ${newCount} new npm packages\n`)
  return newCount
}

interface CrawlNpmOptions {
  limit?: number          // max packages from curated list (default: all)
  skipDiscovery?: boolean // skip discovery phase (default: false)
  discoveryLimit?: number // max new packages to find via discovery (default: 60)
}

export async function crawlNpm(options: CrawlNpmOptions = {}) {
  const { limit = NPM_PACKAGES.length, skipDiscovery = false } = options
  const packagesToProcess = NPM_PACKAGES.slice(0, limit)

  console.log(`\n📦 NPM Crawler — fetching ${packagesToProcess.length} packages (limit=${limit}, skipDiscovery=${skipDiscovery})...\n`)
  let success = 0
  let failed = 0

  for (const { name, category } of packagesToProcess) {
    try {
      const data = await fetchNpmPackage(name)
      if (!data) {
        console.log(`  ⚠️  ${name} — not found`)
        failed++
        continue
      }
      await upsertLibrary(data, category)
      console.log(`  ✅  ${name} (${category})`)
      success++
    } catch (err) {
      console.log(`  ❌  ${name} — ${err}`)
      failed++
    }
    // Rate limit: 150ms between requests
    await new Promise((r) => setTimeout(r, 150))
  }

  // Discovery phase — find packages not already in DB (skipped in API/batch mode)
  let discovered = 0
  if (!skipDiscovery) {
    const allNames = await prisma.library.findMany({ select: { name: true } })
    const knownNames = new Set(allNames.map((l) => l.name))
    discovered = await discoverNewNpmPackages(knownNames, options.discoveryLimit ?? 60)
  }
  success += discovered

  console.log(`\nNPM done: ${success} succeeded, ${failed} failed\n`)
  return { success, failed }
}

if (require.main === module) {
  crawlNpm().finally(() => prisma.$disconnect())
}
