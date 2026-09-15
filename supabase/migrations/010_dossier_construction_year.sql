-- 010_dossier_construction_year.sql
-- Année de construction du bien, saisie optionnelle sur le dossier (même
-- table que property_type/surface/rooms, déjà présents sur public.dossiers
-- hors migrations). Sert à déclencher une alerte informative côté formulaire
-- (plomb/CREP avant 1949, amiante avant 1997) — aucune obligation ni
-- pré-cochage automatique des diagnostics.

alter table public.dossiers
  add column if not exists construction_year integer
  check (construction_year is null or (construction_year >= 1000 and construction_year <= extract(year from now())::int));
