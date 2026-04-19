/**
 * Backfill exampleCode for existing libraries — real source data only.
 *
 * Fetch strategy per library (stops at first hit):
 *  1. Stored `description` column (no HTTP)
 *  2a. npm-crawler  → npm registry JSON → readme + GitHub URL from repository.url
 *                  → jsdelivr CDN README fallback
 *  2b. pypi-crawler → PyPI JSON → info.description + project_urls GitHub link
 *  2c. apache-crawler → try github.com/apache/{project} directly
 *  3.  GitHub fallback → README.md / .rst / .txt / .markdown / QUICKSTART.md / INSTALL.md
 *                        via repositoryUrl or gitbox→GitHub conversion
 *
 * Run: pnpm backfill:examples
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BATCH_SIZE    = 500
const RATE_LIMIT_MS = 150

// ─────────────────────────────────────────────────────────────────────────────
// Code extraction — tries every known real-code format, returns first hit
// ─────────────────────────────────────────────────────────────────────────────

const LANG_PAT = /(?:js|javascript|ts|typescript|jsx|tsx|python|py|java|kotlin|scala|groovy|ruby|rust|go|c|cpp|c\+\+|shell|sh|bash|console|terminal|php|swift|yaml|json|xml|sql|r|perl|elixir|clojure|haskell)/

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

  // 6. RST literal block (any paragraph ending with ::)
  m = t.match(/\n[^\n]*::\n\n((?:[ \t]{3,}[^\n]*\n?){2,})/)
  if (m) {
    const code = m[1].replace(/^[ \t]{3,}/gm, '').trim()
    if (code.length >= 8) return code.slice(0, 2000)
  }

  // 7. Python doctest (>>> lines, 1+ consecutive — relaxed to single example)
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
    const code = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
    if (code.length >= 8) return code.slice(0, 2000)
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────────────────

function normaliseGitHubUrl(url: string): string | null {
  const m = url.match(/github\.com[/:]([^/\s]+)\/([^/.\s]+?)(?:\.git)?\s*$/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : null
}

// Convert Apache gitbox / SVN URLs to the GitHub mirror
function gitboxToGitHub(url: string): string | null {
  // gitbox.apache.org/repos/asf/kafka.git → github.com/apache/kafka
  const m = url.match(/(?:gitbox|svn)\.apache\.org\/(?:repos\/asf\/)?([^/.\s]+?)(?:\.git)?\s*$/)
  if (m) return `https://github.com/apache/${m[1]}`
  return null
}

// Returns the raw README text, trying multiple filenames
async function fetchGitHubReadme(githubUrl: string): Promise<string | null> {
  const m = githubUrl.match(/github\.com\/([^/\s]+)\/([^/\s]+)/)
  if (!m) return null
  const [, owner, repo] = m
  for (const file of [
    'README.md', 'README.rst', 'README.txt', 'README.markdown',
    'QUICKSTART.md', 'INSTALL.md', 'docs/README.md', 'doc/README.md',
  ]) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`)
      if (res.ok) return res.text()
    } catch { /* try next */ }
  }
  return null
}

// npm: readme + GitHub URL from registry JSON
async function fetchNpmData(name: string): Promise<{ readme: string | null; githubUrl: string | null }> {
  const enc = name.startsWith('@') ? '@' + encodeURIComponent(name.slice(1)) : name
  try {
    const res = await fetch(`https://registry.npmjs.org/${enc}`)
    if (!res.ok) return { readme: null, githubUrl: null }
    const d = await res.json() as { readme?: string; repository?: { url?: string } }
    const rawRepoUrl = d.repository?.url ?? ''
    const cleanedUrl = rawRepoUrl
      .replace(/^git\+/, '').replace(/\.git$/, '')
      .replace(/^git:\/\/github\.com/, 'https://github.com')
      .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    const githubUrl = normaliseGitHubUrl(cleanedUrl)
    return { readme: d.readme ?? null, githubUrl }
  } catch {
    return { readme: null, githubUrl: null }
  }
}

