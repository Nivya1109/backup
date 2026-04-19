'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, X, Plus, Code2, Globe, Github, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { SIPSelector } from '@/components/SIPSelector'
import { formatCurrency } from '@/lib/utils'

interface Library {
  id: string
  name: string
  slug: string
  shortSummary: string | null
  description: string | null
  costMinUSD: number | null
  costMaxUSD: number | null
  officialUrl: string | null
  repositoryUrl: string | null
  developer: { id: string; name: string; url: string | null } | null
  organization: { id: string; name: string; url: string | null } | null
  categories: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
  languages: Array<{ id: string; name: string }>
  versions: Array<{ id: string; name: string; releasedAt: string | null; notes: string | null }>
  features: Array<{ id: string; name: string; spec: string | null; required: boolean }>
  dependencies: Array<{ id: string; name: string; slug: string }>
}

const MAX_COMPARE = 4
const MIN_SLOTS = 2

function priceLabel(lib: Library): string {
  if (lib.costMinUSD === 0 || lib.costMinUSD === null) return 'Free'
  if (lib.costMinUSD && lib.costMaxUSD) {
    return lib.costMinUSD === lib.costMaxUSD
      ? formatCurrency(lib.costMinUSD)
      : `${formatCurrency(lib.costMinUSD)} – ${formatCurrency(lib.costMaxUSD)}`
  }
  return 'N/A'
}

