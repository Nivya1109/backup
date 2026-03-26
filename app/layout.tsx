import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'LibFinder — Software Library Directory',
  description: 'Discover, compare, and evaluate software libraries for your next project. Search by name, language, platform, or what you want to accomplish.',
  keywords: ['software libraries', 'npm', 'pypi', 'open source', 'developer tools', 'library finder', 'package directory'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-8 mt-16">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="text-primary">◆</span> LibFinder
            </div>
            <p>Software Library Directory — Find the right library for your project</p>
            <div className="flex gap-4">
              <a href="/search" className="hover:text-foreground transition-colors">Browse</a>
              <a href="/compare" className="hover:text-foreground transition-colors">Compare</a>
              <a href="/stats" className="hover:text-foreground transition-colors">Stats</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
