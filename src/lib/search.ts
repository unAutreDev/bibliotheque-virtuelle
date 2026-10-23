import type { Reading } from './db'

/** Minuscules et sans accents, pour que « Hergé » se trouve en tapant « herge ». */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function matchesQuery(reading: Reading, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalize(
    [reading.title, reading.series ?? '', ...reading.authors, ...(reading.genres ?? []), reading.isbn ?? ''].join(' '),
  )
  return words.every((word) => haystack.includes(word))
}
