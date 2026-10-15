import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Header } from '../components/Header'
import { StarRating } from '../components/StarRating'
import { photoToCover } from '../lib/image'
import { db, deleteReading, STATUS_LABELS, TYPE_LABELS, updateReading, type ReadingStatus } from '../lib/db'

export function ReadingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const reading = useLiveQuery(() => db.readings.get(Number(id)), [id], null)

  if (reading === null) return null
  if (!reading) {
    return (
      <div className="min-h-dvh">
        <Header title="Introuvable" back="/" />
        <p className="p-6 text-center text-stone-500">Cette lecture n'existe plus.</p>
      </div>
    )
  }

  const remove = async () => {
    if (!confirm(`Supprimer « ${reading.title} » de ta bibliothèque ?`)) return
    await deleteReading(reading.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh pb-10">
      <Header
        title={reading.title}
        back="/"
        action={
          <Link to={`/lecture/${reading.id}/modifier`} className="rounded-full px-2 text-sm font-medium underline-offset-2 hover:underline">
            Modifier
          </Link>
        }
      />
      <main className="mx-auto max-w-xl p-4">
        <div className="flex gap-4">
          <div className="w-32 shrink-0">
            <Cover url={reading.coverUrl} title={reading.title} type={reading.type} />
            <label className="mt-2 block cursor-pointer rounded-full border border-accent py-1 text-center text-xs text-accent">
              📷 {reading.coverUrl ? 'Changer la photo' : 'Prendre en photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Prendre la couverture en photo"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    await updateReading(reading.id, { coverUrl: await photoToCover(file) })
                  } catch {
                    alert("Impossible de lire cette image. Essaie avec une autre photo.")
                  }
                }}
              />
            </label>
          </div>
          <div className="min-w-0 space-y-1">
            <span className="inline-block rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{TYPE_LABELS[reading.type]}</span>
            <h2 className="font-serif text-xl leading-tight font-semibold">{reading.title}</h2>
            {reading.series && (
              <p className="text-sm text-stone-600">
                {reading.series}
                {reading.volume !== undefined && ` · Tome ${reading.volume}`}
              </p>
            )}
            <dl className="space-y-1 pt-1 text-sm">
              <div>
                <dt className="inline text-stone-500">Auteur : </dt>
                <dd className="inline">{reading.authors.length ? reading.authors.join(', ') : 'inconnu'}</dd>
              </div>
              <div>
                <dt className="inline text-stone-500">Parution : </dt>
                <dd className="inline">{reading.publishedDate ?? 'inconnue'}</dd>
              </div>
              {reading.isbn && (
                <div>
                  <dt className="inline text-stone-500">ISBN : </dt>
                  <dd className="inline">{reading.isbn}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <section className="mt-6 space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div>
            <h3 className="mb-1 text-sm font-medium text-stone-500">Ma note</h3>
            <StarRating value={reading.rating} onChange={(rating) => updateReading(reading.id, { rating })} size="lg" />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium text-stone-500">Statut</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateReading(reading.id, { status: s })}
                  className={`rounded-full px-3 py-1 text-sm ${reading.status === s ? 'bg-accent text-white' : 'bg-stone-100 text-stone-700'}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {reading.comment && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-stone-500">Mon avis</h3>
              <p className="whitespace-pre-line">{reading.comment}</p>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 font-semibold">Résumé</h3>
          <p className="leading-relaxed whitespace-pre-line text-stone-700">{reading.summary ?? 'Pas de résumé pour le moment.'}</p>
        </section>

        <button onClick={remove} className="mt-10 w-full rounded-full py-2 text-sm text-red-700 ring-1 ring-red-200">
          Supprimer de ma bibliothèque
        </button>
      </main>
    </div>
  )
}
