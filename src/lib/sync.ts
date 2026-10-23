import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config'
import { db, setLocalChangeListener, type Reading } from './db'

/** Ligne de la table `readings` côté serveur (voir docs/supabase.sql). */
interface RemoteRow {
  id: string
  data: Omit<Reading, 'id' | 'uid'>
  updated_at: string
  deleted: boolean
  synced_at?: string
}

export interface SyncStatus {
  configured: boolean
  email?: string
  state: 'deconnecte' | 'pret' | 'en_cours' | 'erreur'
  lastSyncAt?: string
  error?: string
}

const client: SupabaseClient | undefined =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : undefined

let session: Session | null = null
let status: SyncStatus = { configured: Boolean(client), state: 'deconnecte' }
const listeners = new Set<() => void>()

function setStatus(changes: Partial<SyncStatus>) {
  status = { ...status, ...changes }
  listeners.forEach((listener) => listener())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
  )
}

// --- Mémorisation de l'avancement, par compte -------------------------------

function metaKey(name: string) {
  return `sync:${session?.user.id}:${name}`
}
function readMeta(name: string): string | undefined {
  try {
    return localStorage.getItem(metaKey(name)) ?? undefined
  } catch {
    return undefined
  }
}
function writeMeta(name: string, value: string) {
  try {
    localStorage.setItem(metaKey(name), value)
  } catch {
    // Sans stockage, la prochaine synchro repartira de zéro : plus lent, mais correct.
  }
}

// --- Synchronisation --------------------------------------------------------

const PAGE = 200
const PUSH_BATCH = 25

/** Récupère ce qui a changé sur le serveur depuis la dernière fois et l'applique localement. */
async function pull(supabase: SupabaseClient): Promise<Map<string, string>> {
  const received = new Map<string, string>()
  let since = readMeta('lastSyncedAt') ?? '1970-01-01T00:00:00Z'
  for (;;) {
    const { data, error } = await supabase
      .from('readings')
      .select('id, data, updated_at, deleted, synced_at')
      .gt('synced_at', since)
      .order('synced_at')
      .limit(PAGE)
    if (error) throw error
    const rows = (data ?? []) as RemoteRow[]

    await db.transaction('rw', db.readings, db.deletions, async () => {
      for (const row of rows) {
        received.set(row.id, row.updated_at)
        const local = await db.readings.where('uid').equals(row.id).first()
        if (row.deleted) {
          if (local && local.updatedAt <= row.updated_at) await db.readings.delete(local.id)
          continue
        }
        if (local) {
          if (row.updated_at > local.updatedAt) await db.readings.put({ ...row.data, id: local.id, uid: row.id, updatedAt: row.updated_at })
          continue
        }
        // Supprimée ici après la dernière modification ailleurs : la suppression l'emporte.
        const deletion = await db.deletions.get(row.id)
        if (deletion && deletion.deletedAt >= row.updated_at) continue
        if (deletion) await db.deletions.delete(row.id)
        await db.readings.add({ ...row.data, uid: row.id, updatedAt: row.updated_at } as Reading)
      }
    })

    if (rows.length > 0) {
      since = rows[rows.length - 1].synced_at!
      writeMeta('lastSyncedAt', since)
    }
    if (rows.length < PAGE) return received
  }
}

/** Envoie les lectures modifiées et les suppressions faites sur cet appareil. */
async function push(supabase: SupabaseClient, startedAt: string, received: Map<string, string>) {
  const lastPushed = readMeta('lastPushedAt') ?? ''
  // Ce qui vient d'arriver du serveur n'a pas besoin d'y repartir.
  const changed = (await db.readings.where('updatedAt').above(lastPushed).toArray()).filter(
    (reading) => received.get(reading.uid) !== reading.updatedAt,
  )
  const deletions = await db.deletions.toArray()

  const rows: RemoteRow[] = [
    ...changed.map(({ id: _id, uid, ...data }) => ({ id: uid, data, updated_at: data.updatedAt, deleted: false })),
    ...deletions.map((d) => ({ id: d.uid, data: {} as RemoteRow['data'], updated_at: d.deletedAt, deleted: true })),
  ]
  for (let i = 0; i < rows.length; i += PUSH_BATCH) {
    const { error } = await supabase.from('readings').upsert(rows.slice(i, i + PUSH_BATCH))
    if (error) throw error
  }
  if (deletions.length) await db.deletions.bulkDelete(deletions.map((d) => d.uid))
  writeMeta('lastPushedAt', startedAt)
}

let running: Promise<void> | undefined
let again = false

/** Synchronise maintenant. Si une synchro tourne déjà, une autre est faite juste après. */
export function syncNow(): Promise<void> {
  if (!client || !session) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  const supabase = client
  running = (async () => {
    do {
      again = false
      const startedAt = new Date().toISOString()
      setStatus({ state: 'en_cours', error: undefined })
      try {
        const received = await pull(supabase)
        await push(supabase, startedAt, received)
        setStatus({ state: 'pret', lastSyncAt: new Date().toISOString() })
      } catch (error) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine
        setStatus({
          state: 'erreur',
          error: offline ? 'Pas de connexion : la synchro reprendra toute seule.' : error instanceof Error ? error.message : String(error),
        })
        again = false
      }
    } while (again)
  })().finally(() => {
    running = undefined
  })
  return running
}

// --- Compte -----------------------------------------------------------------

function frenchAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou mot de passe incorrect.'
  if (/email not confirmed/i.test(message)) return "Confirme d'abord ton adresse avec le lien reçu par e-mail."
  if (/already registered/i.test(message)) return 'Un compte existe déjà avec cet e-mail : connecte-toi.'
  if (/at least 6 characters/i.test(message)) return 'Le mot de passe doit faire au moins 6 caractères.'
  if (/fetch/i.test(message)) return 'Impossible de joindre le serveur. Vérifie ta connexion.'
  return message
}

export async function signIn(email: string, password: string): Promise<string | undefined> {
  if (!client) return 'Synchronisation non configurée.'
  const { error } = await client.auth.signInWithPassword({ email, password })
  return error ? frenchAuthError(error.message) : undefined
}

/** Crée le compte. Renvoie un message à afficher (erreur, ou confirmation d'e-mail à faire). */
export async function signUp(email: string, password: string): Promise<{ error?: string; info?: string }> {
  if (!client) return { error: 'Synchronisation non configurée.' }
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) return { error: frenchAuthError(error.message) }
  if (!data.session) return { info: 'Compte créé. Clique sur le lien reçu par e-mail, puis connecte-toi ici.' }
  return {}
}

export async function signOut() {
  await client?.auth.signOut()
}

// --- Démarrage ----------------------------------------------------------------

let debounce: ReturnType<typeof setTimeout> | undefined

export function startSync() {
  if (!client) return
  client.auth.onAuthStateChange((_event, newSession) => {
    const userChanged = newSession?.user.id !== session?.user.id
    session = newSession
    if (!newSession) setStatus({ email: undefined, state: 'deconnecte', lastSyncAt: undefined })
    else if (userChanged) setStatus({ email: newSession.user.email, state: 'en_cours', error: undefined })
    // Différé : supabase-js déconseille d'appeler l'API depuis ce rappel.
    if (newSession && userChanged) setTimeout(() => void syncNow(), 0)
  })

  // Après chaque modification locale, on attend un peu pour regrouper les changements.
  setLocalChangeListener(() => {
    clearTimeout(debounce)
    debounce = setTimeout(() => void syncNow(), 1500)
  })
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
}
