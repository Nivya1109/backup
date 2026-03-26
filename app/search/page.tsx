'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SearchBar } from '@/components/SearchBar'
import { FacetFilters } from '@/components/FacetFilters'
import { ResultCard } from '@/components/ResultCard'
import { Pagination } from '@/components/Pagination'

interface Library {
  id: string
  name: string
  slug: string
  shortSummary: string | null
  functionDesc: string | null
  developer: string | null
  organization: string | null
  categories: string[]
  platforms: string[]
  languages: string[]
  costMinUSD: number | null
  costMaxUSD: number | null
}

interface FilterOption {
  id: string
  name: string
  _count?: { libraries: number }
}

interface SearchResults {
  results: Library[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [results, setResults] = useState<Library[]>([])
  const [categories, setCategories] = useState<FilterOption[]>([])
  const [platforms, setPlatforms] = useState<FilterOption[]>([])
  const [languages, setLanguages] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const platform = searchParams.get('platform') || ''
  const language = searchParams.get('language') || ''
  const licenseType = searchParams.get('licenseType') || ''
  const page = parseInt(searchParams.get('page') || '1')

  // Fetch filter options once
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/os').then((r) => r.json()),
      fetch('/api/languages').then((r) => r.json()),
    ])
      .then(([cats, plats, langs]) => {
        setCategories(cats)
        setPlatforms(plats)
        setLanguages(langs)
      })
      .catch((e) => console.error('Failed to fetch filters:', e))
  }, [])

  // Fetch search results whenever filters change
  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category) params.set('category', category)
      if (platform) params.set('platform', platform)
      if (language) params.set('language', language)
      if (licenseType) params.set('licenseType', licenseType)
      params.set('page', page.toString())

      const response = await fetch(`/api/sips?${params}`)
      if (response.ok) {
        const data: SearchResults = await response.json()
        setResults(data.results)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
    } finally {
      setLoading(false)
    }
  }, [query, category, platform, language, licenseType, page])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    // Reset page when filters change (not when page itself changes)
    if (!('page' in newParams)) params.set('page', '1')
    router.push(`/search?${params.toString()}`)
  }

  const handleClearFilters = () => {
    updateURL({ category: '', platform: '', language: '', licenseType: '' })
  }

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Browse Libraries</h1>
        <SearchBar defaultValue={query} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <FacetFilters
            categories={categories}
            platforms={platforms}
            languages={languages}
            selectedCategory={category}
            selectedPlatform={platform}
            selectedLanguage={language}
            licenseType={licenseType}
            onCategoryChange={(v) => updateURL({ category: v === 'all' ? '' : v })}
            onPlatformChange={(v) => updateURL({ platform: v === 'all' ? '' : v })}
            onLanguageChange={(v) => updateURL({ language: v === 'all' ? '' : v })}
            onLicenseTypeChange={(v) => updateURL({ licenseType: v })}
            onClearFilters={handleClearFilters}
          />
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-6 animate-pulse">
                  <div className="h-5 w-48 bg-muted rounded mb-2" />
                  <div className="h-4 w-full bg-muted rounded mb-1" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {pagination.total} librar{pagination.total !== 1 ? 'ies' : 'y'}
                {query && (
                  <>
                    {' '}for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 gap-4">
                {results.map((lib) => (
                  <ResultCard key={lib.id} {...lib} />
                ))}
              </div>

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-16 border rounded-lg bg-muted/30">
              <p className="text-lg font-semibold mb-2">No libraries found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term or clear some filters.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
