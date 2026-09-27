-- 018_account_memberships_self_select.sql
-- Chantier "compte pro", Phase 2 (suite) : /inscription-pro/finalisation a
-- besoin de vérifier si l'utilisateur qui vient de confirmer son email a
-- déjà une ligne account_memberships (rechargement de la page après une
-- création déjà réussie, ou lien de confirmation cliqué deux fois) — sans
-- droit SELECT, cette vérification ne verrait jamais aucune ligne (voir
-- 017_client_accounts_pro_self_insert_rls.sql) et créerait une demande en
-- double à chaque rechargement.
--
-- Policy strictement scopée à ses propres lignes (user_id = auth.uid()) :
-- n'expose rien sur les comptes des autres utilisateurs. N'enlève rien à
-- l'existant (is_internal() garde un accès total comme avant).
create policy account_memberships_self_select on public.account_memberships
for select to authenticated
using (user_id = auth.uid());
