import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../components/Header'
import { SyncPanel } from '../components/SyncPanel'
import { db } from '../lib/db'
import { exportCsv, exportJson } from '../lib/export'

export function Settings() {
  const readings = useLiveQuery(() => db.readings.orderBy('addedAt').toArray())
  const empty = !readings || readings.length === 0

  return (
    <div className="min-h-dvh">
      <Header title="Réglages" back="/" />
      <main className="mx-auto max-w-xl space-y-4 p-4">
        <SyncPanel />
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="font-semibold">Exporter ma bibliothèque</h2>
          <p className="mt-1 text-sm text-stone-600">
            Garde une copie de tes lectures dans un fichier, pour Excel ou en sauvegarde.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              disabled={empty}
              onClick={() => readings && exportCsv(readings)}
              className="flex-1 rounded-full bg-accent py-2 text-white disabled:opacity-40"
            >
              Exporter pour Excel (CSV)
            </button>
            <button
              disabled={empty}
              onClick={() => readings && exportJson(readings)}
              className="flex-1 rounded-full py-2 text-accent ring-1 ring-accent disabled:opacity-40"
            >
              Sauvegarde complète (JSON)
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {readings?.length ?? 0} lecture{(readings?.length ?? 0) > 1 ? 's' : ''} à exporter.
          </p>
        </section>
      </main>
    </div>
  )
}
