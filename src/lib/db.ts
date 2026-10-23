import Dexie, { type EntityTable } from 'dexie'

export type ReadingType = 'livre' | 'bd' | 'manga'
export type ReadingStatus = 'a_lire' | 'en_cours' | 'lu' | 'abandonne'

export interface Reading {
  id: number
  /** Identifiant partagé entre appareils pour la synchronisation. */
  uid: string
  type: ReadingType
  title: string
  series?: string
  volume?: number
  authors: string[]
  publishedDate?: string
  summary?: string
  isbn?: string
  coverUrl?: string
  status: ReadingStatus
  rating?: number
  comment?: string
  addedAt: string
  updatedAt: string
}

export type ReadingDraft = Omit<Reading, 'id' | 'uid' | 'addedAt' | 'updatedAt'>

export const TYPE_LABELS: Record<ReadingType, string> = {
  livre: 'Livre',
  bd: 'BD',
  manga: 'Manga',
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  a_lire: 'À lire',
  en_cours: 'En cours',
  lu: 'Lu',
  abandonne: 'Abandonné',
}

/** Suppression pas encore envoyée au serveur de synchronisation. */
export interface Deletion {
  uid: string
  deletedAt: string
}

export const db = new Dexie('bibliotheque-virtuelle') as Dexie & {
  readings: EntityTable<Reading, 'id'>
  deletions: EntityTable<Deletion, 'uid'>
}

db.version(1).stores({
  readings: '++id, type, status, title, addedAt',
})

db.version(2)
  .stores({
    readings: '++id, &uid, type, status, title, addedAt, updatedAt',
    deletions: 'uid',
  })
  .upgrade((tx) =>
    tx
      .table('readings')
      .toCollection()
      .modify((reading: Reading) => {
        reading.uid ??= crypto.randomUUID()
      }),
  )

/** Prévenu après chaque modification locale (la synchronisation s'y abonne). */
let onLocalChange: () => void = () => {}
export function setLocalChangeListener(listener: () => void) {
  onLocalChange = listener
}

export async function addReading(draft: ReadingDraft): Promise<number> {
  const now = new Date().toISOString()
  const id = await db.readings.add({ ...draft, uid: crypto.randomUUID(), addedAt: now, updatedAt: now } as Reading)
  onLocalChange()
  return id
}

export async function updateReading(id: number, changes: Partial<ReadingDraft>) {
  await db.readings.update(id, { ...changes, updatedAt: new Date().toISOString() })
  onLocalChange()
}

export async function deleteReading(id: number) {
  await db.transaction('rw', db.readings, db.deletions, async () => {
    const reading = await db.readings.get(id)
    if (!reading) return
    await db.readings.delete(id)
    await db.deletions.put({ uid: reading.uid, deletedAt: new Date().toISOString() })
  })
  onLocalChange()
}
