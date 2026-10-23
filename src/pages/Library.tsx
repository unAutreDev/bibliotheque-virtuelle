import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Header } from '../components/Header'
import { HeartRating } from '../components/HeartRating'
import { Shelf } from '../components/Shelf'
import { StatsCard } from '../components/StatsCard'
import { db, STATUS_LABELS, TYPE_LABELS, type Reading, type ReadingStatus, type ReadingType } from '../lib/db'
import { matchesQuery } from '../lib/search'
import { groupBySeries, SERIES_STATE_LABELS, type SeriesGroup, type SeriesState } from '../lib/series'

type View = 'grille' | 'liste'

// Ordre des étagères quand les lectures sont rangées par statut.
const SHELF_ORDER: ReadingStatus[] = ['en_cours', 'a_lire', 'lu', 'abandonne']
const SHELF_TITLES: Record<ReadingStatus, string> = {
  en_cours: 'En cours',
  a_lire: 'À lire',
  lu: 'Lus',
  abandonne: 'Abandonnés',
}

function loadGrouped(): boolean {
  try {
    return localStorage.getItem('groupe') === 'series'
  } catch {
    return false
  }
}

function SeriesBadge({ group }: { group: SeriesGroup }) {
  const done = group.state === 'termine'
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
    >
      {SERIES_STATE_LABELS[group.state]}
    </span>
  )
}

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
  const [grouped, setGrouped] = useState(loadGrouped)
  const [seriesFilter, setSeriesFilter] = useState<SeriesState | 'toutes'>('toutes')

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem('vue', next)
    } catch {
      // Préférence non mémorisée, sans conséquence.
    }
  }

  const toggleGrouped = () => {
    setGrouped(!grouped)
    try {
      localStorage.setItem('groupe', grouped ? 'aucun' : 'series')
    } catch {
      // Préférence non mémorisée, sans conséquence.
    }
  }

  const filtered = (readings ?? []).filter((r) => (type === 'tous' || r.type === type) && matchesQuery(r, query))
  const { groups, standalone } = groupBySeries(filtered)
  const shownGroups = groups.filter((g) => seriesFilter === 'toutes' || g.state === seriesFilter)
  const shownStandalone = seriesFilter === 'toutes' ? standalone : []
  const nothingShown = grouped ? shownGroups.length === 0 && shownStandalone.length === 0 : filtered.length === 0

  const renderReadings = (list: Reading[]) =>
    view === 'grille' ? (
      <Shelf
        readings={list}
        label={(r) => (
          <>
            <p className="line-clamp-2 text-xs leading-tight font-medium">
              {grouped && r.volume ? `T${r.volume} · ` : ''}
              {r.title}
            </p>
            <HeartRating value={r.rating} />
          </>
        )}
      />
    ) : (
      <ul className="divide-y divide-stone-200">
        {list.map((r) => (
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
                  <HeartRating value={r.rating} />
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )

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
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${type === t ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white text-stone-700'}`}
            >
              {t === 'tous' ? 'Tous' : TYPE_LABELS[t]}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={toggleGrouped}
            aria-pressed={grouped}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${grouped ? 'border-accent bg-accent-soft text-accent' : 'border-stone-300 bg-white'}`}
          >
            ▤ Séries
          </button>
          <button
            onClick={() => changeView(view === 'grille' ? 'liste' : 'grille')}
            className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm"
            aria-label={view === 'grille' ? 'Afficher en liste' : 'Afficher en grille'}
          >
            {view === 'grille' ? '☰ Liste' : '▦ Grille'}
          </button>
        </div>
        {grouped && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['toutes', 'en_cours', 'termine'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeriesFilter(s)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs ${seriesFilter === s ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                {s === 'toutes' ? 'Toutes les séries' : s === 'termine' ? 'Terminées' : 'En cours'}
              </button>
            ))}
          </div>
        )}
        {readings && readings.length > 0 && (
          <p className="text-xs text-stone-500">
            {grouped && `${shownGroups.length} série${shownGroups.length > 1 ? 's' : ''} · `}
            {filtered.length} lecture{filtered.length > 1 ? 's' : ''}
            {filtered.length !== readings.length && ` sur ${readings.length}`}
          </p>
        )}
      </div>

      <main className="px-4 pt-2">
        {readings && readings.length > 0 && !query && (
          <div className="mb-6">
            <StatsCard readings={readings} />
          </div>
        )}
        {readings && readings.length === 0 && (
          <div className="mt-16 text-center text-stone-500">
            <p className="text-5xl">📚</p>
            <p className="mt-4">Ta bibliothèque est vide.</p>
            <Link to="/ajouter" className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-white">
              Ajouter une première lecture
            </Link>
          </div>
        )}
        {readings && readings.length > 0 && nothingShown && (
          <p className="mt-12 text-center text-stone-500">Aucune lecture ne correspond à ta recherche.</p>
        )}

        {!grouped && view === 'liste' && renderReadings(filtered)}

        {!grouped && view === 'grille' && (
          <div className="space-y-6">
            {SHELF_ORDER.map((status) => {
              const onShelf = filtered.filter((r) => r.status === status)
              if (onShelf.length === 0) return null
              return (
                <section key={status}>
                  <h2 className="mb-2 flex items-baseline gap-2 font-display text-lg">
                    {SHELF_TITLES[status]}
                    <span className="font-sans text-xs text-stone-500 tabular-nums">{onShelf.length}</span>
                  </h2>
                  {renderReadings(onShelf)}
                </section>
              )
            })}
          </div>
        )}

        {grouped && (
          <div className="space-y-2">
            {shownGroups.map((group) => (
              <details key={group.key} className="rounded-2xl bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-2">
                  <div className="w-10 shrink-0">
                    <Cover url={group.readings[0].coverUrl} title={group.name} type={group.readings[0].type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{group.name}</p>
                    <p className="text-xs text-stone-500">
                      {group.readings.length} tome{group.readings.length > 1 ? 's' : ''} · {group.readCount} lu
                      {group.readCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <SeriesBadge group={group} />
                </summary>
                <div className="border-t border-stone-200 p-2">{renderReadings(group.readings)}</div>
              </details>
            ))}
            {shownStandalone.length > 0 && (
              <section className="pt-2">
                {shownGroups.length > 0 && <h2 className="mb-2 text-sm font-medium text-stone-500">Hors série</h2>}
                {renderReadings(shownStandalone)}
              </section>
            )}
          </div>
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
