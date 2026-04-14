'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BookOpen, Layers, Code2, Building2 } from 'lucide-react'

interface StatsData {
  totalLibraries: number
  librariesPerCategory: Array<{ category: string; count: number }>
  librariesPerLanguage: Array<{ language: string; count: number }>
  platformDistribution: Array<{ category: string; platform: string; count: number }>
  librariesByOrg: Array<{ org: string; count: number }>
  licenseBreakdown: { free: number; paid: number }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function StatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedCategory = searchParams.get('category') || ''

  const [stats, setStats] = useState<StatsData | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/stats${selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : ''}`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([statsData, catsData]) => {
        // Guard: API returns an error object on failure — only set if the shape is valid
        if (statsData && typeof statsData.licenseBreakdown !== 'undefined') setStats(statsData)
        if (Array.isArray(catsData)) setCategories(catsData)
      })
      .catch((e) => console.error('Failed to fetch stats:', e))
      .finally(() => setLoading(false))
  }, [selectedCategory])

  const handleCategoryChange = (value: string) => {
    const cat = value === 'all' ? '' : value
    router.push(`/stats${cat ? `?category=${encodeURIComponent(cat)}` : ''}`)
  }

  // Build platform grouped chart data
  const platformChartData = (stats?.platformDistribution ?? []).reduce(
    (acc, item) => {
      const existing = acc.find((d) => d.category === item.category)
      if (existing) {
        existing[item.platform] = item.count
      } else {
        acc.push({ category: item.category, [item.platform]: item.count })
      }
      return acc
    },
    [] as Array<Record<string, string | number>>
  )

  const platformNames = Array.from(
    new Set((stats?.platformDistribution ?? []).map((d) => d.platform))
  )

  const licenseData = stats
    ? [
        { name: 'Free / Open Source', value: stats.licenseBreakdown.free },
        { name: 'Paid / Commercial', value: stats.licenseBreakdown.paid },
      ]
    : []

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-muted rounded" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <div key={i} className="h-72 bg-muted rounded" />)}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader><CardTitle>Error</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Failed to load statistics.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Statistics Dashboard</h1>
        <p className="text-muted-foreground mb-6">Insights across all libraries in the directory</p>

        <div className="max-w-xs">
          <Label htmlFor="cat-filter" className="mb-2 block text-sm">Filter by Category</Label>
          <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger id="cat-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Libraries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLibraries}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCategory ? `in ${selectedCategory}` : 'across all categories'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.librariesPerCategory.length}</div>
            <p className="text-xs text-muted-foreground mt-1">unique categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.librariesPerLanguage.length}</div>
            <p className="text-xs text-muted-foreground mt-1">programming languages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Free Libraries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.licenseBreakdown.free}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats.totalLibraries} are free / open source
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Libraries per category */}
        <Card>
          <CardHeader>
            <CardTitle>Libraries per Category</CardTitle>
            <CardDescription>How many libraries exist in each category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.librariesPerCategory} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Libraries" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Libraries per language */}
        <Card>
          <CardHeader>
            <CardTitle>Libraries by Language</CardTitle>
            <CardDescription>Programming language distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.librariesPerLanguage} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="language" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name="Libraries" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Platform distribution */}
        {platformChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Platform Support per Category</CardTitle>
              <CardDescription>Which platforms each category supports</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={platformChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {platformNames.map((name, i) => (
                    <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} name={name} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* License breakdown pie */}
        <Card>
          <CardHeader>
            <CardTitle>License Breakdown</CardTitle>
            <CardDescription>Free vs paid libraries</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={licenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {licenseData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top organizations */}
      {stats.librariesByOrg.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations</CardTitle>
            <CardDescription>Organizations with the most libraries in the directory</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.librariesByOrg} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="org" type="category" width={160} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Libraries" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
