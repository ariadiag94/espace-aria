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

-- account_memberships : un utilisateur authentifié peut se rattacher en tant
-- que 'owner' à un compte, mais seulement à SA PROPRE ligne (user_id =
-- auth.uid()) et seulement si ce compte n'a encore aucun membre — ce qui
-- garantit que ça ne peut être vrai que pour le compte qu'il vient tout juste
-- de créer lui-même, jamais pour un compte existant appartenant à quelqu'un
-- d'autre (qui a déjà au moins une ligne account_memberships).
create policy account_memberships_pro_self_insert on public.account_memberships
for insert to authenticated
with check (
  user_id = auth.uid()
  and membership_role = 'owner'
  and not exists (
    select 1 from public.account_memberships existing
    where existing.account_id = account_id
  )
);
