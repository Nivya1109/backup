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
    },
  })
}

export async function crawlNpm() {
  console.log(`\n📦 NPM Crawler — fetching ${NPM_PACKAGES.length} packages...\n`)
  let success = 0
  let failed = 0

  for (const { name, category } of NPM_PACKAGES) {
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

  console.log(`\nNPM done: ${success} succeeded, ${failed} failed\n`)
  return { success, failed }
}

if (require.main === module) {
  crawlNpm().finally(() => prisma.$disconnect())
}
