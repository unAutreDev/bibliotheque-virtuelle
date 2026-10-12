import Dexie, { type EntityTable } from 'dexie'

export type ReadingType = 'livre' | 'bd' | 'manga'
export type ReadingStatus = 'a_lire' | 'en_cours' | 'lu' | 'abandonne'

export interface Reading {
  id: number
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

export type ReadingDraft = Omit<Reading, 'id' | 'addedAt' | 'updatedAt'>

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

export const db = new Dexie('bibliotheque-virtuelle') as Dexie & {
  readings: EntityTable<Reading, 'id'>
}

db.version(1).stores({
  readings: '++id, type, status, title, addedAt',
})

export async function addReading(draft: ReadingDraft): Promise<number> {
  const now = new Date().toISOString()
  return db.readings.add({ ...draft, addedAt: now, updatedAt: now } as Reading)
}

export async function updateReading(id: number, changes: Partial<ReadingDraft>) {
  await db.readings.update(id, { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteReading(id: number) {
  await db.readings.delete(id)
}
