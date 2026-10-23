/**
 * Projet Supabase utilisé pour synchroniser la bibliothèque entre appareils.
 * La clé publique (« publishable » / « anon ») est faite pour être publique : les règles de sécurité (RLS) de la base
 * limitent chaque compte à ses propres lectures. Une valeur vide désactive la synchronisation.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://wahqphvimgkrwqybdcej.supabase.co'
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_tkT6MKAbhw8-He3yua1wiQ_RFFtt7CI'
