import { useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Reading } from '../lib/db'
import { Cover } from './Cover'

// Mêmes paliers que l'ancienne grille : 3 livres par planche sur téléphone, 4 puis 6 sur écran plus large.
const WIDE = '(min-width: 768px)'
const MEDIUM = '(min-width: 640px)'

function columnsNow(): number {
  if (typeof window === 'undefined' || !window.matchMedia) return 3
  if (window.matchMedia(WIDE).matches) return 6
  if (window.matchMedia(MEDIUM).matches) return 4
  return 3
}

function subscribe(listener: () => void) {
  const queries = [WIDE, MEDIUM].map((q) => window.matchMedia(q))
  queries.forEach((q) => q.addEventListener('change', listener))
  return () => queries.forEach((q) => q.removeEventListener('change', listener))
}

function useColumns() {
  return useSyncExternalStore(subscribe, columnsNow, () => 3)
}

interface ShelfProps {
  readings: Reading[]
  label: (reading: Reading) => ReactNode
}

/** Les couvertures debout sur des planches, une planche par rangée, l'étiquette sous la planche. */
export function Shelf({ readings, label }: ShelfProps) {
  const columns = useColumns()
  const rows: Reading[][] = []
  for (let i = 0; i < readings.length; i += columns) rows.push(readings.slice(i, i + columns))
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row[0].id}>
          <ul className="grid items-end gap-3 px-2" style={grid}>
            {row.map((r) => (
              <li key={r.id}>
                <Link to={`/lecture/${r.id}`} className="block" aria-label={r.title}>
                  <Cover url={r.coverUrl} title={r.title} type={r.type} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="shelf-plank" />
          <div className="grid gap-3 px-2 pt-1.5" style={grid} aria-hidden>
            {row.map((r) => (
              <Link key={r.id} to={`/lecture/${r.id}`} tabIndex={-1} className="block min-w-0">
                {label(r)}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
