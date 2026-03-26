/**
 * Crawler Orchestrator
 * Runs all crawlers in sequence: npm → PyPI → Apache
 * Usage: pnpm crawl
 */

import { PrismaClient } from '@prisma/client'
import { crawlNpm } from './npm'
import { crawlPyPI } from './pypi'
import { crawlApache } from './apache'

const prisma = new PrismaClient()

async function main() {
  console.log('╔════════════════════════════════════════╗')
  console.log('║   LibFinder — Automated Data Crawler  ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('\nSources: npm registry · PyPI · Apache Software Foundation\n')

  const start = Date.now()

  try {
    const npmResult = await crawlNpm()
    const pypiResult = await crawlPyPI()
    const apacheResult = await crawlApache()

    const totalSuccess = npmResult.success + pypiResult.success + apacheResult.success
    const totalFailed = npmResult.failed + pypiResult.failed + apacheResult.failed
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    // Count total libraries now
    const total = await prisma.library.count()

    console.log('╔════════════════════════════════════════╗')
    console.log('║              Crawl Complete            ║')
    console.log('╚════════════════════════════════════════╝')
    console.log(`  npm:     ${npmResult.success} libraries added/updated`)
    console.log(`  PyPI:    ${pypiResult.success} libraries added/updated`)
    console.log(`  Apache:  ${apacheResult.success} libraries added/updated`)
    console.log(`  ─────────────────────────────────────`)
    console.log(`  Total in DB: ${total} libraries`)
    console.log(`  Success: ${totalSuccess} | Failed: ${totalFailed}`)
    console.log(`  Time: ${elapsed}s`)
    console.log()
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Crawler failed:', err)
  process.exit(1)
})
