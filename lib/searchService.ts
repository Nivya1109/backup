/**
 * searchService.ts — Advanced search engine for LibFinder
 *
 * Architecture:
 *   1. Query pre-processing  — normalize, tokenize, expand synonyms
 *   2. Typesense (primary)   — fuzzy, typo-tolerant, weighted, prefix search
 *   3. Postgres (fallback)   — multi-term expanded LIKE + pg_trgm similarity
 *
 * Key capabilities added over the original:
 *   - Typo tolerance (num_typos:2 in Typesense; trigram sim in Postgres)
 *   - Synonym expansion ("auth" → also searches "authentication", "oauth", "jwt" …)
 *   - Weighted ranking   (name match >> functionDesc >> summary >> tags >> description)
 *   - Prefix matching    ("plas" → "Playwright")
 *   - Multi-term Postgres (each token searched independently, results merged)
 *   - Intent mapping     ("send emails node" surfaces Nodemailer-class results)
 */

import { searchClient, SIP_COLLECTION } from './search'
import { prisma } from './prisma'
import { expandQuery } from './search/expandQuery'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchParams {
  query?: string
  category?: string
  platform?: string
  language?: string
  licenseType?: string
  page?: number
  pageSize?: number
}

export interface SearchResult {
  id: string
  name: string
  slug: string
  shortSummary: string | null
  description: string | null
  functionDesc: string | null
  costMinUSD: number | null
  costMaxUSD: number | null
  developer: string | null
  organization: string | null
  categories: string[]
  platforms: string[]
  languages: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Synonym dictionary
// Keeps search intent broad without requiring exact keyword matches.
// ---------------------------------------------------------------------------

const SYNONYMS: Record<string, string[]> = {
  // HTTP / Networking
  http:         ['networking', 'request', 'fetch', 'rest', 'api client'],
  api:          ['rest', 'http', 'endpoint', 'service', 'client'],
  rest:         ['http', 'api', 'restful', 'web service'],
  fetch:        ['http', 'request', 'ajax'],
  networking:   ['http', 'socket', 'tcp', 'udp'],
  websocket:    ['real-time', 'socket', 'ws', 'event'],
  grpc:         ['rpc', 'protobuf', 'streaming'],

  // Authentication & Security
  auth:           ['authentication', 'authorization', 'login', 'oauth', 'jwt', 'session', 'passport'],
  authentication: ['auth', 'login', 'oauth', 'jwt', 'session', 'identity'],
  authorization:  ['auth', 'permissions', 'roles', 'access control', 'rbac'],
  login:          ['auth', 'authentication', 'session', 'sso'],
  jwt:            ['authentication', 'token', 'auth', 'jsonwebtoken'],
  oauth:          ['auth', 'authentication', 'oauth2', 'openid'],
  session:        ['auth', 'authentication', 'cookie', 'state'],
  password:       ['hash', 'bcrypt', 'argon2', 'salt', 'security'],
  hash:           ['cryptography', 'security', 'bcrypt', 'argon2'],
  encryption:     ['security', 'cryptography', 'crypto', 'tls', 'ssl'],
  security:       ['auth', 'encryption', 'cryptography', 'tls', 'ssl', 'cors', 'helmet'],
  crypto:         ['cryptography', 'encryption', 'security', 'hash'],

  // Database
  db:           ['database', 'orm', 'sql', 'nosql', 'query'],
  database:     ['db', 'orm', 'sql', 'postgres', 'mysql', 'mongodb', 'storage'],
  orm:          ['database', 'db', 'query', 'sql', 'mapper'],
  sql:          ['database', 'query', 'postgres', 'mysql', 'sqlite'],
  nosql:        ['mongodb', 'database', 'document', 'dynamodb', 'cassandra'],
  postgres:     ['postgresql', 'database', 'sql', 'pg'],
  postgresql:   ['postgres', 'database', 'sql'],
  mysql:        ['database', 'sql', 'mariadb'],
  mongodb:      ['nosql', 'database', 'document', 'mongoose'],
  redis:        ['cache', 'caching', 'in-memory', 'key-value'],
  cache:        ['redis', 'caching', 'in-memory', 'memcached'],
  migration:    ['database', 'schema', 'alembic', 'flyway'],

  // Testing
  test:         ['testing', 'unit test', 'jest', 'vitest', 'mocha', 'pytest', 'spec', 'cypress', 'playwright'],
  testing:      ['test', 'unit test', 'e2e', 'integration', 'assertion', 'jest', 'vitest', 'cypress', 'playwright'],
  mock:         ['testing', 'stub', 'fake', 'spy', 'sinon'],
  e2e:          ['testing', 'end to end', 'playwright', 'cypress', 'browser'],
  unit:         ['testing', 'unit test', 'assertion', 'expect'],
  benchmark:    ['performance', 'testing', 'profiling'],

  // Data Science & ML
  ml:               ['machine learning', 'tensorflow', 'pytorch', 'ai', 'model'],
  'machine learning': ['ml', 'ai', 'deep learning', 'neural network', 'sklearn'],
  ai:               ['machine learning', 'ml', 'deep learning', 'llm', 'nlp'],
  'deep learning':  ['ml', 'ai', 'neural network', 'tensorflow', 'pytorch'],
  nlp:              ['natural language', 'text', 'transformers', 'bert', 'llm'],
  data:             ['data science', 'pandas', 'numpy', 'dataframe', 'analysis'],
  dataframe:        ['pandas', 'data', 'data science', 'csv', 'tabular'],
  visualization:    ['charts', 'graph', 'plot', 'matplotlib', 'plotly'],
  charts:           ['visualization', 'recharts', 'chartjs', 'graph', 'plot'],
  graph:            ['charts', 'visualization', 'plot'],
  statistics:       ['data science', 'scipy', 'numpy', 'analysis'],

  // Logging & Monitoring
  log:          ['logging', 'logger', 'monitoring', 'observability'],
  logging:      ['log', 'logger', 'monitoring', 'structured', 'winston', 'pino'],
  monitoring:   ['logging', 'metrics', 'observability', 'tracing', 'apm'],
  metrics:      ['monitoring', 'prometheus', 'observability', 'telemetry'],
  tracing:      ['monitoring', 'opentelemetry', 'jaeger', 'observability'],

  // Messaging & Events
  queue:        ['messaging', 'kafka', 'rabbitmq', 'events', 'async'],
  messaging:    ['queue', 'kafka', 'events', 'pub sub', 'rabbitmq', 'amqp'],
  kafka:        ['messaging', 'queue', 'events', 'stream', 'kafkajs'],
  events:       ['messaging', 'queue', 'event driven', 'pubsub', 'emitter'],
  pubsub:       ['messaging', 'events', 'kafka', 'rabbitmq'],
  worker:       ['queue', 'background job', 'bull', 'celery', 'task'],
  'background job': ['queue', 'worker', 'celery', 'bull', 'sidekiq'],

  // DevOps & Infrastructure
  devops:         ['infrastructure', 'ci/cd', 'docker', 'kubernetes', 'cloud'],
  infrastructure: ['devops', 'terraform', 'cloud', 'iac'],
  docker:         ['containers', 'devops', 'image', 'compose'],
  kubernetes:     ['containers', 'devops', 'orchestration', 'k8s'],
  cloud:          ['aws', 'gcp', 'azure', 'devops', 'infrastructure'],
  deploy:         ['devops', 'infrastructure', 'ci/cd', 'docker'],
  'ci/cd':        ['devops', 'pipeline', 'github actions', 'jenkins'],

  // UI / Frontend
  ui:         ['frontend', 'components', 'react', 'vue', 'framework', 'widget'],
  frontend:   ['ui', 'react', 'vue', 'angular', 'web', 'browser'],
  react:      ['ui', 'frontend', 'javascript', 'component', 'hooks'],
  vue:        ['ui', 'frontend', 'javascript', 'component', 'composition'],
  angular:    ['ui', 'frontend', 'typescript', 'component', 'rxjs'],
  svelte:     ['ui', 'frontend', 'javascript', 'component'],
  component:  ['ui', 'frontend', 'widget', 'element'],
  css:        ['styling', 'ui', 'frontend', 'tailwind', 'sass'],
  animation:  ['ui', 'frontend', 'motion', 'transition'],

  // Platforms & Languages (abbreviation expansion)
  node:       ['nodejs', 'javascript', 'npm', 'express'],
  nodejs:     ['node', 'javascript', 'npm'],
  python:     ['pip', 'pypi', 'py'],
  js:         ['javascript', 'node'],
  javascript: ['js', 'node', 'npm', 'typescript'],
  ts:         ['typescript', 'javascript'],
  typescript: ['ts', 'javascript', 'typed'],
  java:       ['jvm', 'spring', 'maven', 'gradle'],
  go:         ['golang', 'gopher'],
  golang:     ['go', 'gopher'],
  rust:       ['cargo', 'systems programming'],
  ruby:       ['rails', 'gem'],

  // State management (was entirely missing — added for use-case search)
  state:              ['state management', 'redux', 'zustand', 'recoil', 'mobx', 'jotai', 'store', 'global state'],
  'state management': ['redux', 'zustand', 'recoil', 'mobx', 'jotai', 'state', 'store', 'flux', 'atom'],
  redux:              ['state management', 'state', 'store', 'flux', 'react'],
  zustand:            ['state management', 'state', 'store', 'react'],
  mobx:               ['state management', 'state', 'store', 'observable', 'react'],

  // Use-case bigrams — phrase queries now map to specific library names
  'http client':      ['axios', 'fetch', 'got', 'ky', 'request', 'rest', 'node-fetch'],
  'api client':       ['axios', 'fetch', 'rest', 'request', 'sdk', 'http client'],
  'database orm':     ['prisma', 'sequelize', 'typeorm', 'drizzle', 'orm', 'database'],
  'form validation':  ['zod', 'yup', 'joi', 'formik', 'react hook form', 'validation', 'schema'],

  // Common intent phrases
  email:        ['smtp', 'nodemailer', 'mail', 'sendgrid', 'mailgun'],
  smtp:         ['email', 'mail', 'nodemailer'],
  pdf:          ['document', 'pdf generation', 'puppeteer'],
  'file upload': ['multipart', 'storage', 'upload', 'multer', 's3'],
  upload:       ['file upload', 'multipart', 'storage', 's3'],
  storage:      ['s3', 'file upload', 'blob', 'cloud storage'],
  'real-time':  ['websocket', 'socket', 'ws', 'socket.io', 'push'],
  scraping:     ['web scraping', 'cheerio', 'puppeteer', 'playwright', 'crawl'],
  crawler:      ['scraping', 'web scraping', 'spider', 'crawl'],
  validation:   ['schema', 'zod', 'yup', 'joi', 'form validation'],
  form:         ['validation', 'input', 'schema', 'formik', 'react hook form'],
  'pdf report': ['document', 'report', 'generation', 'template'],
  excel:        ['spreadsheet', 'xlsx', 'csv', 'data export'],
  image:        ['sharp', 'jimp', 'imagemagick', 'resize', 'thumbnail'],
  date:         ['time', 'datetime', 'moment', 'dayjs', 'date-fns', 'timezone'],
  time:         ['date', 'datetime', 'moment', 'dayjs', 'duration'],
  utility:      ['helper', 'lodash', 'underscore', 'ramda', 'tools'],
  connect:      ['database', 'postgres', 'mysql', 'connection', 'driver'],
}

// ---------------------------------------------------------------------------
// Intent detection — maps query phrases to expected result categories.
// Used for post-search re-ranking so intent-matching libraries always surface
// above libraries that merely share a keyword with the non-intent part of the query.
// ---------------------------------------------------------------------------

const INTENT_TO_CATEGORIES: Record<string, string[]> = {
  testing:            ['testing', 'test runner', 'end-to-end', 'unit test', 'e2e', 'assertion', 'coverage'],
  authentication:     ['authentication', 'auth', 'security', 'identity', 'oauth', 'jwt', 'session'],
  'http client':      ['http', 'networking', 'api client', 'request', 'rest client', 'http client'],
  logging:            ['logging', 'log', 'monitoring', 'logger'],
  database:           ['database', 'orm', 'query builder', 'sql'],
  'state management': ['state management', 'state', 'store'],
}

/**
 * Known JavaScript/TypeScript ecosystem libraries per intent.
 * These get a higher bonus (+200) than a generic category match (+100), which
 * is what was causing Apache AntUnit to rank above Jest — both were getting
 * the same +100 for having "testing" in their category.
 */
const INTENT_TOP_LIBRARIES: Record<string, string[]> = {
  testing:            ['jest', 'vitest', 'cypress', 'playwright', 'mocha', 'jasmine', 'react testing library', 'supertest', 'enzyme', 'ava', 'tap'],
  authentication:     ['next-auth', 'passport', 'auth0', 'jsonwebtoken', 'express-jwt', 'lucia', 'clerk', 'supertokens', 'keycloak'],
  'http client':      ['axios', 'got', 'ky', 'node-fetch', 'superagent', 'undici', 'wretch', 'redaxios'],
  logging:            ['winston', 'pino', 'morgan', 'bunyan', 'loglevel', 'log4js', 'signale'],
  database:           ['prisma', 'typeorm', 'sequelize', 'drizzle', 'mongoose', 'pg', 'mysql2', 'knex', 'kysely', 'slonik'],
  'state management': ['redux', 'zustand', 'recoil', 'jotai', 'mobx', 'valtio', 'xstate', 'effector'],
}

/** True when the query implies a JavaScript/Node.js context. */
function isJsContextQuery(query: string): boolean {
  const q = query.toLowerCase()
  return q.includes('react') || q.includes('node') || q.includes('javascript') ||
         q.includes('typescript') || q.includes('npm') || q.includes('next') ||
         q.includes('vue') || q.includes('angular') || q.includes('svelte')
}

/** Returns the dominant intent for a query, or null if none detected. */
function detectIntent(query: string): string | null {
  const q = query.toLowerCase()
  // Check multi-word intents first (longer phrase = more specific)
  if (q.includes('state management') || q.includes('global state') || q.includes('app state')) return 'state management'
  if (q.includes('http client') || q.includes('rest client') || q.includes('api client')) return 'http client'
  if (
    q.includes('react testing') || q.includes('testing react') ||
    q.includes('test react')    || q.includes('react test')    ||
    q.includes('test app')      || q.includes('test component')
  ) return 'testing'
  if (
    q.includes('login system') || q.includes('login page') ||
    q.includes('user auth')    || q.includes('sign in')    ||
    q.includes('login')        || q.includes('oauth')
  ) return 'authentication'
  // Single-word intents
  if (q === 'testing' || q.startsWith('test ') || q.endsWith(' test') || q.includes('testing')) return 'testing'
  if (q.includes(' auth') || q.startsWith('auth') || q.includes('jwt') || q.includes('session')) return 'authentication'
  if (q.includes('logging') || q.includes('logger')) return 'logging'
  if (q === 'orm' || q.includes(' orm') || q.startsWith('orm ') || q.includes('database')) return 'database'
  return null
}

/**
 * Tiered bonus score for a result against the detected intent.
 *
 * Tier 1 (+200): library name is in the known JS/TS ecosystem list for this intent.
 *   → Ensures Jest/Cypress rank above Apache AntUnit even though both have
 *     "testing" in their category (the old flat +100 made them tie).
 *
 * Tier 2 (+100): library's categories contain an intent keyword.
 *   → Generic "testing" libs that aren't in the top list (e.g. Java libs).
 *
 * Tier 3 (+40): name/summary/functionDesc contains an intent keyword, no category match.
 *   → Loose relevance signal; kept low so it can't beat a real category match.
 *
 * JS ecosystem bonus (+30): when query implies JavaScript context (contains "react",
 *   "node", etc.) and the library's languages include JS/TS.
 *   → Breaks ties between equally-scored JS and non-JS libraries.
 */
function intentBonus(result: SearchResult, intent: string, query = ''): number {
  const targetCats = INTENT_TO_CATEGORIES[intent] ?? []
  const topLibs    = INTENT_TOP_LIBRARIES[intent]  ?? []

  const name    = result.name.toLowerCase()
  const cats    = result.categories.map((c) => c.toLowerCase())
  const langs   = result.languages.map((l) => l.toLowerCase())
  const summary = (result.shortSummary ?? '').toLowerCase()
  const func    = (result.functionDesc ?? '').toLowerCase()

  let bonus = 0

  // Tier 1 — known top library for this intent
  if (topLibs.some((lib) => name === lib || (lib.length >= 4 && name.includes(lib)))) {
    bonus += 200
  }

  // Tier 2 — category signals the intent
  if (targetCats.some((tc) => cats.some((c) => c.includes(tc)))) {
    bonus += 100
  }

  // Tier 3 — only if no category match at all (avoids double-counting)
  if (bonus === 0 && targetCats.some((tc) => name.includes(tc) || summary.includes(tc) || func.includes(tc))) {
    bonus += 40
  }

  // JS ecosystem bonus — breaks ties when query implies JavaScript context
  if (
    isJsContextQuery(query) &&
    langs.some((l) => l.includes('javascript') || l.includes('typescript'))
  ) {
    bonus += 30
  }

  return bonus
}

/**
 * Re-orders results so intent-matching libraries appear before libraries that
 * only matched the non-intent part of the query (e.g. "react" in "react testing").
 * Uses a stable sort so Typesense/Postgres order is preserved within each bucket.
 */
function reRankByIntent(results: SearchResult[], query: string): SearchResult[] {
  const intent = detectIntent(query)
  if (!intent) return results
  return [...results]
    .map((r, idx) => ({ r, idx, bonus: intentBonus(r, intent, query) }))
    .sort((a, b) => b.bonus - a.bonus || a.idx - b.idx)
    .map((x) => x.r)
}

// ---------------------------------------------------------------------------
// Query pre-processor
// ---------------------------------------------------------------------------

interface ProcessedQuery {
  original: string       // raw user input
  normalized: string     // lowercased, cleaned
  tokens: string[]       // individual words from normalized query
  expanded: string       // normalized + synonym expansions, space-joined
  expandedTokens: string[] // individual tokens after expansion
}

function preprocessQuery(rawQuery: string): ProcessedQuery {
  const original = rawQuery.trim()

  // Normalize: lowercase, collapse whitespace, strip most punctuation
  const normalized = original
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return { original, normalized: '', tokens: [], expanded: '', expandedTokens: [] }
  }

