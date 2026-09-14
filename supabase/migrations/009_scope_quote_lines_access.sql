-- 009_scope_quote_lines_access.sql
-- Recale les policies RLS de quote_lines (créées en 007, ouvertes à tout
-- authentifié) sur le système de comptes déjà en place pour public.dossiers
-- (public.client_accounts, public.account_memberships,
-- public.is_internal(), public.can_access_account()) — pas de nouveau
-- système à créer, seulement le même modèle réutilisé.
--
-- Reproduit exactement le pattern de public.dossiers :
--   dossiers_read           : select using can_access_account(account_id)
--   dossiers_internal_write : all    using is_internal()

drop policy if exists quote_lines_authenticated_select on public.quote_lines;
drop policy if exists quote_lines_authenticated_insert on public.quote_lines;
drop policy if exists quote_lines_authenticated_update on public.quote_lines;
drop policy if exists quote_lines_authenticated_delete on public.quote_lines;

drop policy if exists quote_lines_read on public.quote_lines;
create policy quote_lines_read on public.quote_lines
for select to authenticated using (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.can_access_account(d.account_id)
  )
);

drop policy if exists quote_lines_internal_write on public.quote_lines;
create policy quote_lines_internal_write on public.quote_lines
for all to authenticated
using (public.is_internal())
with check (public.is_internal());
