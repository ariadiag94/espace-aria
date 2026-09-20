-- 014_leads_dependencies_not_null.sql
-- Les dépendances (au moins une case cochée) sont désormais un champ
-- obligatoire du formulaire de lead (app/assistant/page.tsx,
-- LeadCaptureForm). Confirmé le 2026-09-20 : l'unique ligne existante
-- dans public.leads a dependencies = ["cave"] - la contrainte peut être
-- appliquée sans backfill.

alter table public.leads
  alter column dependencies set not null;
