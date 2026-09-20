-- 012_leads_extra_fields.sql
-- Complète le formulaire de capture de la demande client (/assistant) :
-- adresse obligatoire, étage, dépendances (cave/garage/parking/autre).

alter table public.leads
  add column if not exists floor text,
  add column if not exists dependencies text[];

alter table public.leads
  add constraint leads_dependencies_valid_values
    check (dependencies is null or dependencies <@ array['cave', 'garage', 'parking', 'autre']::text[]);

-- Confirmé le 2026-09-20 : une seule ligne existante dans leads, avec
-- property_address renseigné — la contrainte peut être appliquée sans
-- backfill.
alter table public.leads
  alter column property_address set not null;
