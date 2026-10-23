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
