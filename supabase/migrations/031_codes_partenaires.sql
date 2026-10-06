-- Codes partenaires : un code par agence, donné par l'agence à ses clients.
-- La remise va au client (jamais à l'agent) ; le code permet de savoir quelle
-- agence a recommandé ARIA.
alter table public.promo_codes
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;
alter table public.quotes
  add column if not exists promo_code text;

-- Les codes et leurs taux ne sont lisibles que par l'équipe ARIA (le taux ne
-- doit jamais être visible côté agences/clients).
drop policy if exists promo_codes_authenticated_select on public.promo_codes;
drop policy if exists promo_codes_internal_select on public.promo_codes;
create policy promo_codes_internal_select on public.promo_codes
  for select to authenticated using (public.is_internal());

-- Ancien code générique à 10 %, remplacé par les codes partenaires à 5 %.
update public.promo_codes set active = false where code = 'PRO10';