  const tokens = normalized.split(' ').filter((t) => t.length > 1)
  const expandedSet = new Set<string>(tokens)

  // Expand single tokens
  for (const token of tokens) {
    const syns = SYNONYMS[token]
    if (syns) syns.forEach((s) => expandedSet.add(s))
  }

  // Expand bigrams (e.g. "machine learning", "send email")
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`
    const syns = SYNONYMS[bigram]
    if (syns) syns.forEach((s) => expandedSet.add(s))
  }

  const expandedTokens = Array.from(expandedSet)
  const expanded = expandedTokens.join(' ')

  return { original, normalized, tokens, expanded, expandedTokens }
}

// ---------------------------------------------------------------------------
// Typesense search
// ---------------------------------------------------------------------------

interface TypesenseDocument {
  id: string
  name: string
  slug: string
  shortSummary?: string
  functionDesc?: string
  description?: string
  tags?: string[]
  costMinUSD?: number
  costMaxUSD?: number
  developer?: string
  organization?: string
  categories: string[]
  platforms: string[]
  languages: string[]
}

interface TypesenseHit {
  document: TypesenseDocument
}

async function searchWithTypesense(params: SearchParams): Promise<SearchResponse> {
  const {
    query = '',
    category = '',
    platform = '',
    language = '',
    licenseType = '',
    page = 1,
    pageSize = 20,
  } = params

  const processed = preprocessQuery(query)

  // Use-case phrase expansion: detect multi-word intent patterns ("test react",
  // "http client", etc.) and add matching library names / keywords.
  // expandQuery returns [] when no phrase matches → falls back to original query.
  // This runs ON TOP of the existing per-word SYNONYMS expansion in preprocessQuery.
  const useCaseTerms = expandQuery(query)

  // KEY FIX: when use-case phrases are detected, use the RAW original query
  // as the base — NOT the SYNONYMS-expanded version.
  //
  // Why: SYNONYMS expansion of "react testing" adds generic terms like
  // "ui", "frontend", "javascript", "component" which match Apache libraries
  // and other unrelated results. The specific library names from useCaseMap
  // (e.g. "react testing library", "jest", "vitest") are already precise
  // enough to find the right results without that noise.
  //
  // When NO use-case match: fall back to SYNONYMS expansion as before
  // (unchanged behaviour for all existing searches).
  const baseForTypesense = useCaseTerms.length > 0
    ? query.trim()
    : (processed.expanded || query.trim())

  const tsQuery = baseForTypesense
    ? [baseForTypesense, ...useCaseTerms].join(' ').trim()
    : '*'
  const isWildcard = !tsQuery || tsQuery === '*'

  const intentDetected = detectIntent(query)

  // Debug logs — shows what query is actually sent to Typesense
  console.log('[Search] Original Query  :', query)
  console.log('[Search] Use-case terms  :', useCaseTerms)
  console.log('[Search] Final TS query  :', tsQuery)
  console.log('[Search] Detected intent :', intentDetected ?? 'none')

  const filters: string[] = []
  if (category)    filters.push(`categories:=[${category}]`)
  if (platform)    filters.push(`platforms:=[${platform}]`)
  if (language)    filters.push(`languages:=[${language}]`)
  if (licenseType === 'free') filters.push('costMinUSD:=0')
  if (licenseType === 'paid') filters.push('costMinUSD:>0')

  // KEY: when intent is detected, fetch a larger pool so re-ranking has enough
  // candidates to promote intent-matching libraries above name-match-only results.
  // Typesense paginates server-side — if we only fetch `pageSize` results and
  // testing libraries happen to be ranked #21+ by BM25, re-ranking never sees them.
  const fetchSize = intentDetected ? Math.min(pageSize * 3, 60) : pageSize

  const tsParams = {
    q: tsQuery,
    // Field order = relevance weight order.
    // name gets the most weight (15), tags/functionDesc are secondary (6),
    // summary is tertiary (4), description/categories last (1).
    query_by: 'name,tags,functionDesc,shortSummary,description,categories,platforms,languages,developer,organization',
    query_by_weights: '15,6,6,4,2,1,1,1,3,3',

    // Typo tolerance: allow up to 2 edits for words ≥ 7 chars
    num_typos: 2,
    typo_tokens_threshold: 1,    // start applying typos even for sparse results

    // Prefix matching: "reac" → React, "plas" → Playwright
    prefix: true,

    // Drop tokens that match nothing (avoids 0-result for long queries)
    drop_tokens_threshold: 1,

    // Infix matching for substrings in name field (e.g. "mongo" → "Mongoose")
    infix: 'fallback' as const,

    filter_by: filters.length > 0 ? filters.join(' && ') : undefined,

    sort_by: isWildcard ? 'name:asc' : '_text_match:desc,name:asc',

    // Always start from page 1 when intent-fetching a larger pool;
    // we handle pagination ourselves via slice() below.
    page: intentDetected ? 1 : page,
    per_page: fetchSize,

    // Return highlighted snippets for UI
    highlight_full_fields: 'name',
  }

  const searchResults = await searchClient!
    .collections(SIP_COLLECTION)
    .documents()
    .search(tsParams)

  const rawResults: SearchResult[] = ((searchResults.hits as TypesenseHit[]) || []).map((hit) => ({
    id: hit.document.id,
    name: hit.document.name,
    slug: hit.document.slug,
    shortSummary: hit.document.shortSummary || null,
    description: hit.document.description || null,
    functionDesc: hit.document.functionDesc || null,
    costMinUSD: hit.document.costMinUSD ?? null,
    costMaxUSD: hit.document.costMaxUSD ?? null,
    developer: hit.document.developer || null,
    organization: hit.document.organization || null,
    categories: hit.document.categories || [],
    platforms: hit.document.platforms || [],
    languages: hit.document.languages || [],
  }))

  // Re-rank so intent-matching libraries surface above libraries that only
  // matched the non-intent word (e.g. "React" in "react testing").
  // Then slice the re-ranked pool down to the requested page window.
  const reRanked = reRankByIntent(rawResults, query)

  // Debug: show top-5 results after re-ranking with their intent bonus
  if (intentDetected) {
    console.log('[Search] Top results after re-rank:')
    reRanked.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} | cats: [${r.categories.join(', ')}] | langs: [${r.languages.join(', ')}] | bonus: ${intentBonus(r, intentDetected, query)}`)
    })
  }

  const start = intentDetected ? (page - 1) * pageSize : 0
  const results = intentDetected
    ? reRanked.slice(start, start + pageSize)
    : reRanked

  return {
    results,
    pagination: {
      page,
      pageSize,
      total: searchResults.found || 0,
      totalPages: Math.ceil((searchResults.found || 0) / pageSize),
    },
  }
}

