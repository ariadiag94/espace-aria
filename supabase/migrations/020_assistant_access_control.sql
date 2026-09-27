-- 020_assistant_access_control.sql
-- Chantier "compte pro", Phase 4 : ferme /assistant au grand public. Accès
-- réservé à (a) un membre interne (profiles.role in ('admin', 'staff') —
-- distinct de is_internal(), utilisé ici tel que demandé), ou (b) un compte
-- pro validé (client_accounts.validation_status = 'validated', via
-- account_memberships pour l'utilisateur connecté).
--
-- Deux fonctions security definer (même principe que is_admin()/
-- is_internal(), déjà utilisées dans ce projet) : leurs requêtes internes
-- sur profiles/client_accounts/account_memberships doivent lire l'état réel
-- de ces tables, indépendamment de la RLS définie sur elles pour le rôle
-- appelant (même raisonnement que dans
-- 017_client_accounts_pro_self_insert_rls.sql).

create or replace function public.has_assistant_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
    or exists (
      select 1 from public.account_memberships m
      join public.client_accounts a on a.id = m.account_id
      where m.user_id = auth.uid() and a.validation_status = 'validated'
    );
$$;

revoke all on function public.has_assistant_access() from public;
grant execute on function public.has_assistant_access() to authenticated;

-- Utilisée uniquement pour adapter le message affiché à un utilisateur
-- connecté mais sans accès (pending/rejected) — ne renvoie que le statut,
-- jamais aucune autre donnée du compte.
create or replace function public.my_client_account_validation_status()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select a.validation_status
  from public.account_memberships m
  join public.client_accounts a on a.id = m.account_id
  where m.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_client_account_validation_status() from public;
grant execute on function public.my_client_account_validation_status() to authenticated;
