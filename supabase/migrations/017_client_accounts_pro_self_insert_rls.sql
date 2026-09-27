-- 017_client_accounts_pro_self_insert_rls.sql
-- Chantier "compte pro", Phase 2 (suite) : l'inscription self-service
-- (app/inscription-pro/page.tsx) échoue aujourd'hui avec "new row violates
-- row-level security policy for table client_accounts" — un utilisateur
-- fraîchement inscrit (authenticated, mais pas encore is_internal()) n'a
-- aucun moyen de créer sa propre fiche. Ajoute deux policies INSERT
-- supplémentaires, sans toucher aux policies existantes (is_internal()
-- garde un accès total comme avant sur les deux tables).

-- client_accounts : un utilisateur authentifié peut créer sa propre fiche
-- uniquement à l'état "pending" — empêche de s'auto-valider (validation_status
-- ne peut jamais être 'validated'/'rejected' via cette policy) et empêche de
-- fabriquer une trace de validation (validated_at/validated_by doivent rester
-- vides à la création).
create policy client_accounts_pro_self_insert on public.client_accounts
for insert to authenticated
with check (
  validation_status = 'pending'
  and validated_at is null
  and validated_by is null
);

-- Fonctions "security definer" utilisées ci-dessous : une policy INSERT sur
-- account_memberships ne peut pas se contenter d'un simple "exists (select 1
-- from ...)" sur client_accounts ou account_memberships, car ce sous-select
-- reste soumis à la RLS du rôle appelant. Un utilisateur pro fraîchement
-- inscrit n'a aucun droit SELECT sur ces tables (seul is_internal() les a) :
-- une telle sous-requête ne verrait jamais aucune ligne, quelle que soit la
-- réalité en base, ce qui rendrait les deux conditions ci-dessous
-- inopérantes (toujours vraies du point de vue de l'utilisateur, qu'un
-- compte soit déjà pourvu d'un membre ou non). Ces fonctions contournent
-- volontairement la RLS (comme is_internal()/can_access_account()) pour
-- vérifier l'état réel de la base, tout en ne renvoyant qu'un booléen —
-- aucune donnée du compte n'est exposée par leur intermédiaire.
create or replace function public.client_account_is_self_signup_pending(target_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.client_accounts
    where id = target_account_id
      and validation_status = 'pending'
  );
$$;

create or replace function public.account_has_no_members(target_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.account_memberships
    where account_id = target_account_id
  );
$$;

revoke all on function public.client_account_is_self_signup_pending(uuid) from public;
revoke all on function public.account_has_no_members(uuid) from public;
grant execute on function public.client_account_is_self_signup_pending(uuid) to authenticated;
grant execute on function public.account_has_no_members(uuid) to authenticated;

-- account_memberships : un utilisateur authentifié peut se rattacher en tant
-- que 'owner' à un compte, mais seulement à SA PROPRE ligne (user_id =
-- auth.uid()), seulement si le compte ciblé est encore à l'état 'pending'
-- (donc pas un compte déjà existant/validé — sans cette condition, un compte
-- validé n'ayant jamais eu de ligne account_memberships aurait pu être
-- détourné par n'importe quel utilisateur devinant son id), et seulement si
-- ce compte n'a encore aucun membre. La combinaison des trois garantit que
-- ça ne peut être vrai que pour le compte "pending" que l'utilisateur vient
-- tout juste de créer lui-même via la policy ci-dessus, jamais pour un
-- compte tiers.
create policy account_memberships_pro_self_insert on public.account_memberships
for insert to authenticated
with check (
  user_id = auth.uid()
  and membership_role = 'owner'
  and public.client_account_is_self_signup_pending(account_id)
  and public.account_has_no_members(account_id)
);
