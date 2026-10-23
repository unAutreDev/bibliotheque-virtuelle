import { cleanIsbn, guessVolume, splitSeries, type BookResult } from './bookSearch'
import { normalize } from './search'

/** Valeurs proposées sous chaque champ, à toucher pour remplir sans taper. */
export interface FieldSuggestions {
  title: string[]
  series: string[]
  authors: string[]
  volume: number[]
  publishedDate: string[]
  isbn: string[]
  genres: string[]
}

export const NO_SUGGESTIONS: FieldSuggestions = { title: [], series: [], authors: [], volume: [], publishedDate: [], isbn: [], genres: [] }

const MAX_PER_FIELD = 6

/** « ASTÉRIX LE GAULOIS » → « Astérix le gaulois » : l'OCR rend souvent les titres en capitales. */
export function tidyText(text: string): string {
  if (text !== text.toUpperCase()) return text
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function unique<T>(values: (T | undefined)[], key: (value: T) => string = (v) => normalize(String(v))): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const value of values) {
    if (value === undefined || value === '') continue
    const k = key(value)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(value)
    if (out.length === MAX_PER_FIELD) break
  }
  return out
}

/** Une ligne qui ressemble à un nom de personne : 1 à 4 mots, uniquement des lettres. */
const looksLikeName = (line: string) => /^[\p{L}'’.\- ]+$/u.test(line) && line.trim().split(/\s+/).length <= 4

/**
 * Combine ce qui a été lu sur la photo (lignes de texte, de la plus grande à la plus petite)
 * et les résultats de la recherche en ligne. Les résultats passent en premier : ils sont
 * mieux orthographiés que l'OCR, qui reste utile quand rien n'est trouvé en ligne.
 */
export function buildSuggestions(ocrLines: string[], results: BookResult[]): FieldSuggestions {
  const lines = ocrLines.map(tidyText)
  const ocrText = ocrLines.join('\n')
  const top = results.slice(0, 5).map((result) => ({ result, split: splitSeries(result.title) }))

  const numbers = [...ocrText.matchAll(/(?:^|\s)(\d{1,3})(?=\s|$)/gm)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 300)
  const years = [...ocrText.matchAll(/\b(1[89]\d{2}|20\d{2})\b/g)].map((m) => m[1])
  const isbns = [...ocrText.matchAll(/(?:97[89][\d\s-]{10,14})/g)].map((m) => cleanIsbn(m[0]))

  return {
    title: unique([...top.map(({ split }) => split.title), ...lines.slice(0, 5)]),
    series: unique([...top.map(({ result, split }) => result.series ?? split.series), ...lines.slice(0, 4)]),
    authors: unique([...top.flatMap(({ result }) => result.authors), ...lines.filter(looksLikeName)]),
    volume: unique([guessVolume(ocrText), ...top.map(({ result, split }) => result.volume ?? split.volume), ...numbers]),
    publishedDate: unique([...top.map(({ result }) => result.publishedDate), ...years]),
    isbn: unique([...top.map(({ result }) => result.isbn), ...isbns]),
    genres: unique(top.flatMap(({ result }) => result.genres ?? [])),
  }
}
