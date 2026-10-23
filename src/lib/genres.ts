import { normalize } from './search'

/** Genres proposés d'office dans la fiche ; on peut aussi en taper d'autres. */
export const COMMON_GENRES = [
  'Roman',
  'Science-fiction',
  'Fantasy',
  'Fantastique',
  'Policier',
  'Thriller',
  'Horreur',
  'Romance',
  'Historique',
  'Aventure',
  'Action',
  'Humour',
  'Drame',
  'Jeunesse',
  'Dystopie',
  'Surnaturel',
  'Tranche de vie',
  'Biographie',
  'Essai',
  'Shōnen',
  'Shōjo',
  'Seinen',
]

/**
 * Mots repérés dans les catégories des sites de recherche (souvent en anglais :
 * « Fiction / Science Fiction / General » chez Google, « Sci-Fi » chez AniList)
 * et le genre français correspondant.
 */
const KEYWORDS: [RegExp, string][] = [
  [/\bsci(ence)?[ -]?fi(ction)?\b/, 'Science-fiction'],
  [/\bfantasy\b/, 'Fantasy'],
  [/\bfantastique\b/, 'Fantastique'],
  [/\b(crime|detective|policier|polar)s?\b/, 'Policier'],
  [/\bmyster(y|ies|e)\b/, 'Mystère'],
  [/\b(thriller|suspense)s?\b/, 'Thriller'],
  [/\b(horror|horreur|epouvante)\b/, 'Horreur'],
  [/\b(romance|love stories|romantique)\b/, 'Romance'],
  [/\bhistori(cal|que)\b/, 'Historique'],
  [/\b(adventure|aventure)s?\b/, 'Aventure'],
  [/\baction\b/, 'Action'],
  [/\b(humou?r|comedy|comedie|humoristique)\b/, 'Humour'],
  [/\b(drama|drame)\b/, 'Drame'],
  [/\b(juvenile|children|jeunesse|young adult)\b/, 'Jeunesse'],
  [/\bdystopi/, 'Dystopie'],
  [/\b(supernatural|surnaturel|paranormal)\b/, 'Surnaturel'],
  [/\b(slice of life|tranche de vie)\b/, 'Tranche de vie'],
  [/\b(auto)?biograph/, 'Biographie'],
  [/\b(essays?|essai)\b/, 'Essai'],
  [/\bpsycholog/, 'Psychologique'],
  [/\bsports?\b/, 'Sport'],
  [/\bmecha\b/, 'Mecha'],
  [/\b(poetry|poesie)\b/, 'Poésie'],
  [/\bwestern\b/, 'Western'],
  [/\b(war|guerre)\b/, 'Guerre'],
  [/\b(self-help|developpement personnel)\b/, 'Développement personnel'],
  [/\bshou?nen\b/, 'Shōnen'],
  [/\bshou?jo\b/, 'Shōjo'],
  [/\bseinen\b/, 'Seinen'],
  [/\bjosei\b/, 'Josei'],
]

/** Traduit des catégories trouvées en ligne en genres français connus (les autres sont ignorées). */
export function mapGenres(categories: string[]): string[] {
  const found = new Set<string>()
  for (const category of categories) {
    const text = normalize(category)
    for (const [pattern, genre] of KEYWORDS) if (pattern.test(text)) found.add(genre)
  }
  return [...found]
}

/** « science fiction » tapé à la main → « Science fiction », et le genre connu s'il existe déjà. */
export function tidyGenre(text: string): string | undefined {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return undefined
  const known = [...COMMON_GENRES, ...KEYWORDS.map(([, genre]) => genre)].find((g) => normalize(g) === normalize(trimmed))
  return known ?? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Ajoute un genre à la liste s'il n'y est pas déjà (sans tenir compte des accents ni des majuscules). */
export function addGenre(genres: string[], genre: string): string[] {
  const tidy = tidyGenre(genre)
  if (!tidy || genres.some((g) => normalize(g) === normalize(tidy))) return genres
  return [...genres, tidy]
}