// npm jsdelivr CDN: fetch README directly from the published package
async function fetchNpmJsdelivr(name: string): Promise<string | null> {
  const enc = name.startsWith('@') ? name : name
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/${enc}/README.md`)
    if (res.ok) return res.text()
  } catch { /* skip */ }
  return null
}

// PyPI: description + GitHub URL from project_urls
async function fetchPypiData(name: string): Promise<{ description: string | null; githubUrl: string | null }> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)
    if (!res.ok) return { description: null, githubUrl: null }
    const d = await res.json() as { info?: { description?: string; project_urls?: Record<string, string> } }
    const desc = d.info?.description ?? null
    const urls = Object.values(d.info?.project_urls ?? {})
    const githubUrl = urls.map(normaliseGitHubUrl).find(Boolean) ?? null
    return { description: desc && desc.trim().toUpperCase() !== 'UNKNOWN' ? desc : null, githubUrl }
  } catch {
    return { description: null, githubUrl: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   Backfill exampleCode — real data only  ║')
  console.log('╚══════════════════════════════════════════╝\n')

  const libs = await prisma.library.findMany({
    where: { OR: [{ exampleCode: null }, { exampleCode: '' }] },
    select: { id: true, name: true, dataSource: true, description: true, repositoryUrl: true },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  })

  const total = libs.length
  console.log(`Libraries to process : ${total}`)
  console.log(`Rate limit           : ${RATE_LIMIT_MS}ms between HTTP requests\n`)

  const counts: Record<string, { processed: number; updated: number; noCode: number; failed: number }> = {}
  const bump = (src: string, f: 'processed' | 'updated' | 'noCode' | 'failed') => {
    counts[src] ??= { processed: 0, updated: 0, noCode: 0, failed: 0 }
    counts[src][f]++
  }

  let totalUpdated = 0

  for (let i = 0; i < libs.length; i++) {
    const lib = libs[i]
    const src = lib.dataSource ?? 'unknown'
    const tag = `[${i + 1}/${total}]`
    bump(src, 'processed')

    try {
      let code: string | null = null

      // ── 1. Stored description (free, no HTTP) ──────────────────────────
      code = extractCode(lib.description)

      // ── 2. Source-specific API + embedded GitHub URL ───────────────────
      if (!code) {
        if (lib.dataSource === 'npm-crawler') {
          const { readme, githubUrl } = await fetchNpmData(lib.name)
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS))

          code = extractCode(readme)

          // npm registry readme missed — try GitHub URL from registry JSON
          if (!code && githubUrl) {
            const ghReadme = await fetchGitHubReadme(githubUrl)
            if (ghReadme) code = extractCode(ghReadme)
            await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
          }

          // Still nothing — try jsdelivr CDN for the published README
          if (!code) {
            const cdnReadme = await fetchNpmJsdelivr(lib.name)
            if (cdnReadme) code = extractCode(cdnReadme)
            await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
          }

        } else if (lib.dataSource === 'pypi-crawler') {
          const { description, githubUrl } = await fetchPypiData(lib.name)
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS))

          code = extractCode(description)

          // PyPI description empty/UNKNOWN — try project GitHub repo
          if (!code && githubUrl) {
            const ghReadme = await fetchGitHubReadme(githubUrl)
            if (ghReadme) code = extractCode(ghReadme)
            await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
          }

        } else if (lib.dataSource === 'apache-crawler') {
          // Apache projects almost always mirror to github.com/apache/{name}
          const apacheName = lib.name.replace(/^Apache\s+/i, '').toLowerCase().replace(/\s+/g, '-')
          const apacheGhUrl = `https://github.com/apache/${apacheName}`
          const ghReadme = await fetchGitHubReadme(apacheGhUrl)
          if (ghReadme) code = extractCode(ghReadme)
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
        }
      }

      // ── 3. GitHub fallback via stored repositoryUrl ────────────────────
      if (!code && lib.repositoryUrl) {
        // Try direct GitHub URL normalisation first
        let ghUrl = normaliseGitHubUrl(lib.repositoryUrl)
        // Fall back to gitbox/SVN → GitHub conversion for Apache projects
        if (!ghUrl) ghUrl = gitboxToGitHub(lib.repositoryUrl)
        if (ghUrl) {
          const ghReadme = await fetchGitHubReadme(ghUrl)
          if (ghReadme) code = extractCode(ghReadme)
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
        }
      }

      // ── Save or report ─────────────────────────────────────────────────
      if (code) {
        await prisma.library.update({ where: { id: lib.id }, data: { exampleCode: code } })
        bump(src, 'updated')
        totalUpdated++
        console.log(`  ✅  ${tag} ${lib.name}  [${src}]`)
      } else {
        bump(src, 'noCode')
        console.log(`  ⚠️  ${tag} ${lib.name}  [${src}]  (no real code found anywhere)`)
      }

    } catch (err) {
      bump(src, 'failed')
      console.error(`  ❌  ${tag} ${lib.name}  [${src}]:`, err instanceof Error ? err.message : err)
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  console.log('  Breakdown by dataSource')
  console.log('══════════════════════════════════════════')

  for (const [source, c] of Object.entries(counts).sort()) {
    const pct = c.processed > 0 ? `${Math.round((c.updated / c.processed) * 100)}% hit` : ''
    console.log(`\n  ${source}  (${c.processed} processed, ${pct})`)
    console.log(`    updated : ${c.updated}`)
    console.log(`    no code : ${c.noCode}  ← README exists but no extractable code block`)
    console.log(`    failed  : ${c.failed}`)
  }

  console.log('\n──────────────────────────────────────────')
  console.log(`  Updated this run : ${totalUpdated}`)
  console.log(`  Still missing    : ${total - totalUpdated}  (truly no code available)`)
  console.log('──────────────────────────────────────────\n')

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Fatal:', err)
  prisma.$disconnect().finally(() => process.exit(1))
})
