/**
 * Projet Supabase utilisé pour synchroniser la bibliothèque entre appareils.
 * La clé « anon » est faite pour être publique : les règles de sécurité (RLS) de la base
 * limitent chaque compte à ses propres lectures. Laisser vide désactive la synchronisation.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