// ---------------------------------------------------------------------------
// Postgres fallback — 3-pass search with relevance-ranked sorting
//
// Pass 1 (precise):   AND all original tokens across all fields
// Pass 2 (broader):   OR synonym expansions — only when pass 1 returns 0
// Pass 3 (trigram):   pg_trgm similarity — only when pass 2 returns 0
//
// Sorting (client-side after fetch):
//   1. Exact name match
//   2. Name starts with query
//   3. Name contains query
//   4. Summary/functionDesc contains query
//   5. Everything else (alphabetical)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Full-text search via PostgreSQL tsvector / plainto_tsquery
//
// Returns matching library IDs ranked by ts_rank (name weighted 5×, summary 2×,
// functionDesc 2×, description 1×). Handles word boundaries correctly so
// "orm" does NOT match "information" or "performance".
// ---------------------------------------------------------------------------

interface RawIdRow { id: string }

async function ftSearch(
  tsQuery: string,
  facetIds: Set<string> | null,
  page: number,
  pageSize: number,
): Promise<{ ids: string[]; total: number }> {
  // Build tsvector from weighted fields:
  //   'A' weight = name (highest)  'B' = shortSummary / functionDesc  'C' = description
  try {
    const allRows = await prisma.$queryRaw<RawIdRow[]>`
      SELECT l.id,
        ts_rank(
          setweight(to_tsvector('english', COALESCE(l.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(l."shortSummary", '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(l."functionDesc", '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(l.description, '')), 'C'),
          plainto_tsquery('english', ${tsQuery})
        ) AS rank
      FROM "Library" l
      WHERE (
        setweight(to_tsvector('english', COALESCE(l.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(l."shortSummary", '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(l."functionDesc", '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(l.description, '')), 'C')
      ) @@ plainto_tsquery('english', ${tsQuery})
      ORDER BY rank DESC, l.name ASC
    `

    // Apply facet filter in-memory (simpler than raw SQL join)
    const filtered = facetIds
      ? allRows.filter((r) => facetIds.has(r.id))
      : allRows

    const total = filtered.length
    const ids = filtered.slice((page - 1) * pageSize, page * pageSize).map((r) => r.id)
    return { ids, total }
  } catch {
    return { ids: [], total: 0 }
  }
}

