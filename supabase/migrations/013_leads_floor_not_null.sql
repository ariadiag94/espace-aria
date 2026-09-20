-- 013_leads_floor_not_null.sql
-- L'étage est désormais un champ obligatoire du formulaire de lead
-- (app/assistant/page.tsx, LeadCaptureForm). Confirmé le 2026-09-20 :
-- table public.leads vidée des données de test (0 ligne) - la contrainte
-- peut être appliquée sans backfill.

alter table public.leads
  alter column floor set not null;
