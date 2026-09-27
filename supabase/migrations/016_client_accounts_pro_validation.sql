-- 016_client_accounts_pro_validation.sql
-- Chantier "compte pro" — Phase 1 : étend client_accounts (fondation
-- existante, avec account_type déjà incluant agency/syndic/notary/landlord/
-- company/individual/other, account_memberships et is_internal()/
-- can_access_account()) pour porter l'inscription self-service des comptes
-- professionnels et leur validation manuelle par le staff. Pas de nouvelle
-- table de comptes.

alter table public.client_accounts
  add column if not exists validation_status text not null default 'validated',
  add column if not exists siret text,
  add column if not exists justificatif text,
  add column if not exists submitted_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id);

alter table public.client_accounts
  add constraint client_accounts_validation_status_valid_values
    check (validation_status in ('pending', 'validated', 'rejected'));

-- Les comptes déjà existants sont des comptes internes/déjà en usage, pas
-- des inscriptions en attente : le default ci-dessus ('validated') les a
-- déjà tous remplis au moment de l'ajout de colonne. On bascule maintenant
-- le default pour que toute nouvelle inscription (self-service, à venir en
-- Phase 2) parte bien en attente de validation.
alter table public.client_accounts
  alter column validation_status set default 'pending';