// Fallback LIKE search for short / non-English tokens that FTS may not handle
function makeLikeClause(term: string) {
  return {
    OR: [
      { name:         { contains: term, mode: 'insensitive' as const } },
      { shortSummary: { contains: term, mode: 'insensitive' as const } },
      { functionDesc: { contains: term, mode: 'insensitive' as const } },
      { categories: { some: { category: { name: { contains: term, mode: 'insensitive' as const } } } } },
      { languages:  { some: { language: { name: { contains: term, mode: 'insensitive' as const } } } } },
      { developer:    { name: { contains: term, mode: 'insensitive' as const } } },
      { organization: { name: { contains: term, mode: 'insensitive' as const } } },
    ],
  }
}

function relevanceScore(
  lib: { name: string; shortSummary: string | null; functionDesc: string | null },
  query: string,
  tokens: string[],
): number {
  const n       = lib.name.toLowerCase()
  const summary = (lib.shortSummary || '').toLowerCase()
  const func    = (lib.functionDesc || '').toLowerCase()
  const q       = query.toLowerCase()

  let score = 0
  if (n === q)              score += 200
  else if (n.startsWith(q)) score += 150
  else if (n.includes(q))   score += 100

  for (const token of tokens) {
    if (n.includes(token))            score += 40
    else if (summary.includes(token)) score += 12
    else if (func.includes(token))    score += 8
  }
  return score
}

