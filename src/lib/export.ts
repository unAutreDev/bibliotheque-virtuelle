import { STATUS_LABELS, TYPE_LABELS, type Reading } from './db'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function exportJson(readings: Reading[]) {
  const payload = { app: 'bibliotheque-virtuelle', version: 1, exportedAt: new Date().toISOString(), readings }
  download(`bibliotheque-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV séparé par des points-virgules, avec BOM, pour s'ouvrir directement dans Excel en français. */
export function exportCsv(readings: Reading[]) {
  const header = ['Type', 'Titre', 'Série', 'Tome', 'Auteurs', 'Date de parution', 'Statut', 'Note', 'Commentaire', 'ISBN', 'Résumé', 'Ajouté le']
  const rows = readings.map((r) => [
    TYPE_LABELS[r.type],
    r.title,
    r.series,
    r.volume,
    r.authors.join(', '),
    r.publishedDate,
    STATUS_LABELS[r.status],
    r.rating,
    r.comment,
    r.isbn,
    r.summary,
    r.addedAt.slice(0, 10),
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
  download(`bibliotheque-${today()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8')
}
