/**
 * expandQuery.ts — Phrase-based use-case query expansion
 *
 * Takes a raw user query and checks it against useCaseMap.
 * If the query contains a known use-case phrase, returns the mapped keywords
 * so they can be appended to the Typesense search query.
 *
 * Safe by design:
 *  - Returns [] if no use-case match → search falls back to original query
 *  - Never removes or replaces original query terms, only ADDS new ones
 *  - Stateless pure function, no side effects
 */

import { useCaseMap } from './useCaseMap'

/**
 * Returns additional search keywords based on use-case phrase detection.
 *
 * Example:
 *   expandQuery("test react app")
 *   → ["react testing library", "jest", "vitest", "enzyme"]
 *
 *   expandQuery("axios")
 *   → []  (no phrase match, original query unchanged)
 */
export function expandQuery(query: string): string[] {
  if (!query || !query.trim()) return []

  const normalized = query.toLowerCase().trim()
  const extras = new Set<string>()

  for (const [phrase, keywords] of Object.entries(useCaseMap)) {
    // Match if the user's query contains this use-case phrase
    if (normalized.includes(phrase)) {
      keywords.forEach((k) => extras.add(k))
    }
  }

  return Array.from(extras)
}
