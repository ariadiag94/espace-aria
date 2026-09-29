-- 024_leads_client_documents.sql
-- Envoi automatique au client, en fin de /assistant, du PDF "devis
-- estimatif + ordre de mission" (décision du 2026-09-27 : envoi 100 %
-- automatique, sans validation humaine préalable).
--
-- /assistant étant désormais réservé aux utilisateurs connectés ayant
-- has_assistant_access() (migration 020), le lead est inséré avec la session
-- de l'utilisateur : on mémorise son auteur (created_by) pour que la route
-- serveur /api/leads/[id]/client-documents ne puisse envoyer des documents
-- QUE pour un lead créé par l'utilisateur qui l'appelle, une seule fois, et
-- seulement peu après sa création. Sans ces garde-fous, la route serait un
-- relais d'emails ARIA vers n'importe quelle adresse.

-- 1. Colonnes
alter table public.leads
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists client_documents_sent_at timestamptz,
  add column if not exists client_documents_email_id text;

-- 2. Réservation atomique de l'envoi (security definer : la RLS de leads
--    n'autorise la lecture qu'au staff, voir 011). Renvoie la ligne du lead
--    si et seulement si :
--    - l'appelant en est l'auteur,
--    - il a toujours accès à /assistant,
--    - aucun envoi n'a déjà été réservé,
--    - le lead a moins de 15 minutes.
--    Sinon, aucune ligne. La réservation pose client_documents_sent_at dans
--    la même instruction (pas de double envoi en cas de double clic).
create or replace function public.claim_lead_client_documents(p_lead_id uuid)
returns setof public.leads
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_assistant_access() then
    return;
  end if;

  return query
  update public.leads
     set client_documents_sent_at = now()
   where id = p_lead_id
     and created_by = auth.uid()
     and client_documents_sent_at is null
     and created_at > now() - interval '15 minutes'
  returning *;
end;
$$;

revoke all on function public.claim_lead_client_documents(uuid) from public;
grant execute on function public.claim_lead_client_documents(uuid) to authenticated;

-- 3. Finalisation : en cas d'échec d'envoi, libère la réservation (pour
--    permettre un nouvel essai) ; en cas de succès, mémorise l'id Resend.
create or replace function public.finish_lead_client_documents(
  p_lead_id uuid,
  p_success boolean,
  p_email_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_success then
    update public.leads
       set client_documents_email_id = p_email_id
     where id = p_lead_id
       and created_by = auth.uid();
  else
    update public.leads
       set client_documents_sent_at = null
     where id = p_lead_id
       and created_by = auth.uid()
       and client_documents_email_id is null;
  end if;
end;
$$;

revoke all on function public.finish_lead_client_documents(uuid, boolean, text) from public;
grant execute on function public.finish_lead_client_documents(uuid, boolean, text) to authenticated;
