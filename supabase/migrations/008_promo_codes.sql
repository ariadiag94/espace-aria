-- 008_promo_codes.sql
-- Codes promo applicables aux devis, réservés à l'usage professionnel.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists promo_codes_code_idx on public.promo_codes (lower(code));

alter table public.promo_codes enable row level security;

-- Lecture : tout utilisateur authentifié peut vérifier un code (nécessaire
-- pour l'appliquer depuis le formulaire de devis), mais uniquement s'il est
-- actif et non expiré — pas de liste complète des codes exposée inutilement.
drop policy if exists promo_codes_authenticated_select on public.promo_codes;
create policy promo_codes_authenticated_select on public.promo_codes
for select to authenticated using (
  active = true and (expires_at is null or expires_at > now())
);

-- Écriture (créer/modifier/désactiver un code) : réservée au staff ARIA.
-- Repose sur public.is_internal(), déjà en place (même fonction que la
-- policy dossiers_internal_write sur public.dossiers).
drop policy if exists promo_codes_staff_write on public.promo_codes;
create policy promo_codes_staff_write on public.promo_codes
for all to authenticated
using (public.is_internal())
with check (public.is_internal());

-- Un premier code de démonstration, à remplacer par vos vrais codes.
insert into public.promo_codes (code, label, discount_type, discount_value)
values ('PRO10', 'Tarif professionnel -10%', 'percent', 10)
on conflict (code) do nothing;