export default function ComparePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL stores only actual selected slugs — no empty strings
  const slugsParam = searchParams.get('slugs') || ''
  const urlSlugs: string[] = slugsParam
    ? slugsParam.split(',').filter(Boolean).slice(0, MAX_COMPARE)
    : []

  // numSlots is local state so "Add library" slot works independently of URL
  const [numSlots, setNumSlots] = useState(Math.max(MIN_SLOTS, urlSlugs.length))
  const [libraries, setLibraries] = useState<(Library | null)[]>([])
  const [loading, setLoading] = useState(false)

  // AI summary — isolated state, never affects comparison logic
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Keep numSlots in sync when URL changes (e.g. navigating back)
  useEffect(() => {
    setNumSlots((prev) => Math.max(prev, urlSlugs.length, MIN_SLOTS))
  }, [urlSlugs.length])

  const fetchLibrary = useCallback(async (slug: string): Promise<Library | null> => {
    try {
      const res = await fetch(`/api/sips/${slug}`)
      if (res.ok) return res.json()
    } catch {
      // ignore
    }
    return null
  }, [])

  // Re-fetch whenever URL slugs change
  useEffect(() => {
    setLoading(true)
    Promise.all(
      Array.from({ length: numSlots }, (_, i) =>
        urlSlugs[i] ? fetchLibrary(urlSlugs[i]) : Promise.resolve(null)
      )
    )
      .then(setLibraries)
      .finally(() => setLoading(false))
  }, [slugsParam, numSlots, fetchLibrary])

  // Push updated slug list to URL
  const updateURL = (slugs: string[]) => {
    const valid = slugs.filter(Boolean).slice(0, MAX_COMPARE)
    router.push(`/compare${valid.length ? `?slugs=${valid.join(',')}` : ''}`)
  }

  const handleSelect = (slotIndex: number, slug: string) => {
    const next = [...urlSlugs]
    if (slug) {
      next[slotIndex] = slug
    } else {
      next.splice(slotIndex, 1)
    }
    updateURL(next)
  }

  const handleRemove = (slotIndex: number) => {
    const next = urlSlugs.filter((_, i) => i !== slotIndex)
    updateURL(next)
    // Only reduce slot count if it would go below MIN_SLOTS
    setNumSlots((prev) => Math.max(MIN_SLOTS, prev - 1))
  }

  const handleAddSlot = () => {
    if (numSlots < MAX_COMPARE) setNumSlots((prev) => prev + 1)
  }

  const handleClearAll = () => {
    setNumSlots(MIN_SLOTS)
    router.push('/compare')
  }

  async function generateAiSummary() {
    setAiSummary(null)
    setAiError(null)
    setAiLoading(true)
    try {
      const payload = loadedLibraries.map((lib) => ({
        name: lib.name,
        shortSummary: lib.shortSummary,
        categories: lib.categories.map((c) => c.name),
        languages: lib.languages.map((l) => l.name),
        costMinUSD: lib.costMinUSD,
        featureCount: lib.features.length,
      }))
      const res = await fetch('/api/ai/compare-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraries: payload }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAiError(data.error ?? 'AI summary unavailable right now.')
      } else {
        setAiSummary(data.summary)
      }
    } catch {
      setAiError('AI summary unavailable right now.')
    } finally {
      setAiLoading(false)
    }
  }

  const loadedLibraries = libraries.filter((l): l is Library => l !== null)
  const showComparison = loadedLibraries.length >= 2 && !loading

  const allFeatureNames = Array.from(
    new Set(loadedLibraries.flatMap((l) => l.features.map((f) => f.name)))
  ).sort()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/search"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Search
        </Link>
        {urlSlugs.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Compare Libraries</h1>
        <p className="text-sm text-muted-foreground">
          Select up to {MAX_COMPARE} libraries to compare side by side
        </p>
      </div>

      {/* Slot selectors — always show numSlots slots */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: numSlots }, (_, i) => {
          const lib = libraries[i] ?? null
          const slug = urlSlugs[i] ?? ''

          return (
            <div key={i} className="border rounded-lg p-3 relative min-h-[90px] flex flex-col justify-center">
              {lib ? (
                // Selected library — show name + remove button
                <>
                  <button
                    onClick={() => handleRemove(i)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-muted"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="font-semibold text-sm pr-6 mb-0.5 leading-tight">{lib.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lib.languages.map((l) => l.name).slice(0, 2).join(', ')}
                  </p>
                  <button
                    className="text-xs text-muted-foreground hover:text-primary mt-1 text-left underline underline-offset-2"
                    onClick={() => handleSelect(i, '')}
                  >
                    Change
                  </button>
                </>
              ) : loading && slug ? (
                // Slug in URL but library not loaded yet
                <div className="h-4 bg-muted rounded animate-pulse" />
              ) : (
                // Empty slot — show selector
                <SIPSelector
                  selectedSlug={slug}
                  onSelect={(s) => handleSelect(i, s)}
                  excludeSlugs={urlSlugs.filter((_, j) => j !== i)}
                />
              )}
            </div>
          )
        })}

        {/* Add library button — only show if under the max */}
        {numSlots < MAX_COMPARE && (
          <button
            onClick={handleAddSlot}
            className="border-2 border-dashed rounded-lg p-4 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2 min-h-[90px]"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add library</span>
          </button>
        )}
      </div>

      {/* Prompt to select more */}
      {!loading && urlSlugs.length < 2 && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Select at least 2 libraries above to start comparing.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading libraries…
        </div>
      )}

      {/* ── Comparison ── */}
      {showComparison && (
        <div>
          {/* Side-by-side cards */}
          <div
            className="grid gap-4 mb-8"
            style={{
              gridTemplateColumns: `repeat(${loadedLibraries.length}, minmax(0, 1fr))`,
            }}
          >
            {loadedLibraries.map((lib) => {
              const author = lib.developer || lib.organization
              const isFree = lib.costMinUSD === 0 || lib.costMinUSD === null
              return (
                <Card key={lib.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base leading-tight">
                      <Link href={`/sip/${lib.slug}`} className="hover:text-primary">
                        {lib.name}
                      </Link>
                    </CardTitle>
                    {author && (
                      <p className="text-xs text-muted-foreground">by {author.name}</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1">
                    {/* License */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">License</p>
                      <Badge variant={isFree ? 'secondary' : 'default'}>
                        {isFree ? 'Free' : priceLabel(lib)}
                      </Badge>
                    </div>

                    {/* Categories */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Category</p>
                      <div className="flex flex-wrap gap-1">
                        {lib.categories.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-xs">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1">
                        <Code2 className="h-3 w-3" /> Languages
                      </p>
                      <p className="text-sm">{lib.languages.map((l) => l.name).join(', ') || '—'}</p>
                    </div>

                    {/* Platforms */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Platforms
                      </p>
                      <p className="text-sm">{lib.platforms.map((p) => p.name).join(', ') || '—'}</p>
                    </div>

                    {/* Latest version */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Latest Version</p>
                      <p className="text-sm font-medium">
                        {lib.versions[0] ? `v${lib.versions[0].name}` : '—'}
                      </p>
                    </div>

                    {/* Counts */}
                    <div className="grid grid-cols-2 gap-2 text-center border rounded-lg p-2">
                      <div>
                        <p className="text-lg font-bold">{lib.features.length}</p>
                        <p className="text-xs text-muted-foreground">Features</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{lib.dependencies.length}</p>
                        <p className="text-xs text-muted-foreground">Deps</p>
                      </div>
                    </div>

                    {/* External links */}
                    <div className="space-y-1 pt-1 border-t">
                      {lib.officialUrl && (
                        <a
                          href={lib.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" /> Docs
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {lib.repositoryUrl && (
                        <a
                          href={lib.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Github className="h-3 w-3" /> Repo
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <Link href={`/sip/${lib.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Full Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Feature matrix */}
          {allFeatureNames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Feature Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-6 font-medium text-muted-foreground">
                          Feature
                        </th>
                        {loadedLibraries.map((lib) => (
                          <th key={lib.id} className="text-center py-2 px-3 font-medium">
                            {lib.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatureNames.map((name) => (
                        <tr key={name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-6 text-muted-foreground">{name}</td>
                          {loadedLibraries.map((lib) => {
                            const has = lib.features.some((f) => f.name === name)
                            return (
                              <td key={lib.id} className="text-center py-2 px-3">
                                {has ? (
                                  <span className="text-green-600 font-bold text-base">✓</span>
                                ) : (
                                  <span className="text-muted-foreground text-base">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── AI Comparison Summary (optional enhancement) ── */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Comparison Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiSummary && !aiLoading && (
                <p className="text-sm text-muted-foreground">
                  Get an AI-generated summary of tradeoffs, beginner vs. enterprise fit, and best use cases for each library.
                </p>
              )}

              <Button
                onClick={generateAiSummary}
                disabled={aiLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Generating AI summary…' : aiSummary ? 'Regenerate Summary' : 'Generate AI Summary'}
              </Button>

              {aiError && (
                <p className="text-sm text-red-500">{aiError}</p>
              )}

              {aiSummary && !aiLoading && (
                <div className="prose prose-sm max-w-none text-sm leading-relaxed pt-2 border-t">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
