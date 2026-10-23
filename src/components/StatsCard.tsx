import type { Reading } from '../lib/db'
import { computeStats } from '../lib/stats'

/** Résumé de l'année et petit graphique des lectures terminées sur les six derniers mois. */
export function StatsCard({ readings }: { readings: Reading[] }) {
  const stats = computeStats(readings)
  const max = Math.max(1, ...stats.months.map((m) => m.count))

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="Statistiques de lecture">
      <dl className="grid grid-cols-3 text-center">
        {[
          [stats.readThisYear, `lus en ${stats.year}`],
          [stats.inProgress, 'en cours'],
          [stats.toRead, 'à lire'],
        ].map(([value, label]) => (
          <div key={label}>
            <dd className="font-display text-3xl text-accent tabular-nums">{value}</dd>
            <dt className="text-xs text-stone-500">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex h-16 items-end gap-2" aria-hidden>
        {stats.months.map((m, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {m.count > 0 && <span className="text-[0.65rem] text-stone-500 tabular-nums">{m.count}</span>}
            <div
              className={`w-full rounded-t ${i === stats.months.length - 1 ? 'bg-coral' : 'bg-accent'}`}
              style={{ height: `${m.count ? Math.max(8, (m.count / max) * 100) : 4}%`, opacity: m.count ? 1 : 0.2 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 text-center text-[0.65rem] text-stone-500">
        {stats.months.map((m, i) => (
          <span key={i} className="flex-1">
            {m.label}
          </span>
        ))}
      </div>
      <p className="sr-only">
        Lectures terminées par mois : {stats.months.map((m) => `${m.label} ${m.count}`).join(', ')}.
      </p>
    </section>
  )
}
