'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface LibraryOption {
  id: string
  name: string
  slug: string
  categories: string[]
  languages: string[]
}

interface SIPSelectorProps {
  selectedSlug: string
  onSelect: (slug: string) => void
  excludeSlugs?: string[]
}

export function SIPSelector({ selectedSlug, onSelect, excludeSlugs = [] }: SIPSelectorProps) {
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sips?pageSize=500')
      .then((r) => r.json())
      .then((data) => setLibraries(data.results || []))
      .catch((e) => console.error('Failed to fetch libraries:', e))
      .finally(() => setLoading(false))
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const available = libraries.filter((lib) => !excludeSlugs.includes(lib.slug))

  const filtered = query.trim()
    ? available.filter((lib) =>
        lib.name.toLowerCase().includes(query.toLowerCase()) ||
        lib.languages.some((l) => l.toLowerCase().includes(query.toLowerCase())) ||
        lib.categories.some((c) => c.toLowerCase().includes(query.toLowerCase()))
      )
    : available

  const selected = libraries.find((l) => l.slug === selectedSlug)

  if (loading) {
    return <div className="h-10 bg-muted rounded animate-pulse" />
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent transition-colors"
      >
        <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground'}>
          {selected ? selected.name : 'Select a library...'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search libraries..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No libraries found.</p>
            ) : (
              filtered.map((lib) => (
                <button
                  key={lib.id}
                  type="button"
                  onClick={() => {
                    onSelect(lib.slug)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left transition-colors ${
                    lib.slug === selectedSlug ? 'bg-accent/60 font-medium' : ''
                  }`}
                >
                  <span className="truncate">{lib.name}</span>
                  {lib.languages.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {lib.languages.slice(0, 2).join(', ')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Count hint */}
          <div className="border-t px-3 py-1.5">
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {available.length} libraries
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
