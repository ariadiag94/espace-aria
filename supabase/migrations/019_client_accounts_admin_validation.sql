-- 019_client_accounts_admin_validation.sql
-- Chantier "compte pro", Phase 3 : validation des inscriptions pro par
-- l'administrateur (profiles.role = 'admin', un seul compte concerné
-- aujourd'hui : ermansola@gmail.com — distinct de is_internal(), qui couvre
-- tout le staff ARIA au sens large). Ajoute une fonction is_admin() (même
-- principe que is_internal(), déjà utilisée dans ce projet) et une policy
-- UPDATE sur client_accounts strictement scopée à ce rôle.
--
-- is_admin() est "security definer" pour la même raison que les fonctions
-- de 017_client_accounts_pro_self_insert_rls.sql : sa requête interne sur
-- public.profiles doit lire l'état réel de la table, indépendamment de la
-- RLS éventuellement définie sur profiles pour le rôle appelant.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Permet à l'administrateur de valider/refuser une inscription pro (mettre à
-- jour validation_status/validated_at/validated_by). N'enlève rien à
-- l'existant : si client_accounts a déjà une policy UPDATE plus large basée
-- sur is_internal(), elle continue de s'appliquer en plus de celle-ci (les
-- policies RLS permissives s'additionnent, elles ne se restreignent pas
-- entre elles) — cette policy garantit qu'un admin PEUT valider, elle ne
-- garantit pas à elle seule qu'un membre du staff non-admin NE LE PEUT PAS
-- si une policy plus large existe déjà par ailleurs.
create policy client_accounts_admin_validate on public.client_accounts
for update to authenticated
using (public.is_admin())
with check (public.is_admin());
