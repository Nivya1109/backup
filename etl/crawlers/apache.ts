/**
 * Apache Projects Crawler
 * Fetches Apache Software Foundation projects from their public JSON API.
 * No authentication required.
 * API: https://projects.apache.org/json/foundation/projects.json
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ApacheProject {
  name: string
  description?: string
  homepage?: string
  repository?: string[] | string
  category?: string
  pmc?: string
  shortdesc?: string
  created?: string
  'programming-language'?: string | string[]
  release?: Array<{ name: string; revision: string; created: string }>
  'bug-database'?: string
  license?: string
  doap?: string
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function detectCategory(project: ApacheProject): string {
  const desc = ((project.description || '') + ' ' + (project.shortdesc || '')).toLowerCase()
  const name = (project.name || '').toLowerCase()
  const cat = (project.category || '').toLowerCase()

  if (cat.includes('big-data') || cat.includes('database') || desc.includes('database') || desc.includes(' sql') || desc.includes('nosql') || name.includes('cassandra') || name.includes('hbase') || name.includes('couchdb') || name.includes('accumulo') || name.includes('derby')) return 'Database & ORM'
  if (cat.includes('messaging') || desc.includes('message broker') || desc.includes('messaging') || desc.includes(' queue') || name.includes('kafka') || name.includes('activemq') || name.includes('pulsar') || name.includes('qpid') || name.includes('geronimo')) return 'Messaging & Events'
  if (desc.includes('machine learning') || desc.includes('deep learning') || desc.includes('neural') || desc.includes('data science') || name.includes('mxnet') || name.includes('mahout') || name.includes('spark')) return 'Data Science & ML'
  if (desc.includes('logging') || desc.includes('log4') || name.includes('log4') || name.includes('logging')) return 'Logging & Monitoring'
  if (desc.includes('security') || desc.includes('cryptograph') || desc.includes('ssl') || desc.includes('tls') || name.includes('shiro') || name.includes('santuario') || name.includes('cxf')) return 'Security & Cryptography'
  if (desc.includes('testing') || desc.includes('test framework') || name.includes('jmeter')) return 'Testing'
  if (desc.includes('build') || desc.includes('deployment') || desc.includes('pipeline') || desc.includes('workflow') || name.includes('maven') || name.includes('ant') || name.includes('airflow') || name.includes('camel')) return 'DevOps & Infrastructure'
  if (desc.includes('http') || desc.includes('web server') || desc.includes('web framework') || desc.includes('rest') || desc.includes('proxy') || name.includes('tomcat') || name.includes('httpd') || name.includes('wicket') || name.includes('struts') || name.includes('tapestry')) return 'HTTP & Networking'
  return 'DevOps & Infrastructure' // default for Apache projects
}

function detectLanguages(project: ApacheProject): string[] {
  const lang = project['programming-language']
  if (!lang) return ['Java'] // most Apache projects are Java

  const langs = Array.isArray(lang) ? lang : [lang]
  const mapped: string[] = []

  for (const l of langs) {
    const lower = l.toLowerCase()
    if (lower.includes('java') && !lower.includes('javascript')) mapped.push('Java')
    if (lower.includes('python')) mapped.push('Python')
    if (lower.includes('javascript') || lower.includes('js')) mapped.push('JavaScript')
    if (lower.includes('c++') || lower.includes('cpp')) mapped.push('C++')
    if (lower.includes('go')) mapped.push('Go')
    if (lower.includes('scala')) mapped.push('Scala')
    if (lower.includes('ruby')) mapped.push('Ruby')
    if (lower.includes('groovy')) mapped.push('Groovy')
  }

  return mapped.length > 0 ? [...new Set(mapped)] : ['Java']
}

async function crawlApache() {
  console.log('\n🪶 Apache Crawler — fetching projects from projects.apache.org...\n')

  const res = await fetch('https://projects.apache.org/json/foundation/projects.json')
  if (!res.ok) throw new Error(`Failed to fetch Apache projects: ${res.status}`)

  const raw: Record<string, ApacheProject> = await res.json()
  const projects = Object.values(raw)

  console.log(`Found ${projects.length} Apache projects. Processing library-relevant ones...\n`)

  // Filter: must have a name and description; skip incubating/attic
  const SKIP_KEYWORDS = ['incubat', 'attic', 'retired', 'old', 'legacy']
  const relevant = projects.filter((p) => {
    if (!p.name || !p.description) return false
    const desc = (p.description || '').toLowerCase()
    return !SKIP_KEYWORDS.some((kw) => desc.includes(kw))
  }).slice(0, 80) // limit to 80 projects

  const apacheOrg = await prisma.organization.upsert({
    where: { name: 'Apache Software Foundation' },
    create: { name: 'Apache Software Foundation', url: 'https://www.apache.org' },
    update: {},
  })

  let success = 0
  let failed = 0

  for (const project of relevant) {
    try {
      const name = project.name.startsWith('Apache ') ? project.name : `Apache ${project.name}`
      const slug = slugify(name)
      const description = project.description || project.shortdesc || ''
      const category = detectCategory(project)
      const languageNames = detectLanguages(project)

      const homepage = project.homepage || `https://projects.apache.org/project/${(project.pmc || project.name).toLowerCase()}`
      const repos = project.repository
      const repoUrl = Array.isArray(repos) ? repos[0] : repos

      // Get latest version from release array if available
      const latestRelease = project.release?.[0]
      const latestVersion = latestRelease?.revision || null
      const releaseDate = latestRelease?.created ? new Date(latestRelease.created) : null

      const cat = await prisma.category.upsert({ where: { name: category }, create: { name: category }, update: {} })

      const platformNames = ['macOS', 'Windows', 'Linux']
      const platforms = await Promise.all(
        platformNames.map((pName) =>
          prisma.platform.upsert({ where: { name: pName }, create: { name: pName }, update: {} })
        )
      )

      const languageRecords = await Promise.all(
        languageNames.map((lName) =>
          prisma.language.upsert({ where: { name: lName }, create: { name: lName }, update: {} })
        )
      )

      await prisma.library.upsert({
        where: { slug },
        create: {
          name,
          slug,
          shortSummary: description.slice(0, 200) || `${name} Apache project`,
          description: description || null,
          functionDesc: description || null,
          officialUrl: homepage,
          repositoryUrl: typeof repoUrl === 'string' ? repoUrl : null,
          costMinUSD: 0,
          costMaxUSD: 0,
          dataSource: 'apache-crawler',
          organizationId: apacheOrg.id,
          categories: { create: [{ categoryId: cat.id }] },
          platforms: { create: platforms.map((p) => ({ platformId: p.id })) },
          languages: { create: languageRecords.map((l) => ({ languageId: l.id })) },
          ...(latestVersion ? {
            versions: {
              create: [{
                name: latestVersion,
                releasedAt: releaseDate || undefined,
                notes: 'Latest release from Apache Software Foundation',
              }],
            },
          } : {}),
        },
        update: {
          shortSummary: description.slice(0, 200) || undefined,
          description: description || undefined,
          officialUrl: homepage,
          dataSource: 'apache-crawler',
        },
      })

      console.log(`  ✅  ${name} (${category})`)
      success++
    } catch (err) {
      console.log(`  ❌  ${project.name} — ${err}`)
      failed++
    }
    await new Promise((r) => setTimeout(r, 50))
  }

  console.log(`\nApache done: ${success} succeeded, ${failed} failed\n`)
  return { success, failed }
}

export { crawlApache }

if (require.main === module) {
  crawlApache().finally(() => prisma.$disconnect())
}
