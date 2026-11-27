import type { Reading } from './db'
import { normalize } from './search'

export type SeriesState = 'termine' | 'en_cours'

export const SERIES_STATE_LABELS: Record<SeriesState, string> = {
  termine: 'Terminé',
  en_cours: 'En cours',
}

export interface SeriesGroup {
  /** Nom normalisé : « Astérix » et « asterix » forment la même série. */
  key: string
  name: string
  readings: Reading[]
  readCount: number
  state: SeriesState
}

/** Une série est terminée quand tous ses tomes sont lus, sinon elle est en cours. */
export function seriesState(readings: Reading[]): SeriesState {
  return readings.every((r) => r.status === 'lu') ? 'termine' : 'en_cours'
}

/** Regroupe les lectures par série (tomes triés par numéro), les lectures sans série restent à part. */
export function groupBySeries(readings: Reading[]): { groups: SeriesGroup[]; standalone: Reading[] } {
  const byKey = new Map<string, Reading[]>()
  const standalone: Reading[] = []
  for (const reading of readings) {
    const key = reading.series ? normalize(reading.series) : ''
    if (!key) {
      standalone.push(reading)
      continue
    }
    const list = byKey.get(key)
    if (list) list.push(reading)
    else byKey.set(key, [reading])
  }

  const groups = [...byKey].map(([key, list]): SeriesGroup => {
    const sorted = [...list].sort(
      (a, b) => (a.volume ?? Infinity) - (b.volume ?? Infinity) || a.title.localeCompare(b.title, 'fr'),
    )
    return {
      key,
      name: sorted[0].series!.trim(),
      readings: sorted,
      readCount: sorted.filter((r) => r.status === 'lu').length,
      state: seriesState(sorted),
    }
  })
  groups.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  return { groups, standalone }
}

/** Champs communs à tous les tomes d'une série, repris quand on en ajoute un nouveau. */
export type SeriesTemplate = Pick<Reading, 'type' | 'series' | 'authors' | 'genres'> & { nextVolume?: number }

/**
 * Modèle tiré des tomes déjà présents d'une série (nom comparé sans accents ni majuscules) :
 * type, nom exact, auteurs et genres du tome le plus récent qui en a, et numéro du tome suivant.
 * Les champs propres à un tome (titre, ISBN, couverture, note, statut…) ne sont jamais repris.
 */
export function seriesTemplate(readings: Reading[], series: string): SeriesTemplate | undefined {
  const key = normalize(series)
  if (!key) return undefined
  const tomes = readings
    .filter((r) => r.series && normalize(r.series) === key)
    .sort((a, b) => (b.volume ?? -Infinity) - (a.volume ?? -Infinity) || b.addedAt.localeCompare(a.addedAt))
  if (tomes.length === 0) return undefined
  const latest = tomes[0]
  const volumes = tomes.map((r) => r.volume).filter((v): v is number => v !== undefined)
  return {
    type: latest.type,
    series: latest.series!.trim(),
    authors: tomes.find((r) => r.authors.length > 0)?.authors ?? [],
    genres: tomes.find((r) => r.genres?.length)?.genres,
    nextVolume: volumes.length ? Math.max(...volumes) + 1 : undefined,
  }
}

/** Noms des séries de la bibliothèque, pour l'autocomplétion du champ Série. */
export function seriesNames(readings: Reading[]): string[] {
  return groupBySeries(readings).groups.map((g) => g.name)
}

/** Lien du formulaire d'ajout préparé pour le tome suivant d'une série. */
export function nextVolumeLink(series: string): string {
  return `/ajouter?serie=${encodeURIComponent(series)}`
}
