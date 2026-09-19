-- 011_leads.sql
-- Capture des demandes clients en fin de parcours public /assistant (écran
-- "Votre estimation"). Décision assumée de revenir sur la contrainte
-- d'origine de /assistant ("sans écriture en base, sans collecte de
-- contact") : voir la demande du 2026-09-20 pour le contexte.
--
-- Table distincte de public.dossiers (usage interne post-connexion) : un
-- lead public/anonyme n'a ni account_id ni les mêmes garanties de
-- complétude, et ne doit jamais être visible/modifiable par le rôle anon
-- une fois inséré.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  property_address text,
  property_type text not null check (property_type in ('apartment', 'house')),
  purpose text not null check (purpose in ('sale', 'rental', 'alaCarte')),
  estimated_price numeric,
  diagnostics_summary jsonb not null,
  status text not null default 'new',
  source text not null default 'assistant'
);

alter table public.leads enable row level security;

-- Insertion publique : n'importe quel visiteur (anon) peut créer un lead.
-- Inclut aussi 'authenticated' pour couvrir le cas d'un membre du staff déjà
-- connecté qui utiliserait /assistant dans le même navigateur (le client
-- Supabase partagé de lib/supabase.ts persiste la session) : sans ce cas,
-- l'insert échouerait silencieusement pour lui alors que /assistant reste
-- une page publique censée fonctionner pour tout visiteur.
create policy leads_public_insert on public.leads
for insert to anon, authenticated with check (true);

-- Lecture/modification réservées au staff, même pattern que
-- quote_lines_internal_write (009) et promo_codes (008) : public.is_internal().
create policy leads_staff_all on public.leads
for all to authenticated using (public.is_internal()) with check (public.is_internal());
