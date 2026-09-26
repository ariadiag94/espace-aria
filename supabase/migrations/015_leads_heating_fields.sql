-- 015_leads_heating_fields.sql
-- Complément chauffage collectif, collecté directement dans le formulaire de
-- lead (LeadCaptureForm) : le wizard /assistant lui-même ne pose plus cette
-- question (retirée le 2026-09-26, remplacée par la question gaz — voir
-- 9f3caa1). Champs 100 % optionnels ("si connu"), collectés en amont du
-- rendez-vous pour préparer l'intervention technique, sans impact sur le prix.

alter table public.leads
  add column if not exists heating_type text,
  add column if not exists heating_system_type text,
  add column if not exists heating_charges text,
  add column if not exists dtg_audit_available text;

alter table public.leads
  add constraint leads_heating_type_valid_values
    check (heating_type is null or heating_type in ('collectif', 'individuel'));

alter table public.leads
  add constraint leads_dtg_audit_available_valid_values
    check (dtg_audit_available is null or dtg_audit_available in ('oui', 'non', 'inconnu'));
