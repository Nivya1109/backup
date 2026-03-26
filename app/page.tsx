import Link from 'next/link'
import { SearchBar } from '@/components/SearchBar'
import {
  Globe, Shield, Database, TestTube2, BarChart2,
  Layers, BookOpen, Terminal, Zap, Lock
} from 'lucide-react'

const CATEGORIES = [
  { name: 'HTTP & Networking', href: '/search?category=HTTP+%26+Networking', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50', description: 'HTTP clients, REST, WebSocket' },
  { name: 'Authentication & Security', href: '/search?category=Authentication+%26+Security', icon: Shield, color: 'text-green-500', bg: 'bg-green-50', description: 'Auth, OAuth, JWT, sessions' },
  { name: 'Database & ORM', href: '/search?category=Database+%26+ORM', icon: Database, color: 'text-orange-500', bg: 'bg-orange-50', description: 'ORMs, drivers, query builders' },
  { name: 'Testing', href: '/search?category=Testing', icon: TestTube2, color: 'text-red-500', bg: 'bg-red-50', description: 'Unit, E2E, mocking, fixtures' },
  { name: 'Data Science & ML', href: '/search?category=Data+Science+%26+ML', icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-50', description: 'NumPy, Pandas, ML frameworks' },
  { name: 'UI Frameworks', href: '/search?category=UI+Frameworks', icon: Layers, color: 'text-pink-500', bg: 'bg-pink-50', description: 'React, Vue, component libraries' },
  { name: 'Logging & Monitoring', href: '/search?category=Logging+%26+Monitoring', icon: BookOpen, color: 'text-cyan-500', bg: 'bg-cyan-50', description: 'Structured logging, observability' },
  { name: 'DevOps & Infrastructure', href: '/search?category=DevOps+%26+Infrastructure', icon: Terminal, color: 'text-slate-500', bg: 'bg-slate-50', description: 'IaC, CI/CD, containers' },
  { name: 'Messaging & Events', href: '/search?category=Messaging+%26+Events', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', description: 'Kafka, queues, event systems' },
  { name: 'Security & Cryptography', href: '/search?category=Security+%26+Cryptography', icon: Lock, color: 'text-indigo-500', bg: 'bg-indigo-50', description: 'Hashing, encryption, TLS' },
]

const STATS = [
  { label: 'Libraries', value: '100+' },
  { label: 'Languages', value: '10+' },
  { label: 'Categories', value: '10' },
  { label: 'Platforms', value: '7' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-8">
              <BookOpen className="h-3.5 w-3.5" />
              Software Library Directory
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Find the perfect{' '}
              <span className="gradient-text">library</span>
              {' '}for your project
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Search, discover, and compare software libraries by name, language, platform, or describe what you need — even if you don&apos;t know the library name.
            </p>

            <div className="mb-6">
              <SearchBar />
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span>Try:</span>
              {['HTTP client for Python', 'authentication middleware', 'React testing', 'SQL ORM TypeScript'].map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="px-2.5 py-1 bg-white border rounded-full hover:border-primary hover:text-primary transition-colors"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t bg-white/60 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-center gap-8 sm:gap-16">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">Browse by Category</h2>
          <p className="text-muted-foreground text-sm">Explore curated collections of battle-tested libraries</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Link key={cat.name} href={cat.href}>
                <div className="p-4 border rounded-xl bg-white card-hover cursor-pointer group h-full flex flex-col gap-2">
                  <div className={`w-9 h-9 ${cat.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                      {cat.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* CTA row */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Browse all libraries
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Compare libraries
          </Link>
          <Link
            href="/stats"
            className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            View statistics
          </Link>
        </div>
      </div>
    </div>
  )
}
