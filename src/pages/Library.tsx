import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Choice, FilterSection, FilterSheet } from '../components/FilterSheet'
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

const SERIES_FILTER_LABELS: Record<SeriesState | 'toutes', string> = {
  toutes: 'Toutes',
  en_cours: 'En cours',
  termine: 'Terminées',
}

/** Rappel d'un filtre actif, qu'un toucher suffit à retirer. */
function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-2 pl-3 text-sm text-accent"
      aria-label={`Retirer le filtre ${label}`}
    >
      {label}
      <span aria-hidden className="text-base leading-none">
        ×
      </span>
    </button>
  )
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem('vue', next)
    } catch {
      // Préférence non mémorisée, sans conséquence.
    }
  }

  const changeGrouped = (next: boolean) => {
    setGrouped(next)
    if (!next) setSeriesFilter('toutes')
    try {
      localStorage.setItem('groupe', next ? 'series' : 'aucun')
    } catch {
      // Préférence non mémorisée, sans conséquence.
    }
  }

  const resetFilters = () => {
    setType('tous')
    changeGrouped(false)
  }

  const activeCount = (type !== 'tous' ? 1 : 0) + (grouped ? 1 : 0) + (grouped && seriesFilter !== 'toutes' ? 1 : 0)

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${activeCount > 0 ? 'border-accent bg-white text-accent' : 'border-stone-300 bg-white text-stone-700'}`}
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h14M6 10h8M8.5 15h3" />
            </svg>
            Filtres
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-white tabular-nums">
                {activeCount}
              </span>
            )}
          </button>
          <span className="flex-1" />
          <div className="flex rounded-full border border-stone-300 bg-white p-0.5" role="group" aria-label="Affichage">
            {(['grille', 'liste'] as const).map((v) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                aria-pressed={view === v}
                aria-label={v === 'grille' ? 'Afficher en grille' : 'Afficher en liste'}
                className={`rounded-full px-2.5 py-0.5 text-sm ${view === v ? 'bg-accent text-white' : 'text-stone-600'}`}
              >
                {v === 'grille' ? '▦' : '☰'}
              </button>
            ))}
          </div>
        </div>
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {type !== 'tous' && <ActivePill label={TYPE_LABELS[type]} onRemove={() => setType('tous')} />}
            {grouped && <ActivePill label="Par série" onRemove={() => changeGrouped(false)} />}
            {grouped && seriesFilter !== 'toutes' && (
              <ActivePill label={`Séries ${SERIES_FILTER_LABELS[seriesFilter].toLowerCase()}`} onRemove={() => setSeriesFilter('toutes')} />
            )}
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

      <FilterSheet
        open={sheetOpen}
        onClose={closeSheet}
        onReset={resetFilters}
        confirmLabel={
          nothingShown
            ? 'Aucun résultat'
            : grouped
              ? `Voir ${shownGroups.length} série${shownGroups.length > 1 ? 's' : ''}`
              : `Voir ${filtered.length} lecture${filtered.length > 1 ? 's' : ''}`
        }
      >
        <FilterSection title="Type">
          {(['tous', 'livre', 'bd', 'manga'] as const).map((t) => (
            <Choice key={t} selected={type === t} onClick={() => setType(t)}>
              {t === 'tous' ? 'Tous' : TYPE_LABELS[t]}
            </Choice>
          ))}
        </FilterSection>
        <FilterSection title="Rangement">
          <Choice selected={!grouped} onClick={() => changeGrouped(false)}>
            Par statut
          </Choice>
          <Choice selected={grouped} onClick={() => changeGrouped(true)}>
            Par série
          </Choice>
        </FilterSection>
        {grouped && (
          <FilterSection title="Séries">
            {(['toutes', 'en_cours', 'termine'] as const).map((s) => (
              <Choice key={s} selected={seriesFilter === s} onClick={() => setSeriesFilter(s)}>
                {SERIES_FILTER_LABELS[s]}
              </Choice>
            ))}
          </FilterSection>
        )}
      </FilterSheet>

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
