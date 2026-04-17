'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Code2, Globe, LogOut,
  AlertCircle, Link2, Database, ExternalLink, MessageSquare,
} from 'lucide-react'

interface AdminStats {
  totalLibraries: number
  librariesPerCategory: Array<{ category: string; count: number }>
  librariesPerLanguage: Array<{ language: string; count: number }>
  librariesByOrg: Array<{ org: string; count: number }>
  licenseBreakdown: { free: number; paid: number }
}

interface SupportTicket {
  id: string
  name: string
  email: string
  subject: string
  category: string
  message: string
  status: string
  createdAt: string
}

interface QualityData {
  missingExample: {
    count: number
    list: Array<{ id: string; name: string; slug: string; dataSource: string | null; category: string | null; language: string | null }>
  }
  missingUrls: {
    missingOfficialCount: number
    missingRepoCount: number
    list: Array<{ id: string; name: string; slug: string; missingOfficial: boolean; missingRepo: boolean }>
  }
  recentLibraries: Array<{
    id: string; name: string; slug: string; shortSummary: string | null
    dataSource: string | null; createdAt: string; category: string | null
  }>
  sourceBreakdown: Array<{ source: string; count: number }>
}

const STATUS_LABELS: Record<string, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved:    'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function TicketRow({
  ticket,
  onStatusChange,
}: {
  ticket: SupportTicket
  onStatusChange: (id: string, status: string) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [updating, setUpdating]   = useState(false)

  async function cycleStatus() {
    const next = ticket.status === 'open' ? 'in_progress'
               : ticket.status === 'in_progress' ? 'resolved'
               : 'open'
    setUpdating(true)
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: next }),
      })
      if (res.ok) onStatusChange(ticket.id, next)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="py-3 first:pt-0 last:pb-0 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium hover:underline text-left truncate block max-w-full"
          >
            {ticket.subject}
          </button>
          <p className="text-xs text-muted-foreground">
            {ticket.name} · {ticket.email} · {ticket.category} · {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[ticket.status] ?? ''}`}>
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
          {ticket.status !== 'resolved' && (
            <button
              onClick={cycleStatus}
              disabled={updating}
              title="Advance status"
              className="text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-0.5 transition-colors disabled:opacity-50"
            >
              {updating ? '…' : '→'}
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded p-3 mt-1">
          {ticket.message}
        </p>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [quality, setQuality] = useState<QualityData | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketFilter, setTicketFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, qualityRes, ticketsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/admin/quality'),
          fetch('/api/support'),
        ])
        const statsData   = await statsRes.json()
        const qualityData = await qualityRes.json()
        const ticketsData = await ticketsRes.json()
        // Guard: API returns { error: "..." } on failure — only set if shape is valid
        if (statsData && !statsData.error) setStats(statsData)
        if (qualityData && qualityData.missingExample) setQuality(qualityData)
        if (ticketsData && ticketsData.tickets) setTickets(ticketsData.tickets)
      } catch (err) {
        console.error('Admin load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded" />)}
        </div>
        <div className="h-64 bg-muted rounded" />
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  const totalLibraries = stats?.totalLibraries ?? 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Signed in as {session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-2 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {/* ── Quality Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Libraries</p>
                <p className="text-3xl font-bold">{totalLibraries || '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">in the directory</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={quality && quality.missingExample.count > 0 ? 'border-orange-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Code2 className={`h-8 w-8 ${quality && quality.missingExample.count > 0 ? 'text-orange-500' : 'text-emerald-500'}`} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Missing Examples</p>
                <p className="text-3xl font-bold">{quality?.missingExample.count ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalLibraries > 0 && quality
                    ? `${Math.round(((totalLibraries - quality.missingExample.count) / totalLibraries) * 100)}% have code`
                    : 'no data'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={quality && quality.missingUrls.missingOfficialCount > 0 ? 'border-rose-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ExternalLink className={`h-8 w-8 ${quality && quality.missingUrls.missingOfficialCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">No Official URL</p>
                <p className="text-3xl font-bold">{quality?.missingUrls.missingOfficialCount ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">libraries affected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={quality && quality.missingUrls.missingRepoCount > 0 ? 'border-amber-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Link2 className={`h-8 w-8 ${quality && quality.missingUrls.missingRepoCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">No Repo URL</p>
                <p className="text-3xl font-bold">{quality?.missingUrls.missingRepoCount ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">libraries affected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Source Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Source Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quality?.sourceBreakdown && quality.sourceBreakdown.length > 0 ? (
              <div className="space-y-2">
                {quality.sourceBreakdown.map((row) => (
                  <div key={row.source} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{row.source}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-teal-500 rounded"
                        style={{ width: `${Math.round((row.count / (totalLibraries || 1)) * 120)}px` }}
                      />
                      <span className="text-sm font-medium w-8 text-right">{row.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No source data available</p>
            )}
          </CardContent>
        </Card>

        {/* User Queries (support tickets) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> User Queries
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {tickets.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Status filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'open', 'in_progress', 'resolved'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTicketFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    ticketFilter === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {tickets.filter((t) => ticketFilter === 'all' || t.status === ticketFilter).length === 0 ? (
              <p className="text-sm text-muted-foreground">No queries found.</p>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {tickets
                  .filter((t) => ticketFilter === 'all' || t.status === ticketFilter)
                  .map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} onStatusChange={(id, status) => {
                      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
                    }} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Data Quality ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-sm">
          Data Quality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Missing Example Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" /> Missing Example Code
                </span>
                <Badge variant={quality?.missingExample.count === 0 ? 'default' : 'destructive'}>
                  {quality?.missingExample.count ?? '…'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quality?.missingExample.count === 0 ? (
                <p className="text-sm text-emerald-600">All libraries have example code.</p>
              ) : (
                <div className="space-y-2">
                  {quality?.missingExample.list.map((lib) => (
                    <div key={lib.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a
                          href={`/sip/${lib.slug}`}
                          className="text-sm font-medium hover:underline text-primary truncate block"
                        >
                          {lib.name}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {[lib.category, lib.language].filter(Boolean).join(' · ') || 'No category/language'}
                        </p>
                      </div>
                      {lib.dataSource && (
                        <Badge variant="outline" className="text-xs shrink-0">{lib.dataSource}</Badge>
                      )}
                    </div>
                  ))}
                  {(quality?.missingExample.count ?? 0) > 10 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      …and {(quality?.missingExample.count ?? 0) - 10} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Missing URLs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-rose-500" /> Missing URLs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-500">{quality?.missingUrls.missingOfficialCount ?? '…'}</p>
                  <p className="text-xs text-muted-foreground">No official URL</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{quality?.missingUrls.missingRepoCount ?? '…'}</p>
                  <p className="text-xs text-muted-foreground">No repo URL</p>
                </div>
              </div>
              {quality?.missingUrls.list && quality.missingUrls.list.length > 0 ? (
                <div className="space-y-2 border-t pt-3">
                  {quality.missingUrls.list.map((lib) => (
                    <div key={lib.id} className="flex items-center justify-between gap-2">
                      <a
                        href={`/sip/${lib.slug}`}
                        className="text-sm font-medium hover:underline text-primary truncate"
                      >
                        {lib.name}
                      </a>
                      <div className="flex gap-1 shrink-0">
                        {lib.missingOfficial && (
                          <Badge variant="destructive" className="text-xs">No official</Badge>
                        )}
                        {lib.missingRepo && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">No repo</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : quality?.missingUrls.missingOfficialCount === 0 && quality?.missingUrls.missingRepoCount === 0 ? (
                <p className="text-sm text-emerald-600 border-t pt-3">All libraries have URLs.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* ── Recent Libraries ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-sm">
          Recent Additions
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Recently Added Libraries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quality?.recentLibraries && quality.recentLibraries.length > 0 ? (
              <div className="divide-y">
                {quality.recentLibraries.map((lib) => (
                  <div key={lib.id} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <a
                        href={`/sip/${lib.slug}`}
                        className="text-sm font-medium hover:underline text-primary truncate block"
                      >
                        {lib.name}
                      </a>
                      {lib.shortSummary && (
                        <p className="text-xs text-muted-foreground truncate">{lib.shortSummary}</p>
                      )}
                      {lib.category && (
                        <p className="text-xs text-muted-foreground">{lib.category}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {lib.dataSource && (
                        <Badge variant="outline" className="text-xs">{lib.dataSource}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(lib.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No libraries found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
