-- Base de synchronisation de la Bibliothèque Virtuelle.
-- À coller une fois dans Supabase : SQL Editor → New query → Run.

create table if not exists public.readings (
  id uuid primary key,                       -- identifiant de la lecture, le même sur tous les appareils
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,                       -- la lecture complète (titre, auteurs, note, photo…)
  updated_at timestamptz not null,           -- date de la dernière modification sur un appareil
  deleted boolean not null default false,    -- vrai si la lecture a été supprimée
  synced_at timestamptz not null default now() -- date d'arrivée sur le serveur (fixée par le trigger)
);

create index if not exists readings_user_synced on public.readings (user_id, synced_at);

-- Chaque compte ne voit et ne modifie que ses propres lectures.
alter table public.readings enable row level security;

drop policy if exists "Mes lectures" on public.readings;
create policy "Mes lectures" on public.readings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.readings to authenticated;

-- synced_at est toujours l'heure du serveur, pour que chaque appareil sache ce qu'il n'a pas encore reçu.
create or replace function public.set_synced_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end
$$;

drop trigger if exists readings_synced_at on public.readings;
create trigger readings_synced_at
  before insert or update on public.readings
  for each row execute function public.set_synced_at();
