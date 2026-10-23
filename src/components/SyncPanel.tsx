import { useState, type FormEvent } from 'react'
import { signIn, signOut, signUp, syncNow, useSyncStatus } from '../lib/sync'

function formatTime(iso?: string) {
  if (!iso) return 'jamais'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-accent'

/** Connexion au compte de synchronisation et état de la dernière synchro. */
export function SyncPanel() {
  const status = useSyncStatus()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string }>()

  if (!status.configured) {
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="font-semibold">Synchronisation</h2>
        <p className="mt-1 text-sm text-stone-600">Pas encore activée : tes lectures restent sur cet appareil.</p>
      </section>
    )
  }

  const submit = (mode: 'connexion' | 'creation') => async (event?: FormEvent) => {
    event?.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true)
    setMessage(undefined)
    if (mode === 'connexion') {
      const error = await signIn(email.trim(), password)
      if (error) setMessage({ kind: 'error', text: error })
    } else {
      const { error, info } = await signUp(email.trim(), password)
      if (error) setMessage({ kind: 'error', text: error })
      else if (info) setMessage({ kind: 'info', text: info })
    }
    setBusy(false)
  }

  if (status.state === 'deconnecte') {
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="font-semibold">Synchronisation</h2>
        <p className="mt-1 text-sm text-stone-600">
          Connecte-toi avec le même compte sur ton téléphone et ton ordinateur : tes lectures seront les mêmes partout.
        </p>
        <form onSubmit={submit('connexion')} className="mt-4 space-y-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            aria-label="E-mail"
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            aria-label="Mot de passe"
            className={inputClass}
          />
          {message && (
            <p className={`rounded-lg p-3 text-sm ${message.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}>
              {message.text}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={busy} className="flex-1 rounded-full bg-accent py-2 text-white disabled:opacity-50">
              Se connecter
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('creation')()}
              className="flex-1 rounded-full py-2 text-accent ring-1 ring-accent disabled:opacity-50"
            >
              Créer mon compte
            </button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <h2 className="font-semibold">Synchronisation</h2>
      <p className="mt-1 text-sm text-stone-600">
        Connecté avec <strong>{status.email}</strong>. Tes lectures se synchronisent toutes seules.
      </p>
      <p className="mt-3 text-sm" aria-live="polite">
        {status.state === 'en_cours' && <span className="text-stone-600">Synchronisation en cours…</span>}
        {status.state === 'pret' && <span className="text-emerald-700">✓ À jour (dernière synchro : {formatTime(status.lastSyncAt)})</span>}
        {status.state === 'erreur' && <span className="text-red-700">Synchro impossible : {status.error}</span>}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => void syncNow()}
          disabled={status.state === 'en_cours'}
          className="flex-1 rounded-full bg-accent py-2 text-white disabled:opacity-50"
        >
          Synchroniser maintenant
        </button>
        <button onClick={() => void signOut()} className="flex-1 rounded-full py-2 text-stone-600 ring-1 ring-stone-300">
          Se déconnecter
        </button>
      </div>
    </section>
  )
}
