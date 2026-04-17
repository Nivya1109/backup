'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Search, Menu, X, BarChart2, GitCompare, Layers, MessageSquare } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'

const navLinks = [
  { href: '/search', label: 'Browse', icon: Layers },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/stats', label: 'Statistics', icon: BarChart2 },
  { href: '/support', label: 'Support', icon: MessageSquare },
]

export function Navbar() {
  const [showSearch, setShowSearch] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  useEffect(() => { setMounted(true) }, [])

  return (
    <nav className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>LibFinder</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Admin access — only rendered after client hydration */}
            {mounted && (session ? (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors">
                  Admin
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/admin/login" className="hidden md:block text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors">
                Admin Login
              </Link>
            ))}
            <button
              onClick={() => {
                if (pathname === '/search') {
                  // Focus the existing search input on the search page
                  const input = document.querySelector<HTMLInputElement>('main input[type="text"]')
                  if (input) {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    setTimeout(() => input.focus(), 300)
                  }
                } else {
                  setShowSearch(!showSearch)
                  setShowMobileMenu(false)
                }
              }}
              className={cn(
                'p-2 rounded-md transition-colors text-sm',
                showSearch ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowMobileMenu(!showMobileMenu); setShowSearch(false) }}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Search overlay — hidden on /search page since it has its own search bar */}
        {showSearch && pathname !== '/search' && (
          <div className="border-t py-3">
            <SearchBar onSearch={() => setShowSearch(false)} />
          </div>
        )}
      </div>
    </nav>
  )
}
