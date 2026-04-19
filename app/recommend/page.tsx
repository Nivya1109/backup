'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

interface Recommendation {
  slug: string
  name: string
  reason: string
}

const EXAMPLES = [
  'I want to build a REST API with authentication in Node.js',
  'I need to analyze data and create visualizations in Python',
  'I want to add a message queue to my backend service',
]

export default function RecommendPage() {
  const [query, setQuery]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [results, setResults]                 = useState<Recommendation[] | null>(null)
  const [error, setError]                     = useState<string | null>(null)
  const [lastQuery, setLastQuery]             = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)
    setLastQuery(query.trim())
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'AI unavailable right now.')
      } else {
        setResults(data.recommendations)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/search"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Search
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI Library Recommender</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Describe what you want to build and get 3 library recommendations from our database.
        </p>
      </div>

      {/* Input form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="text-sm font-medium block mb-2">
                What do you want to build?
              </label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. I want to build a REST API with authentication in Node.js"
                rows={3}
                maxLength={500}
                className="w-full text-sm border rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{query.length}/500</p>
            </div>

            {/* Example prompts */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setQuery(ex)}
                    className="text-xs px-2 py-1 rounded-full border border-dashed text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading || !query.trim()} className="gap-2 w-full">
              <Sparkles className="h-4 w-4" />
              {loading ? 'Finding libraries…' : 'Recommend Libraries'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Top picks for: <span className="font-medium text-foreground">"{lastQuery}"</span>
          </p>
          {results.map((rec, i) => (
            <Card key={rec.slug} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold w-5 h-5 flex items-center justify-center p-0 rounded-full shrink-0">
                    {i + 1}
                  </Badge>
                  {rec.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
                <Link href={`/sip/${rec.slug}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    View Details <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No matching libraries found. Try rephrasing your description.
        </p>
      )}
    </div>
  )
}
