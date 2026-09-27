-- 022_mon_espace_client_portal.sql
-- Chantier "compte pro", Phases 6-9 — V1 simplifiée du portail client
-- (/mon-espace). Conçue pour ne pas bloquer les extensions prévues plus
-- tard (signature électronique réelle via la table signatures déjà
-- existante, factures visibles côté client, notifications in-app) : voir
-- le commentaire sur le trigger plus bas.

-- Utilisée uniquement par /login pour choisir la destination par défaut
-- après connexion (dashboard staff vs /mon-espace) — security definer pour
-- lire l'état réel de profiles indépendamment de sa RLS, même raisonnement
-- que is_admin()/is_internal() déjà en place. Distincte de has_assistant_access()
-- (qui autorise aussi un compte pro validé, sans que ce soit "être staff").
create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

revoke all on function public.is_staff_or_admin() from public;
grant execute on function public.is_staff_or_admin() to authenticated;

-- Décision du client sur un devis envoyé (accepter/refuser). Pas de table
-- quote_decisions ni de fonction submit_quote_decision pour cette V1 (comme
-- convenu) : une simple transition de statut sur quotes, avec horodatage.
alter table public.quotes
  add column if not exists decided_at timestamptz;

-- Le trigger ci-dessous (pas seulement la policy RLS) est ce qui garantit
-- qu'un membre de compte ne peut modifier QUE status et decided_at, jamais
-- une autre colonne (total_ttc, notes, quote_number...) : une policy RLS ne
-- peut pas exprimer "aucune autre colonne ne change" en comparant à
-- l'ancienne ligne sans connaître la liste exacte des colonnes de quotes
-- (qui nous est invisible depuis ce repo, comme le reste du schéma
-- pré-existant) — un trigger comparant OLD/NEW en jsonb s'adapte de
-- lui-même si des colonnes sont ajoutées plus tard, sans qu'il faille
-- revenir dessus. Bypass total pour is_internal() : le staff continue
-- d'éditer librement un devis via son propre chemin d'écriture existant
-- (quotes_internal_write), ce trigger ne le concerne pas.
--
-- Extensibilité (signature électronique réelle plus tard, table
-- signatures/bucket storage déjà en place) : n'importe modifie ici la
-- liste des statuts cibles autorisés (NEW.status) et la liste des colonnes
-- exclues de la comparaison OLD/NEW (par exemple pour autoriser un futur
-- statut intermédiaire 'pending_signature' ou une colonne
-- signature_id) — sans toucher à la policy RLS elle-même.
create or replace function public.enforce_quote_client_decision_update()
returns trigger
language plpgsql
as $$
declare
  old_json jsonb;
  new_json jsonb;
begin
  if public.is_internal() then
    return new;
  end if;

  old_json := to_jsonb(old) - 'status' - 'decided_at';
  new_json := to_jsonb(new) - 'status' - 'decided_at';
  if old_json is distinct from new_json then
    raise exception 'Seuls les champs status et decided_at peuvent être modifiés par ce biais.';
  end if;

  if old.status <> 'sent' then
    raise exception 'Cette demande ne peut être acceptée ou refusée que depuis le statut "sent".';
  end if;

  if new.status not in ('accepted', 'refused') then
    raise exception 'Statut cible invalide.';
  end if;

  if new.decided_at is null then
    raise exception 'decided_at doit être renseigné.';
  end if;

  return new;
end;
$$;

drop trigger if exists quotes_client_decision_guard on public.quotes;
create trigger quotes_client_decision_guard
  before update on public.quotes
  for each row
  execute function public.enforce_quote_client_decision_update();

-- Policy RLS : autorise la tentative de mise à jour pour un membre du
-- compte (même join via dossiers que quote_lines_read, voir
-- 009_scope_quote_lines_access.sql — quotes n'a pas de colonne account_id
-- propre, l'accès passe par dossiers.account_id). N'enlève rien à
-- l'existant (quotes_internal_write garde un accès total pour is_internal()).
-- Le détail fin (quelles colonnes, quelle transition) est appliqué par le
-- trigger ci-dessus, pas ici.
create policy quotes_client_decision_update on public.quotes
for update to authenticated
using (
  status = 'sent'
  and exists (
    select 1 from public.dossiers d
    where d.id = quotes.dossier_id
      and public.can_access_account(d.account_id)
  )
)
with check (
  exists (
    select 1 from public.dossiers d
    where d.id = quotes.dossier_id
      and public.can_access_account(d.account_id)
  )
);