type LibraryWithRelations = Awaited<ReturnType<typeof prisma.library.findMany<{
  include: {
    categories: { include: { category: true } }
    platforms:  { include: { platform: true } }
    languages:  { include: { language: true } }
    developer:    true
    organization: true
  }
}>>>[number]

async function fetchLibrariesByIds(ids: string[]): Promise<LibraryWithRelations[]> {
  if (ids.length === 0) return []
  const libs = await prisma.library.findMany({
    where: { id: { in: ids } },
    include: {
      categories: { include: { category: true } },
      platforms:  { include: { platform: true } },
      languages:  { include: { language: true } },
      developer: true, organization: true,
    },
  })
  // Restore the order returned by the query (ts_rank order)
  const idx = new Map(ids.map((id, i) => [id, i]))
  return libs.sort((a, b) => (idx.get(a.id) ?? 99) - (idx.get(b.id) ?? 99))
}

async function searchWithPostgres(params: SearchParams): Promise<SearchResponse> {
  const {
    query = '',
    category = '',
    platform = '',
    language = '',
    licenseType = '',
    page = 1,
    pageSize = 20,
  } = params

  const processed = preprocessQuery(query)
  const useCaseTerms = expandQuery(query)
  const pgIntent = detectIntent(query)

  // Build facet filter using Prisma (applied as an in-memory filter on matched IDs)
  const licenseClause =
    licenseType === 'free'  ? [{ costMinUSD: { equals: 0 } }] :
    licenseType === 'paid'  ? [{ costMinUSD: { gt: 0 } }]     : []

  const facetWhere = {
    AND: [
      category ? { categories: { some: { category: { name: { equals: category, mode: 'insensitive' as const } } } } } : {},
      platform ? { platforms:  { some: { platform:  { name: { equals: platform, mode: 'insensitive' as const } } } } } : {},
      language ? { languages:  { some: { language:  { name: { equals: language, mode: 'insensitive' as const } } } } } : {},
      ...(licenseClause.length ? [{ OR: licenseClause }] : []),
    ].filter(f => Object.keys(f).length > 0),
  }

  // Pre-compute facet-matching IDs (only when filters are active — skip if no filters)
  const hasFacets = facetWhere.AND.length > 0
  let facetIds: Set<string> | null = null
  if (hasFacets) {
    const rows = await prisma.library.findMany({ where: facetWhere, select: { id: true } })
    facetIds = new Set(rows.map((r) => r.id))
    if (facetIds.size === 0) {
      return { results: [], pagination: { page, pageSize, total: 0, totalPages: 0 } }
    }
  }

  // No text query → return all (with facets applied)
  if (!processed.tokens.length) {
    const where = hasFacets ? facetWhere : {}
    const [total, libraries] = await Promise.all([
      prisma.library.count({ where }),
      prisma.library.findMany({
        where,
        include: { categories: { include: { category: true } }, platforms: { include: { platform: true } }, languages: { include: { language: true } }, developer: true, organization: true },
        skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' },
      }),
    ])
    return {
      results: libraries.map(toResult),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  }

  // Pass 1: Full-text search with the original query (proper word boundaries)
  const { ids: ftIds, total: ftTotal } = await ftSearch(processed.normalized, facetIds, page, pageSize)

  if (ftTotal > 0) {
    const libraries = await fetchLibrariesByIds(ftIds)
    const sorted = libraries
      .map((lib) => ({ result: toResult(lib), lib }))
      .sort((a, b) => {
        const sa = relevanceScore(a.lib, processed.normalized, processed.tokens)
                 + (pgIntent ? intentBonus(a.result, pgIntent, query) : 0)
        const sb = relevanceScore(b.lib, processed.normalized, processed.tokens)
                 + (pgIntent ? intentBonus(b.result, pgIntent, query) : 0)
        if (sa !== sb) return sb - sa
        return a.lib.name.toLowerCase().localeCompare(b.lib.name.toLowerCase())
      })
      .map((x) => x.result)
    return { results: sorted, pagination: { page, pageSize, total: ftTotal, totalPages: Math.ceil(ftTotal / pageSize) } }
  }

  // Pass 1b: Use-case FTS — when original FTS finds nothing but intent terms are known.
  // Example: "login system" has no direct FTS match but maps to "passport next-auth jwt …"
  if (useCaseTerms.length > 0) {
    const ucQuery = useCaseTerms.join(' ')
    const { ids: ucIds, total: ucTotal } = await ftSearch(ucQuery, facetIds, page, pageSize)
    if (ucTotal > 0) {
      const libraries = await fetchLibrariesByIds(ucIds)
      const sorted = libraries
        .map((lib) => ({ result: toResult(lib), lib }))
        .sort((a, b) => {
          const sa = (pgIntent ? intentBonus(a.result, pgIntent, query) : 0)
                   + relevanceScore(a.lib, processed.normalized, processed.tokens)
          const sb = (pgIntent ? intentBonus(b.result, pgIntent, query) : 0)
                   + relevanceScore(b.lib, processed.normalized, processed.tokens)
          if (sa !== sb) return sb - sa
          return a.lib.name.toLowerCase().localeCompare(b.lib.name.toLowerCase())
        })
        .map((x) => x.result)
      return { results: sorted, pagination: { page, pageSize, total: ucTotal, totalPages: Math.ceil(ucTotal / pageSize) } }
    }
  }

  // Pass 2: FTS on synonym-expanded query (catches "auth" → "authentication oauth jwt …")
  if (processed.expandedTokens.length > processed.tokens.length) {
    const expandedQ = processed.expandedTokens.join(' ')
    const { ids: exIds, total: exTotal } = await ftSearch(expandedQ, facetIds, page, pageSize)
    if (exTotal > 0) {
      const libraries = await fetchLibrariesByIds(exIds)
      return { results: libraries.map(toResult), pagination: { page, pageSize, total: exTotal, totalPages: Math.ceil(exTotal / pageSize) } }
    }
  }

  // Pass 3: LIKE fallback for short tokens / package names (e.g. "pg", "zod", "ky")
  const likeWhere = {
    AND: [
      { OR: processed.tokens.map(makeLikeClause) },
      ...(hasFacets ? [facetWhere] : []),
    ],
  }
  const [likeTotal, likeLibs] = await Promise.all([
    prisma.library.count({ where: likeWhere }),
    prisma.library.findMany({
      where: likeWhere,
      include: { categories: { include: { category: true } }, platforms: { include: { platform: true } }, languages: { include: { language: true } }, developer: true, organization: true },
      skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' },
    }),
  ])
  const sorted = [...likeLibs]
    .map((lib) => ({ result: toResult(lib), lib }))
    .sort((a, b) => {
      const sa = relevanceScore(a.lib, processed.normalized, processed.tokens)
               + (pgIntent ? intentBonus(a.result, pgIntent, query) : 0)
      const sb = relevanceScore(b.lib, processed.normalized, processed.tokens)
               + (pgIntent ? intentBonus(b.result, pgIntent, query) : 0)
      if (sa !== sb) return sb - sa
      return a.lib.name.toLowerCase().localeCompare(b.lib.name.toLowerCase())
    })
    .map((x) => x.result)
  return { results: sorted, pagination: { page, pageSize, total: likeTotal, totalPages: Math.ceil(likeTotal / pageSize) } }
}

function toResult(lib: LibraryWithRelations): SearchResult {
  return {
    id: lib.id,
    name: lib.name,
    slug: lib.slug,
    shortSummary: lib.shortSummary,
    description: lib.description,
    functionDesc: lib.functionDesc,
    costMinUSD: lib.costMinUSD,
    costMaxUSD: lib.costMaxUSD,
    developer: lib.developer?.name || null,
    organization: lib.organization?.name || null,
    categories: lib.categories.map((c) => c.category.name),
    platforms:  lib.platforms.map((p) => p.platform.name),
    languages:  lib.languages.map((l) => l.language.name),
  }
}

// ---------------------------------------------------------------------------
// pg_trgm typo-tolerant search (runs alongside LIKE to catch fuzzy matches)
// Uses raw SQL so it is completely independent of Prisma filter syntax.
// ---------------------------------------------------------------------------

interface RawLibraryRow {
  id: string
  name: string
  slug: string
  shortSummary: string | null
  functionDesc: string | null
  description: string | null
  costMinUSD: number | null
  costMaxUSD: number | null
}

async function trigramSearch(normalized: string, limit: number): Promise<Set<string>> {
  // Returns a set of library IDs that have trigram similarity ≥ 0.2 to the query
  try {
    const rows = await prisma.$queryRaw<RawLibraryRow[]>`
      SELECT id FROM "Library"
      WHERE
        similarity(name, ${normalized}) > 0.2
        OR similarity("shortSummary", ${normalized}) > 0.15
        OR similarity("functionDesc", ${normalized}) > 0.15
      ORDER BY
        GREATEST(
          similarity(name, ${normalized}) * 5,
          COALESCE(similarity("shortSummary", ${normalized}), 0) * 2,
          COALESCE(similarity("functionDesc", ${normalized}), 0)
        ) DESC
      LIMIT ${limit}
    `
    return new Set(rows.map((r) => r.id))
  } catch {
    // pg_trgm not available — degrade gracefully
    return new Set()
  }
}

// ---------------------------------------------------------------------------
// Public API — try Typesense, fall back to Postgres (with pg_trgm overlay)
// ---------------------------------------------------------------------------

export async function searchLibraries(params: SearchParams): Promise<SearchResponse> {
  try {
    const tsResult = await searchWithTypesense(params)
    // If Typesense returned results, use them. If it returned 0, fall through to
    // Postgres — this handles the common case where Typesense is running but the
    // index hasn't been populated yet (e.g. first run before sync/seed).
    if (tsResult.results.length > 0 || tsResult.pagination.total > 0) {
      return tsResult
    }
    console.warn('Typesense returned 0 results, falling back to Postgres')
  } catch (error) {
    console.warn('Typesense unavailable, falling back to Postgres:', (error as Error).message)
  }

  const postgresResult = await searchWithPostgres(params)

  // If LIKE search returned nothing (likely a typo), try trigram similarity
  if (postgresResult.results.length === 0 && params.query && params.query.trim().length >= 3) {
    const processed = preprocessQuery(params.query)
    const fuzzyIds = await trigramSearch(processed.normalized, params.pageSize || 20)
    if (fuzzyIds.size > 0) {
      const libs = await prisma.library.findMany({
        where: { id: { in: Array.from(fuzzyIds) } },
        include: {
          categories: { include: { category: true } },
          platforms:  { include: { platform: true } },
          languages:  { include: { language: true } },
          developer:    true,
          organization: true,
        },
      })
      return {
        results: libs.map((lib) => ({
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          shortSummary: lib.shortSummary,
          description: lib.description,
          functionDesc: lib.functionDesc,
          costMinUSD: lib.costMinUSD,
          costMaxUSD: lib.costMaxUSD,
          developer: lib.developer?.name || null,
          organization: lib.organization?.name || null,
          categories: lib.categories.map((c) => c.category.name),
          platforms:  lib.platforms.map((p) => p.platform.name),
          languages:  lib.languages.map((l) => l.language.name),
        })),
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: libs.length,
          totalPages: 1,
        },
      }
    }
  }

  return postgresResult
}
