/**
 * Backfill exampleCode for existing libraries — real source data only.
 *
 * Fetch strategy per library (stops at first non-install-only hit):
 *  1.  Stored description column (no HTTP)
 *  2a. npm-crawler   → npm registry JSON readme  → GitHub URL from repository.url
 *                    → jsdelivr CDN README fallback
 *  2b. pypi-crawler  → PyPI JSON description  → project_urls GitHub link
 *  2c. apache-crawler → gitboxToGitHub(repositoryUrl) first, then name-guess fallback
 *  2d. Any source    → officialUrl, if it contains github.com
 *  3.  GitHub fallback via stored repositoryUrl (normalise or gitbox→GitHub)
 *
 * Extraction order (per README/text):
 *  i.  Code from a "Usage / Examples / Getting Started" section
 *  ii. First non-install-only language-tagged fenced block
 *  iii. Other fenced / RST / indented / HTML blocks (any format)
 *
 * Run:
 *   pnpm backfill:examples
 *   pnpm backfill:examples -- --dry-run
 *   pnpm backfill:examples -- --goal=80
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── CLI flags ─────────────────────────────────────────────────────────────────
const IS_DRY_RUN = process.argv.includes('--dry-run')
const goalArg    = process.argv.find(a => /^--goal=\d+$/.test(a))
const GOAL       = goalArg ? parseInt(goalArg.split('=')[1], 10) : 130

const BATCH_SIZE    = 500   // max libraries fetched from DB at once
const RATE_LIMIT_MS = 200   // ms between HTTP requests
const FETCH_TIMEOUT = 10_000 // ms before a single HTTP call is abandoned

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT): Promise<Response | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SLIBDirectory-backfill/1.0 (educational project)' },
    })
    return res.ok ? res : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function normaliseGitHubUrl(url: string): string | null {
  const m = url.match(/github\.com[/:]([^/\s]+)\/([^/.\s]+?)(?:\.git)?\s*$/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : null
}

// Apache gitbox / SVN → GitHub mirror
function gitboxToGitHub(url: string): string | null {
  // https://gitbox.apache.org/repos/asf/kafka.git  →  github.com/apache/kafka
  const m = url.match(/(?:gitbox|svn)\.apache\.org\/(?:repos\/asf\/)?([^/.\s]+?)(?:\.git)?\s*$/)
  return m ? `https://github.com/apache/${m[1]}` : null
}

// Returns raw README text, trying multiple filenames in order
async function fetchGitHubReadme(githubUrl: string): Promise<string | null> {
  const m = githubUrl.match(/github\.com\/([^/\s]+)\/([^/\s]+)/)
  if (!m) return null
  const [, owner, repo] = m
  const filenames = [
    'README.md', 'README.rst', 'README.txt', 'README.markdown',
    'USAGE.md',  'EXAMPLES.md', 'QUICKSTART.md', 'GETTING_STARTED.md',
    'INSTALL.md', 'docs/README.md', 'doc/README.md', 'doc/usage.rst',
  ]
  for (const file of filenames) {
    try {
      const res = await fetchWithTimeout(
        `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`,
      )
      if (res) {
        const text = await res.text()
        if (text.trim().length > 50) return text
      }
    } catch { /* try next file */ }
    await sleep(RATE_LIMIT_MS)
  }
  return null
}

// npm registry → readme text + GitHub URL
async function fetchNpmData(name: string): Promise<{ readme: string | null; githubUrl: string | null }> {
  const enc = name.startsWith('@') ? '@' + encodeURIComponent(name.slice(1)) : encodeURIComponent(name)
  try {
    const res = await fetchWithTimeout(`https://registry.npmjs.org/${enc}`)
    if (!res) return { readme: null, githubUrl: null }
    const d = await res.json() as { readme?: string; repository?: { url?: string } }
    const raw = (d.repository?.url ?? '')
      .replace(/^git\+/, '').replace(/\.git$/, '')
      .replace(/^git:\/\/github\.com/, 'https://github.com')
      .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    return { readme: d.readme ?? null, githubUrl: normaliseGitHubUrl(raw) }
  } catch {
    return { readme: null, githubUrl: null }
  }
}

