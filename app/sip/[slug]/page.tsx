'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  Github,
  Globe,
  Code2,
  Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Library {
  id: string
  name: string
  slug: string
  shortSummary: string | null
  description: string | null
  functionDesc: string | null
  socialImpact: string | null
  exampleCode: string | null
  officialUrl: string | null
  repositoryUrl: string | null
  costMinUSD: number | null
  costMaxUSD: number | null
  scrapedAt: string | null
  dataSource: string | null
  developer: { id: string; name: string; url: string | null } | null
  organization: { id: string; name: string; url: string | null } | null
  categories: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
  languages: Array<{ id: string; name: string }>
  versions: Array<{ id: string; name: string; releasedAt: string | null; notes: string | null }>
  features: Array<{ id: string; name: string; spec: string | null; required: boolean }>
  dependencies: Array<{ id: string; name: string; slug: string }>
}

export default function LibraryDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [library, setLibrary] = useState<Library | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI explainer — isolated state, never affects existing page logic
  type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
  const [aiOpen, setAiOpen]             = useState(false)
  const [aiLevel, setAiLevel]           = useState<SkillLevel | null>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiError, setAiError]           = useState<string | null>(null)

  async function explainForLevel(level: SkillLevel) {
    if (!library) return
    setAiLevel(level)
    setAiExplanation(null)
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          library: {
            name: library.name,
            shortSummary: library.shortSummary,
            description: library.description,
            categories: library.categories.map((c) => c.name),
            languages: library.languages.map((l) => l.name),
            features: library.features.map((f) => f.name),
            isFree: library.costMinUSD === 0 || library.costMinUSD === null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAiError(data.error ?? 'AI unavailable right now.')
      } else {
        setAiExplanation(data.explanation)
      }
    } catch {
      setAiError('AI unavailable right now.')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/sips/${slug}`)
        if (response.status === 404) {
          setError('Library not found')
          return
        }
        if (!response.ok) throw new Error('Failed to fetch library')
        const data = await response.json()
        setLibrary(data)
      } catch (err) {
        console.error('Error fetching library:', err)
        setError('Failed to load library details')
      } finally {
        setLoading(false)
      }
    }
    fetchLibrary()
  }, [slug])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded mb-4" />
        <div className="h-4 w-96 bg-muted rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !library) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/search" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Search
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>{error || 'Library not found'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isFree = library.costMinUSD === 0 || library.costMinUSD === null
  const priceLabel = isFree
    ? 'Free / Open Source'
    : library.costMinUSD && library.costMaxUSD
    ? library.costMinUSD === library.costMaxUSD
      ? formatCurrency(library.costMinUSD)
      : `${formatCurrency(library.costMinUSD)} – ${formatCurrency(library.costMaxUSD)}`
    : 'Pricing not available'

  const author = library.developer || library.organization

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/search" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Search
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">{library.name}</h1>
          <Badge variant={isFree ? 'secondary' : 'default'}>
            {isFree ? 'Free' : 'Paid'}
          </Badge>
        </div>

        {library.shortSummary && (
          <p className="text-xl text-muted-foreground mb-4">{library.shortSummary}</p>
        )}

        {/* Language + category badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {library.categories.map((c) => (
            <Badge key={c.id} variant="secondary">{c.name}</Badge>
          ))}
          {library.languages.map((l) => (
            <Badge key={l.id} variant="outline">
              <Code2 className="h-3 w-3 mr-1" />
              {l.name}
            </Badge>
          ))}
          {library.platforms.map((p) => (
            <Badge key={p.id} variant="outline">{p.name}</Badge>
          ))}
        </div>

        {/* External links */}
        <div className="flex flex-wrap gap-3">
          {library.officialUrl && (
            <a href={library.officialUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Globe className="h-4 w-4" /> Documentation
            </a>
          )}
          {library.repositoryUrl && (
            <a href={library.repositoryUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Github className="h-4 w-4" /> Repository
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="example">Example</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              {library.description && (
                <Card>
                  <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{library.description}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {library.functionDesc && (
                <Card>
                  <CardHeader><CardTitle>Use Case</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{library.functionDesc}</p>
                  </CardContent>
                </Card>
              )}

              {library.socialImpact && (
                <Card>
                  <CardHeader><CardTitle>Community Impact</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{library.socialImpact}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Library Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {author && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">{library.developer ? 'Developer' : 'Organization'}</span>
                      <span className="text-sm">
                        {author.url ? (
                          <a href={author.url} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1">
                            {author.name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : author.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Pricing</span>
                    <span className="text-sm font-semibold">{priceLabel}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Categories</span>
                    <span className="text-sm">{library.categories.map((c) => c.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Languages</span>
                    <span className="text-sm">{library.languages.map((l) => l.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">Compatible Platforms</span>
                    <span className="text-sm">{library.platforms.map((p) => p.name).join(', ')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* AI explainer trigger */}
              <button
                onClick={() => setAiOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium py-2.5 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Is this right for me?
              </button>

              {library.dependencies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Dependencies</CardTitle>
                    <CardDescription>Libraries this package depends on</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {library.dependencies.map((dep) => (
                        <Link key={dep.id} href={`/sip/${dep.slug}`}
                          className="block p-3 border rounded-lg hover:bg-accent transition-colors">
                          <p className="text-sm font-medium">{dep.name}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Features */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                  <CardDescription>{library.features.length} feature{library.features.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {library.features.length > 0 ? (
                    <div className="space-y-3">
                      {library.features.map((f) => (
                        <div key={f.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              {f.required
                                ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                              {f.name}
                            </h4>
                            {!f.required && (
                              <Badge variant="outline" className="text-xs shrink-0">Optional</Badge>
                            )}
                          </div>
                          {f.spec && <p className="text-sm text-muted-foreground ml-6">{f.spec}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No features listed.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Example Code */}
            <TabsContent value="example">
              <Card>
                <CardHeader>
                  <CardTitle>Example Code</CardTitle>
                  <CardDescription>Quick-start usage example</CardDescription>
                </CardHeader>
                <CardContent>
                  {library.exampleCode ? (
                    <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
                      <code>{library.exampleCode}</code>
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">No example code available.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Versions */}
            <TabsContent value="versions">
              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                  <CardDescription>{library.versions.length} version{library.versions.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {library.versions.length > 0 ? (
                    <div className="space-y-4">
                      {library.versions.map((v) => (
                        <div key={v.id} className="border-l-2 border-primary pl-4 py-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">v{v.name}</h4>
                            {v.releasedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(v.releasedAt).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                          {v.notes && <p className="text-sm text-muted-foreground">{v.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No version history available.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">License</p>
                <p className="text-lg font-bold">{isFree ? 'Free' : 'Paid'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Features</p>
                <p className="text-2xl font-bold">{library.features.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Versions</p>
                <p className="text-2xl font-bold">{library.versions.length}</p>
              </div>
              {library.versions[0] && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Latest</p>
                  <p className="text-xl font-semibold">v{library.versions[0].name}</p>
                </div>
              )}
              {library.dependencies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dependencies</p>
                  <p className="text-xl font-semibold">{library.dependencies.length}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links card */}
          {(library.officialUrl || library.repositoryUrl) && (
            <Card>
              <CardHeader><CardTitle>Links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {library.officialUrl && (
                  <a href={library.officialUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="h-4 w-4" /> Official Docs
                  </a>
                )}
                {library.repositoryUrl && (
                  <a href={library.repositoryUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Github className="h-4 w-4" /> Source Code
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Compare link */}
          <Link href={`/compare?slugs=${library.slug}`}
            className="block border rounded-lg p-4 text-center text-sm font-medium hover:bg-accent transition-colors">
            Compare with another library →
          </Link>
        </div>
      </div>

      {/* AI explainer modal */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false) }}
        >
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Is this right for me?</h2>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <p className="text-xs text-muted-foreground">Choose your experience level for a tailored explanation.</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => explainForLevel(lvl)}
                    disabled={aiLoading}
                    className={`flex-1 text-xs py-1.5 rounded-md border font-medium capitalize transition-colors disabled:opacity-50 ${
                      aiLevel === lvl
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:border-primary'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {aiLoading && (
                <p className="text-xs text-muted-foreground animate-pulse">Generating explanation…</p>
              )}
              {aiError && (
                <p className="text-xs text-red-500">{aiError}</p>
              )}
              {aiExplanation && !aiLoading && (
                <div className="border-t pt-3 space-y-2">
                  {aiExplanation.split('\n').map((line, i) => {
                    const isHeader = /^(Overview:|Best for:|Why use it:|Consider:|Verdict:)/.test(line.trim())
                    const isBullet = line.trim().startsWith('•')
                    if (!line.trim()) return null
                    return (
                      <p key={i} className={`text-sm ${isHeader ? 'font-bold mt-2' : isBullet ? 'pl-2 text-muted-foreground' : ''}`}>
                        {line}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
