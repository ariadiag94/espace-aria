-- 021_assistant_payer_discount.sql
-- Chantier "compte pro", Phase 5 : un compte pro validé choisit, pour
-- chaque demande créée via /assistant, qui règle — lui-même (agence/
-- syndic/etc., remise pro de 10 %) ou le client final propriétaire du bien
-- (tarif plein). Ajoute :
--
-- 1. my_validated_pro_account() : renvoie l'identité du compte pro validé
--    de l'utilisateur connecté (id + nom de société), ou aucune ligne s'il
--    n'en a pas (staff/admin sans compte pro, ou pro pas encore validé).
--    Security definer pour la même raison que les fonctions similaires
--    (017/019/020) : sa requête interne doit lire l'état réel de
--    client_accounts/account_memberships, indépendamment de la RLS définie
--    sur elles pour le rôle appelant.
--
-- 2. payer_type (text, nullable, check 'pro'/'client_final') sur public.leads
--    (seule table sur laquelle /assistant écrit réellement) et sur
--    public.quotes (le devis établi ensuite par le staff, pour que le choix
--    reste visible/exploitable en aval — cohérent avec la demande de garder
--    ce champ visible "sur le devis"). Pas d'ajout sur dossiers ni
--    quote_items : le choix concerne une demande précise (un devis), pas le
--    dossier dans son ensemble (qui peut porter plusieurs devis), ni une
--    ligne de prestation individuelle.

create or replace function public.my_validated_pro_account()
returns table (account_id uuid, company_name text)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.company_name
  from public.account_memberships m
  join public.client_accounts a on a.id = m.account_id
  where m.user_id = auth.uid() and a.validation_status = 'validated'
  limit 1;
$$;

revoke all on function public.my_validated_pro_account() from public;
grant execute on function public.my_validated_pro_account() to authenticated;

alter table public.leads
  add column if not exists payer_type text;

alter table public.leads
  add constraint leads_payer_type_valid_values
    check (payer_type is null or payer_type in ('pro', 'client_final'));

alter table public.quotes
  add column if not exists payer_type text;

alter table public.quotes
  add constraint quotes_payer_type_valid_values
    check (payer_type is null or payer_type in ('pro', 'client_final'));
