import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Header } from '../components/Header'
import { StarRating } from '../components/StarRating'
import { db, STATUS_LABELS, TYPE_LABELS, type Reading, type ReadingType } from '../lib/db'
import { matchesQuery } from '../lib/search'

type View = 'grille' | 'liste'

function loadView(): View {
  try {
    return localStorage.getItem('vue') === 'liste' ? 'liste' : 'grille'
  } catch {
    return 'grille'
  }
}

function subtitle(reading: Reading) {
  const series = reading.series ? `${reading.series}${reading.volume ? ` · T${reading.volume}` : ''}` : ''
  return [series, reading.authors.join(', ')].filter(Boolean).join(' — ')
}

export function Library() {
  const readings = useLiveQuery(() => db.readings.orderBy('addedAt').reverse().toArray())
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ReadingType | 'tous'>('tous')
  const [view, setView] = useState<View>(loadView)

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem('vue', next)
    } catch {
      // Préférence non mémorisée, sans conséquence.
    }
  }

  const filtered = (readings ?? []).filter((r) => (type === 'tous' || r.type === type) && matchesQuery(r, query))

  return (
    <div className="min-h-dvh pb-24">
      <Header
        title="Ma bibliothèque"
        action={
          <Link to="/reglages" className="rounded-full px-2 text-xl" aria-label="Réglages">
            ⚙︎
          </Link>
        }
      />

      <div className="sticky top-[3.25rem] z-10 space-y-2 bg-paper/95 px-4 pt-3 pb-2 backdrop-blur">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre, un auteur, une série…"
          className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 outline-none focus:border-accent"
        />
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['tous', 'livre', 'bd', 'manga'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${type === t ? 'bg-accent text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
            >
              {t === 'tous' ? 'Tous' : TYPE_LABELS[t]}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => changeView(view === 'grille' ? 'liste' : 'grille')}
            className="shrink-0 rounded-full bg-white px-3 py-1 text-sm ring-1 ring-stone-300"
            aria-label={view === 'grille' ? 'Afficher en liste' : 'Afficher en grille'}
          >
            {view === 'grille' ? '☰ Liste' : '▦ Grille'}
          </button>
        </div>
        {readings && readings.length > 0 && (
          <p className="text-xs text-stone-500">
            {filtered.length} lecture{filtered.length > 1 ? 's' : ''}
            {filtered.length !== readings.length && ` sur ${readings.length}`}
          </p>
        )}
      </div>

      <main className="px-4 pt-2">
        {readings && readings.length === 0 && (
          <div className="mt-16 text-center text-stone-500">
            <p className="text-5xl">📚</p>
            <p className="mt-4">Ta bibliothèque est vide.</p>
            <Link to="/ajouter" className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-white">
              Ajouter une première lecture
            </Link>
          </div>
        )}
        {readings && readings.length > 0 && filtered.length === 0 && (
          <p className="mt-12 text-center text-stone-500">Aucune lecture ne correspond à ta recherche.</p>
        )}

        {view === 'grille' ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/lecture/${r.id}`} className="block">
                  <Cover url={r.coverUrl} title={r.title} type={r.type} />
                  <p className="mt-1 line-clamp-2 text-xs leading-tight font-medium">{r.title}</p>
                  <StarRating value={r.rating} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-stone-200">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/lecture/${r.id}`} className="flex gap-3 py-2">
                  <div className="w-12 shrink-0">
                    <Cover url={r.coverUrl} title={r.title} type={r.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-sm text-stone-500">{subtitle(r)}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">{TYPE_LABELS[r.type]}</span>
                      <span>{STATUS_LABELS[r.status]}</span>
                      <StarRating value={r.rating} />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Link
        to="/ajouter"
        aria-label="Ajouter une lecture"
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-white shadow-lg active:scale-95"
      >
        +
      </Link>
    </div>
  )
}
