import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Header } from '../components/Header'
import { OnlineSearch } from '../components/OnlineSearch'
import { StarRating } from '../components/StarRating'
import {
  addReading,
  db,
  STATUS_LABELS,
  TYPE_LABELS,
  updateReading,
  type Reading,
  type ReadingDraft,
  type ReadingStatus,
  type ReadingType,
} from '../lib/db'
import { findCover, resultToDraft, type BookResult } from '../lib/bookSearch'
import { isPhoto, photoToCover } from '../lib/image'

const EMPTY: ReadingDraft = { type: 'livre', title: '', authors: [], status: 'a_lire' }

export function ReadingFormPage() {
  const { id } = useParams()
  const existing = useLiveQuery(() => (id ? db.readings.get(Number(id)) : undefined), [id])

  if (id && !existing) return null
  return <ReadingForm key={existing?.id ?? 'new'} existing={existing} />
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-600">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-accent'

function ReadingForm({ existing }: { existing?: Reading }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ReadingDraft>(existing ?? EMPTY)
  const [authorsText, setAuthorsText] = useState(existing?.authors.join(', ') ?? '')

  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [coverSearch, setCoverSearch] = useState<'idle' | 'loading' | 'notFound'>('idle')

  const set = <K extends keyof ReadingDraft>(key: K, value: ReadingDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const text = (value: string) => value.trim() || undefined

  const pickResult = async (result: BookResult) => {
    const fields = await resultToDraft(result)
    setDraft((d) => ({ ...d, ...fields }))
    if (fields.authors) setAuthorsText(fields.authors.join(', '))
    setCoverSearch('idle')
  }

  const searchCover = async () => {
    setCoverSearch('loading')
    const authors = authorsText.split(',').map((a) => a.trim()).filter(Boolean)
    const coverUrl = await findCover({ ...draft, authors, isbn: text(draft.isbn ?? '') }).catch(() => undefined)
    if (coverUrl) set('coverUrl', coverUrl)
    setCoverSearch(coverUrl ? 'idle' : 'notFound')
  }

  const takePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoState('loading')
    try {
      set('coverUrl', await photoToCover(file))
      setCoverSearch('idle')
      setPhotoState('idle')
    } catch {
      setPhotoState('error')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clean: ReadingDraft = {
      ...draft,
      title: draft.title.trim(),
      series: text(draft.series ?? ''),
      authors: authorsText.split(',').map((a) => a.trim()).filter(Boolean),
      publishedDate: text(draft.publishedDate ?? ''),
      summary: text(draft.summary ?? ''),
      isbn: text(draft.isbn ?? ''),
      coverUrl: text(draft.coverUrl ?? ''),
      comment: text(draft.comment ?? ''),
    }
    if (existing) {
      await updateReading(existing.id, clean)
      navigate(`/lecture/${existing.id}`, { replace: true })
    } else {
      const newId = await addReading(clean)
      navigate(`/lecture/${newId}`, { replace: true })
    }
  }

  return (
    <div className="min-h-dvh pb-10">
      <Header title={existing ? 'Modifier' : 'Ajouter une lecture'} back={existing ? `/lecture/${existing.id}` : '/'} />
      {/* Hors du formulaire principal : un <form> imbriqué n'est pas valide en HTML. */}
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <div className="flex gap-2">
          {(Object.keys(TYPE_LABELS) as ReadingType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`flex-1 rounded-lg border py-2 ${draft.type === t ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white'}`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {!existing && <OnlineSearch type={draft.type} onPick={pickResult} />}
      </div>
      <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 p-4">
        <Field label="Titre *">
          <input required value={draft.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Série">
              <input value={draft.series ?? ''} onChange={(e) => set('series', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Tome">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.volume ?? ''}
                onChange={(e) => set('volume', e.target.value ? Number(e.target.value) : undefined)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <Field label="Auteur(s), séparés par des virgules">
          <input value={authorsText} onChange={(e) => setAuthorsText(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Date de parution">
          <input
            value={draft.publishedDate ?? ''}
            onChange={(e) => set('publishedDate', e.target.value)}
            placeholder="ex. 2003 ou 12/03/2003"
            className={inputClass}
          />
        </Field>

        <Field label="Résumé">
          <textarea rows={4} value={draft.summary ?? ''} onChange={(e) => set('summary', e.target.value)} className={inputClass} />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-stone-600">Couverture</span>
          <div className="flex items-start gap-3">
            <div className="w-24 shrink-0">
              <Cover url={text(draft.coverUrl ?? '')} title={draft.title || 'Sans titre'} type={draft.type} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-3 py-2 text-sm font-medium text-white active:scale-[0.98]">
                <span aria-hidden>📷</span>
                {photoState === 'loading' ? 'Traitement…' : 'Prendre en photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={takePhoto}
                  aria-label="Prendre la couverture en photo"
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={searchCover}
                disabled={!draft.title.trim() || coverSearch === 'loading'}
                className="w-full rounded-full border border-accent px-3 py-2 text-sm text-accent disabled:opacity-40"
              >
                {coverSearch === 'loading' ? 'Recherche…' : 'Chercher en ligne'}
              </button>
              {draft.coverUrl && (
                <button type="button" onClick={() => set('coverUrl', undefined)} className="w-full text-xs text-stone-500 underline">
                  Retirer la couverture
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {photoState === 'error'
              ? "Impossible de lire cette image. Essaie avec une autre photo."
              : coverSearch === 'notFound'
                ? 'Aucune couverture trouvée en ligne. Tu peux la prendre en photo.'
                : isPhoto(draft.coverUrl)
                  ? 'Photo enregistrée sur ton appareil.'
                  : 'Sans couverture, une image par défaut est affichée.'}
          </p>
          {!isPhoto(draft.coverUrl) && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-stone-500">Coller un lien d'image</summary>
              <input
                type="url"
                value={draft.coverUrl ?? ''}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://…"
                aria-label="Lien de la couverture"
                className={`${inputClass} mt-2`}
              />
            </details>
          )}
        </div>

        <Field label="ISBN">
          <input inputMode="numeric" value={draft.isbn ?? ''} onChange={(e) => set('isbn', e.target.value)} className={inputClass} />
        </Field>

        <Field label="Statut">
          <select value={draft.status} onChange={(e) => set('status', e.target.value as ReadingStatus)} className={inputClass}>
            {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-stone-600">Ma note</span>
          <StarRating value={draft.rating} onChange={(v) => set('rating', v)} size="lg" />
        </div>

        <Field label="Mon avis">
          <textarea rows={3} value={draft.comment ?? ''} onChange={(e) => set('comment', e.target.value)} className={inputClass} />
        </Field>

        <button type="submit" className="w-full rounded-full bg-accent py-3 font-semibold text-white active:scale-[0.99]">
          {existing ? 'Enregistrer' : 'Ajouter à ma bibliothèque'}
        </button>
      </form>
    </div>
  )
}