// jsdelivr CDN: fetch README from published npm package
async function fetchNpmJsdelivr(name: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`https://cdn.jsdelivr.net/npm/${name}/README.md`)
    return res ? res.text() : null
  } catch { return null }
}

// PyPI → description text + GitHub URL from project_urls
async function fetchPypiData(name: string): Promise<{ description: string | null; githubUrl: string | null }> {
  try {
    const res = await fetchWithTimeout(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)
    if (!res) return { description: null, githubUrl: null }
    const d = await res.json() as { info?: { description?: string; project_urls?: Record<string, string> } }
    const desc  = d.info?.description ?? null
    const ghUrl = Object.values(d.info?.project_urls ?? {}).map(normaliseGitHubUrl).find(Boolean) ?? null
    const safeDesc = desc && desc.trim().toUpperCase() !== 'UNKNOWN' ? desc : null
    return { description: safeDesc, githubUrl: ghUrl }
  } catch {
    return { description: null, githubUrl: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Code extraction
// ─────────────────────────────────────────────────────────────────────────────

const LANG_PAT = /(?:js|javascript|ts|typescript|jsx|tsx|python|py|java|kotlin|scala|groovy|ruby|rust|go|c|cpp|c\+\+|php|swift|yaml|json|xml|sql|r|perl|elixir|clojure|haskell)/

// Returns true when the snippet is not useful as a usage example — only install/build commands
function isLowQualitySnippet(code: string): boolean {
  const lines = code.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return true
  const installRe = /^(?:\$\s+)?(?:npm|yarn|pnpm|pip[23]?|gem|cargo|go\s+get|composer|apt(?:-get)?|brew|conda)\s+(?:install|add|i|require|get|update)\b/i
  const buildRe   = /^(?:mvn|gradle|ant|make|cmake|bazel|sbt|lein|mix|cabal)\s+/i
  const commentRe = /^(?:#|\/\/|<!--)\s*/
  const shebangRe = /^#!\//
  const meaningfulLines = lines.filter(l =>
    !installRe.test(l) && !buildRe.test(l) &&
    !commentRe.test(l) && !shebangRe.test(l) && l !== '' && l !== '$',
  )
  return meaningfulLines.length === 0
}

// Core extractor: tries all known real-code formats and returns first hit
function extractCode(raw: string | undefined | null): string | null {
  if (!raw || raw.trim().length < 5) return null
  if (raw.trim().toUpperCase() === 'UNKNOWN') return null

  const t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 1. Fenced ``` — language-tagged
  let m = t.match(new RegExp('```' + LANG_PAT.source + '[ \\t]*\\n([\\s\\S]{8,}?)\\n```'))
  if (m) return m[1].trim().slice(0, 2000)

  // 2. Fenced ~~~ — language-tagged
  m = t.match(new RegExp('~~~' + LANG_PAT.source + '[ \\t]*\\n([\\s\\S]{8,}?)\\n~~~'))
  if (m) return m[1].trim().slice(0, 2000)

  // 3. Untagged ``` fenced block
  m = t.match(/```[ \t]*\n([\s\S]{8,}?)\n```/)
  if (m) return m[1].trim().slice(0, 2000)

  // 4. Untagged ~~~ fenced block
  m = t.match(/~~~[ \t]*\n([\s\S]{8,}?)\n~~~/)
  if (m) return m[1].trim().slice(0, 2000)

  // 5. RST .. code-block:: / .. sourcecode:: / .. code::
  m = t.match(/\.\.\s+(?:code(?:-block)?|sourcecode)::\s*[\w+-]*\s*\n\n((?:[ \t]{2,}[^\n]*\n?)+)/)
  if (m) {
    const code = m[1].replace(/^[ \t]{2,}/gm, '').trim()
    if (code.length >= 8) return code.slice(0, 2000)
  }

  // 6. RST literal block (paragraph ending with ::)
  m = t.match(/\n[^\n]*::\n\n((?:[ \t]{3,}[^\n]*\n?){2,})/)
  if (m) {
    const code = m[1].replace(/^[ \t]{3,}/gm, '').trim()
    if (code.length >= 8) return code.slice(0, 2000)
  }

  // 7. Python doctest (>>> lines)
  m = t.match(/((?:>>>[ \t][^\n]*\n(?:\.\.\.[ \t][^\n]*\n)*(?:[^\n>][^\n]*\n)?){1,})/)
  if (m && m[1].trim().length >= 8) return m[1].trim().slice(0, 2000)

  // 8. Markdown 4-space / tab indented block (3+ lines after blank line)
  m = t.match(/\n\n((?:(?:    |\t)[^\n]+\n){3,})/)
  if (m) {
    const code = m[1].replace(/^(?:    |\t)/gm, '').trim()
    if (code.length >= 15) return code.slice(0, 2000)
  }

  // 9. HTML <pre><code> block
  m = t.match(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]{8,}?)<\/code>[\s\S]*?<\/pre>/i)
  if (m) {
    const code = m[1]
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
    if (code.length >= 8) return code.slice(0, 2000)
  }

  return null
}

/**
 * Smarter extraction: first looks in a "Usage / Examples / Getting Started"
 * section (so we skip installation blocks at the top), then scans all fenced
 * blocks for the first non-low-quality one, then tries every other format.
 * Returns null if only install/build commands are found — letting the caller
 * try a better source (e.g. GitHub README) rather than saving garbage.
 */
function extractBestCode(text: string): string | null {
  if (!text || text.trim().length < 5) return null

  // ── i. Markdown section-based extraction ─────────────────────────────────
  const mdSectionRe = /(?:^|\n)#{1,3}[ \t]+(?:Usage|Getting\s+Started|Quick[- ]?Start|Examples?|Basic\s+Usage|Overview|Tutorial|How\s+to\s+Use|Sample[s]?|Demo)\b[^\n]*\n/im
  const mdMatch = text.match(mdSectionRe)
  if (mdMatch?.index !== undefined) {
    const start   = mdMatch.index + mdMatch[0].length
    const slice   = text.slice(start, start + 4000)
    const nextH   = slice.match(/\n#{1,3}[ \t]+\w/)
    const content = nextH?.index !== undefined ? slice.slice(0, nextH.index) : slice
    const c = extractCode(content)
    if (c && !isLowQualitySnippet(c)) return c
  }

  // ── ii. RST section-based extraction ─────────────────────────────────────
  // RST uses underline markers (===, ---, ~~~) instead of # headings
  const rstSectionRe = /\n(Usage|Examples?|Getting\s+Started|Quick\s+Start|Tutorial|Overview)\s*\n[-=~^"'`*+#]{3,}\n/im
  const rstMatch = text.match(rstSectionRe)
  if (rstMatch?.index !== undefined) {
    const start   = rstMatch.index + rstMatch[0].length
    const content = text.slice(start, start + 4000)
    const c = extractCode(content)
    if (c && !isLowQualitySnippet(c)) return c
  }

  // ── iii. Scan all fenced blocks — return first non-low-quality one ────────
  const fenceRe = /```(?:[\w+-]+)?[ \t]*\n([\s\S]{8,}?)\n```/g
  let match: RegExpExecArray | null
  while ((match = fenceRe.exec(text)) !== null) {
    const candidate = match[1].trim().slice(0, 2000)
    if (!isLowQualitySnippet(candidate)) return candidate
  }

  // ── iv. Non-fenced formats (RST code-block, doctest, indented, HTML) ──────
  // Only extract if the result is not low-quality
  const fallback = extractCode(text)
  if (fallback && !isLowQualitySnippet(fallback)) return fallback

  // Return null — signals the caller to try a better data source
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║   SLIB — Backfill exampleCode (real source data only)    ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(IS_DRY_RUN ? '\n  MODE: DRY RUN — nothing will be written to the database\n'
                          : '\n  MODE: LIVE — will update database\n')
  console.log(`  Goal            : ${GOAL} successful backfills`)
  console.log(`  Rate limit      : ${RATE_LIMIT_MS}ms between HTTP calls`)
  console.log(`  Fetch timeout   : ${FETCH_TIMEOUT}ms per request\n`)

  // ── Fetch all libraries that are missing exampleCode ──────────────────────
  const libs = await prisma.library.findMany({
    where: { OR: [{ exampleCode: null }, { exampleCode: '' }] },
    select: {
      id:            true,
      name:          true,
      dataSource:    true,
      description:   true,
      repositoryUrl: true,
      officialUrl:   true,
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  })

  const totalMissing = libs.length
  console.log(`  Libraries missing exampleCode : ${totalMissing}`)
  console.log(`  Processing up to             : ${Math.min(totalMissing, BATCH_SIZE)}\n`)

  if (totalMissing === 0) {
    console.log('  Nothing to do — all libraries already have exampleCode.')
    await prisma.$disconnect()
    return
  }

  // ── Print selected libraries ───────────────────────────────────────────────
  console.log('─'.repeat(62))
  console.log('  Libraries selected for backfill:')
  console.log('─'.repeat(62))
  for (const lib of libs) {
    const repoStr  = lib.repositoryUrl ? `  repo=${lib.repositoryUrl.slice(0, 50)}` : ''
    console.log(`  • [${lib.dataSource ?? 'unknown'}]  ${lib.name}${repoStr}`)
  }
  console.log('─'.repeat(62) + '\n')

  // ── Per-source counters ────────────────────────────────────────────────────
  const counts: Record<string, { processed: number; updated: number; noCode: number; failed: number }> = {}
  const bump = (src: string, f: 'processed' | 'updated' | 'noCode' | 'failed') => {
    counts[src] ??= { processed: 0, updated: 0, noCode: 0, failed: 0 }
    counts[src][f]++
  }

  let totalUpdated = 0

  for (let i = 0; i < libs.length; i++) {
    if (totalUpdated >= GOAL) {
      console.log(`\n  🎯  Goal of ${GOAL} reached — stopping early.\n`)
      break
    }

    const lib = libs[i]
    const src = lib.dataSource ?? 'unknown'
    const tag = `[${i + 1}/${totalMissing} | ✅ ${totalUpdated}/${GOAL}]`
    bump(src, 'processed')

    try {
      let code: string | null = null

      // ── Step 1: Stored description (free, no HTTP) ─────────────────────
      code = extractBestCode(lib.description ?? '')

      // ── Step 2: Source-specific APIs ───────────────────────────────────
      if (!code) {
        if (src === 'npm-crawler') {
          // 2a-i: npm registry README + embedded GitHub URL
          const { readme, githubUrl } = await fetchNpmData(lib.name)
          await sleep(RATE_LIMIT_MS)
          code = extractBestCode(readme ?? '')

          // 2a-ii: GitHub README via URL from registry JSON
          if (!code && githubUrl) {
            const ghReadme = await fetchGitHubReadme(githubUrl)
            if (ghReadme) code = extractBestCode(ghReadme)
            await sleep(RATE_LIMIT_MS)
          }

          // 2a-iii: jsdelivr CDN fallback
          if (!code) {
            const cdnReadme = await fetchNpmJsdelivr(lib.name)
            if (cdnReadme) code = extractBestCode(cdnReadme)
            await sleep(RATE_LIMIT_MS)
          }

        } else if (src === 'pypi-crawler') {
          // 2b-i: PyPI JSON description + embedded GitHub URL
          const { description, githubUrl } = await fetchPypiData(lib.name)
          await sleep(RATE_LIMIT_MS)
          code = extractBestCode(description ?? '')

          // 2b-ii: GitHub README via project_urls
          if (!code && githubUrl) {
            const ghReadme = await fetchGitHubReadme(githubUrl)
            if (ghReadme) code = extractBestCode(ghReadme)
            await sleep(RATE_LIMIT_MS)
          }

        } else if (src === 'apache-crawler') {
          // 2c-i: gitboxToGitHub conversion of repositoryUrl (most reliable)
          if (lib.repositoryUrl) {
            const ghUrl = gitboxToGitHub(lib.repositoryUrl)
                       ?? normaliseGitHubUrl(lib.repositoryUrl)
            if (ghUrl) {
              const ghReadme = await fetchGitHubReadme(ghUrl)
              if (ghReadme) code = extractBestCode(ghReadme)
              await sleep(RATE_LIMIT_MS)
            }
          }

          // 2c-ii: name-guessing fallback if repositoryUrl didn't work
          if (!code) {
            const apacheName = lib.name
              .replace(/^Apache\s+/i, '').toLowerCase().replace(/\s+/g, '-')
            const guessUrl = `https://github.com/apache/${apacheName}`
            const ghReadme = await fetchGitHubReadme(guessUrl)
            if (ghReadme) code = extractBestCode(ghReadme)
            await sleep(RATE_LIMIT_MS)
          }
        }
      }

      // ── Step 2d: officialUrl GitHub shortcut (any source) ──────────────
      if (!code && lib.officialUrl) {
        const ghUrl = normaliseGitHubUrl(lib.officialUrl)
        if (ghUrl) {
          const ghReadme = await fetchGitHubReadme(ghUrl)
          if (ghReadme) code = extractBestCode(ghReadme)
          await sleep(RATE_LIMIT_MS)
        }
      }

      // ── Step 3: GitHub fallback via stored repositoryUrl ───────────────
      if (!code && lib.repositoryUrl) {
        const ghUrl = normaliseGitHubUrl(lib.repositoryUrl)
                   ?? gitboxToGitHub(lib.repositoryUrl)
        if (ghUrl) {
          const ghReadme = await fetchGitHubReadme(ghUrl)
          if (ghReadme) code = extractBestCode(ghReadme)
          await sleep(RATE_LIMIT_MS)
        }
      }

      // ── Save or report ──────────────────────────────────────────────────
      if (code) {
        if (!IS_DRY_RUN) {
          await prisma.library.update({
            where: { id: lib.id },
            data:  { exampleCode: code },
          })
        }
        bump(src, 'updated')
        totalUpdated++
        const preview = code.slice(0, 60).replace(/\n/g, '↵')
        console.log(`  ✅  ${tag}  ${lib.name}  [${src}]`)
        console.log(`       preview: ${preview}…`)
      } else {
        bump(src, 'noCode')
        console.log(`  ⚠️   ${tag}  ${lib.name}  [${src}]  (no real code found)`)
      }

    } catch (err) {
      bump(src, 'failed')
      console.error(`  ❌  ${tag}  ${lib.name}  [${src}]:`, err instanceof Error ? err.message : err)
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(62))
  console.log('  RESULTS BY DATA SOURCE')
  console.log('═'.repeat(62))

  for (const [source, c] of Object.entries(counts).sort()) {
    const hitPct = c.processed > 0 ? `${Math.round((c.updated / c.processed) * 100)}%` : '-'
    console.log(`\n  ${source}  (${c.processed} libraries, ${hitPct} hit rate)`)
    console.log(`    ✅  updated : ${c.updated}`)
    console.log(`    ⚠️   no code : ${c.noCode}   ← README exists but no extractable code`)
    console.log(`    ❌  failed  : ${c.failed}`)
  }

  console.log('\n' + '─'.repeat(62))
  console.log(`  Updated this run  : ${totalUpdated}`)
  console.log(`  Still missing     : ${totalMissing - totalUpdated}  (no extractable code found)`)
  console.log(`  Goal reached      : ${totalUpdated >= GOAL ? `YES (${totalUpdated}/${GOAL})` : `NO (${totalUpdated}/${GOAL})`}`)
  if (IS_DRY_RUN) console.log('\n  ⚠️  DRY RUN — no database changes were made')
  console.log('─'.repeat(62) + '\n')

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Fatal:', err)
  prisma.$disconnect().finally(() => process.exit(1))
})
