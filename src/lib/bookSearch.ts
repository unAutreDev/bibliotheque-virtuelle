import type { ReadingDraft, ReadingType } from './db'
import { normalize } from './search'

export type Source = 'Google Books' | 'Open Library' | 'AniList'

/** Un résultat de recherche en ligne, prêt à pré-remplir le formulaire. */
export interface BookResult {
  id: string
  source: Source
  title: string
  authors: string[]
  publishedDate?: string
  summary?: string
  isbn?: string
  coverUrl?: string
  volume?: number
  /** Résumé à charger seulement si le résultat est choisi (Open Library). */
  loadSummary?: () => Promise<string | undefined>
}

const TIMEOUT_MS = 8000

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json() as Promise<T>
}

export function cleanIsbn(text: string): string | undefined {
  const digits = text.replace(/[\s-]/g, '').toUpperCase()
  return /^(\d{9}[\dX]|\d{13})$/.test(digits) ? digits : undefined
}

const https = (url?: string) => url?.replace(/^http:\/\//, 'https://')

function stripHtml(text?: string): string | undefined {
  if (!text) return undefined
  const plain = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return plain || undefined
}

/** « Astérix, tome 4 », « One Piece T.12 », « Naruto Vol. 3 » → numéro de tome. */
export function guessVolume(title: string): number | undefined {
  const match = title.match(/(?:\btome|\bt\.|\bvol(?:ume)?\.?|\bn°|#)\s*(\d{1,4})\b/i)
  return match ? Number(match[1]) : undefined
}

// --- Google Books -----------------------------------------------------------

interface GoogleVolume {
  id: string
  volumeInfo: {
    title?: string
    subtitle?: string
    authors?: string[]
    publishedDate?: string
    description?: string
    industryIdentifiers?: { type: string; identifier: string }[]
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  }
}

async function searchGoogle(query: string, isbn?: string): Promise<BookResult[]> {
  const q = isbn ? `isbn:${isbn}` : query
  const data = await getJson<{ items?: GoogleVolume[] }>(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books`,
  )
  return (data.items ?? [])
    .filter((item) => item.volumeInfo.title)
    .map(({ id, volumeInfo: v }) => {
      const title = v.subtitle && !/^\d+$/.test(v.subtitle) ? `${v.title} : ${v.subtitle}` : v.title!
      const ids = v.industryIdentifiers ?? []
      const thumbnail = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail
      return {
        id: `google-${id}`,
        source: 'Google Books' as const,
        title,
        authors: v.authors ?? [],
        publishedDate: v.publishedDate,
        summary: stripHtml(v.description),
        isbn: (ids.find((i) => i.type === 'ISBN_13') ?? ids.find((i) => i.type === 'ISBN_10'))?.identifier,
        coverUrl: https(thumbnail)?.replace('&edge=curl', ''),
        volume: guessVolume(title),
      }
    })
}

// --- Open Library -----------------------------------------------------------

interface OpenLibraryDoc {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  isbn?: string[]
}

async function loadOpenLibrarySummary(workKey: string): Promise<string | undefined> {
  const work = await getJson<{ description?: string | { value: string } }>(`https://openlibrary.org${workKey}.json`)
  const description = typeof work.description === 'string' ? work.description : work.description?.value
  return stripHtml(description)
}

async function searchOpenLibrary(query: string, isbn?: string): Promise<BookResult[]> {
  const params = isbn ? `isbn=${isbn}` : `q=${encodeURIComponent(query)}`
  const data = await getJson<{ docs?: OpenLibraryDoc[] }>(
    `https://openlibrary.org/search.json?${params}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn`,
  )
  return (data.docs ?? []).map((doc) => ({
    id: `openlibrary-${doc.key}`,
    source: 'Open Library' as const,
    title: doc.title,
    authors: doc.author_name ?? [],
    publishedDate: doc.first_publish_year?.toString(),
    isbn: isbn ?? doc.isbn?.find((i) => i.length === 13) ?? doc.isbn?.[0],
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
    volume: guessVolume(doc.title),
    loadSummary: () => loadOpenLibrarySummary(doc.key),
  }))
}

// --- AniList (mangas) -------------------------------------------------------

interface AniListMedia {
  id: number
  title: { romaji?: string; english?: string; native?: string }
  description?: string
  startDate?: { year?: number; month?: number; day?: number }
  coverImage?: { extraLarge?: string; large?: string }
  staff?: { edges: { role: string; node: { name: { full: string } } }[] }
}

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      description(asHtml: false)
      startDate { year month day }
      coverImage { extraLarge large }
      staff(perPage: 4, sort: RELEVANCE) { edges { role node { name { full } } } }
    }
  }
}`

async function searchAniList(query: string): Promise<BookResult[]> {
  const data = await getJson<{ data?: { Page?: { media?: AniListMedia[] } } }>('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: query } }),
  })
  return (data.data?.Page?.media ?? []).map((m) => {
    const authors = (m.staff?.edges ?? [])
      .filter((e) => /story|art/i.test(e.role))
      .map((e) => e.node.name.full)
    const date = m.startDate?.year
      ? [m.startDate.day, m.startDate.month].every(Boolean)
        ? `${String(m.startDate.day).padStart(2, '0')}/${String(m.startDate.month).padStart(2, '0')}/${m.startDate.year}`
        : String(m.startDate.year)
      : undefined
    return {
      id: `anilist-${m.id}`,
      source: 'AniList' as const,
      title: m.title.english ?? m.title.romaji ?? m.title.native ?? 'Sans titre',
      authors: [...new Set(authors)],
      publishedDate: date,
      summary: stripHtml(m.description),
      coverUrl: m.coverImage?.extraLarge ?? m.coverImage?.large,
    }
  })
}

// --- Recherche combinée -----------------------------------------------------

export interface SearchOutcome {
  results: BookResult[]
  /** Vrai si toutes les sources ont échoué (hors ligne, quota…). */
  failed: boolean
}

function dedupeKey(result: BookResult) {
  return `${normalize(result.title)}|${normalize(result.authors[0] ?? '')}`
}

/**
 * Interroge les sources en parallèle. Pour un manga, AniList passe en premier ;
 * sinon Google Books (meilleur en français), puis Open Library.
 */
export async function searchBooks(query: string, type: ReadingType): Promise<SearchOutcome> {
  const isbn = cleanIsbn(query)
  const searches: Promise<BookResult[]>[] = [searchGoogle(query, isbn), searchOpenLibrary(query, isbn)]
  if (type === 'manga' && !isbn) searches.unshift(searchAniList(query))

  const settled = await Promise.allSettled(searches)
  const seen = new Set<string>()
  const results: BookResult[] = []
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue
    for (const result of outcome.value) {
      const key = dedupeKey(result)
      if (seen.has(key)) continue
      seen.add(key)
      results.push(result)
    }
  }
  return { results, failed: settled.every((s) => s.status === 'rejected') }
}

/** Transforme un résultat choisi en champs de formulaire (les champs absents ne sont pas touchés). */
export async function resultToDraft(result: BookResult): Promise<Partial<ReadingDraft>> {
  let summary = result.summary
  if (!summary && result.loadSummary) summary = await result.loadSummary().catch(() => undefined)
  const coverUrl =
    result.coverUrl ?? (result.isbn ? `https://covers.openlibrary.org/b/isbn/${result.isbn}-L.jpg?default=false` : undefined)
  const draft: Partial<ReadingDraft> = { title: result.title, authors: result.authors }
  if (result.publishedDate) draft.publishedDate = result.publishedDate
  if (summary) draft.summary = summary
  if (result.isbn) draft.isbn = result.isbn
  if (coverUrl) draft.coverUrl = coverUrl
  if (result.volume !== undefined) draft.volume = result.volume
  return draft
}

/** Cherche seulement une couverture pour une lecture déjà saisie (ISBN en priorité, sinon titre et auteur). */
export async function findCover(draft: Pick<ReadingDraft, 'title' | 'authors' | 'isbn' | 'type'>): Promise<string | undefined> {
  const query = draft.isbn ?? [draft.title, draft.authors[0]].filter(Boolean).join(' ')
  if (!query.trim()) return undefined
  const { results } = await searchBooks(query, draft.type)
  const target = normalize(draft.title)
  const withCover = results.filter((r) => r.coverUrl)
  const best = withCover.find((r) => normalize(r.title).includes(target) || target.includes(normalize(r.title))) ?? withCover[0]
  if (best) return best.coverUrl
  const isbn = draft.isbn && cleanIsbn(draft.isbn)
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : undefined
}
