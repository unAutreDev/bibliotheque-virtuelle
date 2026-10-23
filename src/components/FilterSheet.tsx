import { useEffect, type ReactNode } from 'react'

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  onReset: () => void
  /** Texte du bouton principal, par exemple « Voir 12 lectures ». */
  confirmLabel: string
  children: ReactNode
}

/** Feuille qui monte du bas de l'écran pour regrouper les filtres. */
export function FilterSheet({ open, onClose, onReset, confirmLabel, children }: FilterSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button aria-label="Fermer les filtres" onClick={onClose} className="sheet-backdrop absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="sheet-panel relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="filter-sheet-title" className="font-display text-xl">
            Filtres
          </h2>
          <button onClick={onReset} className="text-sm text-accent underline-offset-2 hover:underline">
            Réinitialiser
          </button>
        </div>
        <div className="space-y-5">{children}</div>
        <button onClick={onClose} className="mt-6 w-full rounded-full bg-accent py-3 font-medium text-white active:scale-[0.98]">
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

interface FilterSectionProps {
  title: string
  children: ReactNode
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

interface ChoiceProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
}

/** Pastille sélectionnable ; les pastilles passent à la ligne au lieu de défiler. */
export function Choice({ selected, onClick, children }: ChoiceProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-1.5 text-sm ${selected ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white text-stone-700'}`}
    >
      {children}
    </button>
  )
}
