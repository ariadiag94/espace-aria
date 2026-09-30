-- 030_staff_role.sql
-- Rôle « assistante / stagiaire » (profiles.role = 'staff') :
-- - voit et gère dossiers, agenda, documents (politiques is_internal()
--   inchangées) ;
-- - n'a plus accès en écriture aux devis, tarifs/codes promo, factures,
--   paiements, comptes pro, ni aux demandes (leads) : ces tables passent en
--   administration seule (les politiques *_admin_all de la migration 025
--   couvrent l'admin) ;
-- - lecture des comptes clients conservée (création de dossier).
-- + invitations d'équipe interne par l'admin (staff_invitations).

-- 1. Écritures sensibles réservées à l'admin
drop policy if exists quotes_internal_write on public.quotes;
drop policy if exists quote_lines_internal_write on public.quote_lines;
drop policy if exists quote_items_internal_write on public.quote_items;
drop policy if exists promo_codes_staff_write on public.promo_codes;
drop policy if exists invoices_internal_all on public.invoices;
drop policy if exists payments_internal_all on public.payments;
drop policy if exists leads_staff_all on public.leads;
drop policy if exists account_internal_all on public.client_accounts;
drop policy if exists membership_internal_all on public.account_memberships;

drop policy if exists quote_decisions_internal_all on public.quote_decisions;
drop policy if exists quote_decisions_admin_all on public.quote_decisions;
create policy quote_decisions_admin_all on public.quote_decisions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists client_accounts_internal_read on public.client_accounts;
create policy client_accounts_internal_read on public.client_accounts
  for select to authenticated using (public.is_internal());

-- 2. Invitations de l'équipe interne
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  last_name text,
  token text not null unique,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.staff_invitations enable row level security;
drop policy if exists staff_invitations_admin_all on public.staff_invitations;
create policy staff_invitations_admin_all on public.staff_invitations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.invite_staff(p_email text, p_first_name text, p_last_name text)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text; v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Adresse e-mail invalide.'; end if;
  delete from public.staff_invitations where lower(email) = v_email and accepted_at is null;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.staff_invitations (email, first_name, last_name, token)
  values (v_email, nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''), v_token);
  return v_token;
end;
$$;
revoke all on function public.invite_staff(text, text, text) from public;
grant execute on function public.invite_staff(text, text, text) to authenticated;

create or replace function public.get_staff_invitation(p_token text)
returns table (email text, first_name text, last_name text, accepted boolean)
language sql security definer set search_path = public stable as $$
  select email, first_name, last_name, accepted_at is not null
  from public.staff_invitations
  where token = p_token and length(coalesce(p_token, '')) >= 40 and created_at > now() - interval '30 days';
$$;
revoke all on function public.get_staff_invitation(text) from public;
grant execute on function public.get_staff_invitation(text) to anon, authenticated;

create or replace function public.accept_staff_invitation(p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare inv public.staff_invitations%rowtype; v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into inv from public.staff_invitations where token = p_token and created_at > now() - interval '30 days';
  if not found then raise exception 'Invitation introuvable ou expirée.'; end if;
  if lower(inv.email) <> v_email then
    raise exception 'Cette invitation a été envoyée à %. Connectez-vous avec cette adresse.', inv.email;
  end if;
  insert into public.profiles (id, email, first_name, last_name, role)
  values (auth.uid(), v_email, inv.first_name, inv.last_name, 'staff')
  on conflict (id) do update set role = case when public.profiles.role = 'admin' then 'admin' else 'staff' end,
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name);
  update public.staff_invitations set accepted_at = now() where id = inv.id;
end;
$$;
revoke all on function public.accept_staff_invitation(text) from public;
grant execute on function public.accept_staff_invitation(text) to authenticated;

create or replace function public.list_internal_team()
returns table (user_id uuid, name text, email text, role text, pending boolean)
language sql security definer set search_path = public stable as $$
  select p.id, nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), p.email, p.role, false
  from public.profiles p where p.role in ('admin', 'staff') and public.is_admin()
  union all
  select null, nullif(trim(coalesce(i.first_name, '') || ' ' || coalesce(i.last_name, '')), ''), i.email, 'staff', true
  from public.staff_invitations i
  where i.accepted_at is null and i.created_at > now() - interval '30 days' and public.is_admin();
$$;
revoke all on function public.list_internal_team() from public;
grant execute on function public.list_internal_team() to authenticated;

create or replace function public.remove_staff(p_user_id uuid, p_email text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if p_user_id is not null then
    update public.profiles set role = 'client' where id = p_user_id and role = 'staff';
  elsif p_email is not null then
    delete from public.staff_invitations where lower(email) = lower(p_email) and accepted_at is null;
  end if;
end;
$$;
revoke all on function public.remove_staff(uuid, text) from public;
grant execute on function public.remove_staff(uuid, text) to authenticated;
