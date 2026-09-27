-- 023_dossiers_client_decision_sync.sql
-- Chantier "compte pro" — synchronise dossiers.status quand un client
-- accepte/refuse un devis via /mon-espace (jusqu'ici, seul quotes.status
-- était mis à jour, voir app/mon-espace/[dossierId]/page.tsx — dossiers.status
-- restait figé sur 'quote_sent', faussant la métrique "Devis envoyés" et le
-- badge de statut du dashboard staff, app/dashboard/page.tsx). Même principe
-- exact que 022_mon_espace_client_portal.sql pour quotes : une policy RLS
-- UPDATE large combinée à un trigger strict, qui est ce qui garantit
-- réellement qu'aucune autre colonne ne change et que seule la transition
-- 'quote_sent' -> 'quote_accepted'/'quote_refused' est permise.
--
-- Convention produit validée : devis accepté -> dossiers.status =
-- 'quote_accepted' (valeur déjà existante, utilisée côté staff) ; devis
-- refusé -> dossiers.status = 'quote_refused' (nouvelle valeur, ajoutée
-- aussi au labelStatus du dashboard staff — voir app/dashboard/page.tsx et
-- lib/dossier-status-labels.ts).

create or replace function public.enforce_dossier_client_decision_update()
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

  old_json := to_jsonb(old) - 'status';
  new_json := to_jsonb(new) - 'status';
  if old_json is distinct from new_json then
    raise exception 'Seul le champ status peut être modifié par ce biais.';
  end if;

  if old.status <> 'quote_sent' then
    raise exception 'Cette transition n''est autorisée que depuis le statut "quote_sent".';
  end if;

  if new.status not in ('quote_accepted', 'quote_refused') then
    raise exception 'Statut cible invalide.';
  end if;

  return new;
end;
$$;

drop trigger if exists dossiers_client_decision_guard on public.dossiers;
create trigger dossiers_client_decision_guard
  before update on public.dossiers
  for each row
  execute function public.enforce_dossier_client_decision_update();

-- Policy RLS : autorise la tentative de mise à jour pour un membre du
-- compte concerné (dossiers.account_id, colonne directe — contrairement à
-- quotes qui n'a pas de colonne account_id propre). N'enlève rien à
-- l'existant (une éventuelle policy interne large pour is_internal() garde
-- un accès total, le trigger la bypasse explicitement). Le détail fin
-- (quelle colonne, quelle transition) est appliqué par le trigger
-- ci-dessus, pas ici.
create policy dossiers_client_decision_update on public.dossiers
for update to authenticated
using (
  status = 'quote_sent'
  and public.can_access_account(account_id)
)
with check (
  public.can_access_account(account_id)
);
