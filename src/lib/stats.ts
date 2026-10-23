import type { Reading } from './db'

export interface MonthCount {
  label: string
  count: number
}

export interface ReadingStats {
  year: number
  readThisYear: number
  inProgress: number
  toRead: number
  /** Lectures terminées par mois, des plus anciens aux plus récents. */
  months: MonthCount[]
}

/** Date de fin d'une lecture lue ; les lectures plus anciennes que ce champ utilisent leur dernière modification. */
export function finishedDate(reading: Reading): Date | undefined {
  if (reading.status !== 'lu') return undefined
  return new Date(reading.finishedAt ?? reading.updatedAt)
}

export function computeStats(readings: Reading[], now = new Date(), monthCount = 6): ReadingStats {
  const year = now.getFullYear()
  const months: MonthCount[] = []
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(year, now.getMonth() - i, 1)
    months.push({ label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), count: 0 })
  }
  const firstMonth = new Date(year, now.getMonth() - (monthCount - 1), 1)

  let readThisYear = 0
  for (const reading of readings) {
    const date = finishedDate(reading)
    if (!date) continue
    if (date.getFullYear() === year) readThisYear++
    if (date >= firstMonth && date <= now) {
      const index = (date.getFullYear() - firstMonth.getFullYear()) * 12 + date.getMonth() - firstMonth.getMonth()
      months[index].count++
    }
  }

  return {
    year,
    readThisYear,
    inProgress: readings.filter((r) => r.status === 'en_cours').length,
    toRead: readings.filter((r) => r.status === 'a_lire').length,
    months,
  }
}
