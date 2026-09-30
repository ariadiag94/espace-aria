-- 029_collaborators.sql
-- Plusieurs collaborateurs par compte pro (agence, syndic…).
-- - Le responsable (owner) ou l'admin ARIA invite un collaborateur par
--   e-mail ; le collaborateur rejoint le compte existant (pas de nouvelle
--   validation, remise pro incluse, voit tous les dossiers de l'agence).
-- - Nom de chaque collaborateur (display_name) affiché sur l'équipe et sur
--   les dossiers qu'il a demandés (dossiers.requested_by_name).
-- - Détection des doublons de SIRET à l'inscription.

alter table public.account_memberships
  add column if not exists display_name text,
  add column if not exists team_role text not null default 'member';

update public.account_memberships m
   set display_name = nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '')
  from public.client_accounts a
 where a.id = m.account_id and m.display_name is null;

update public.account_memberships set team_role = 'owner' where membership_role = 'owner';

alter table public.dossiers add column if not exists requested_by_name text;

create table if not exists public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.client_accounts(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  token text not null unique,
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid
);

alter table public.account_invitations enable row level security;
drop policy if exists account_invitations_admin_all on public.account_invitations;
create policy account_invitations_admin_all on public.account_invitations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Le compte est-il géré par l'appelant (responsable actif) ou l'appelant est-il admin ?
create or replace function public.can_manage_account_team(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.account_memberships
    where account_id = p_account_id and user_id = auth.uid()
      and coalesce(active, true) and team_role = 'owner'
  );
$$;
revoke all on function public.can_manage_account_team(uuid) from public;
grant execute on function public.can_manage_account_team(uuid) to authenticated;

-- Crée une invitation (ou la renouvelle pour le même e-mail) ; renvoie le jeton.
create or replace function public.invite_collaborator(p_account_id uuid, p_email text, p_first_name text, p_last_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_email text := lower(trim(p_email));
begin
  if not public.can_manage_account_team(p_account_id) then
    raise exception 'Seul le responsable du compte peut inviter un collaborateur.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;
  if not exists (select 1 from public.client_accounts where id = p_account_id and validation_status = 'validated') then
    raise exception 'Le compte doit être validé par ARIA avant d''inviter des collaborateurs.';
  end if;
  delete from public.account_invitations where account_id = p_account_id and lower(email) = v_email and accepted_at is null;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.account_invitations (account_id, email, first_name, last_name, token)
  values (p_account_id, v_email, nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''), v_token);
  return v_token;
end;
$$;
revoke all on function public.invite_collaborator(uuid, text, text, text) from public;
grant execute on function public.invite_collaborator(uuid, text, text, text) to authenticated;

-- Lecture publique d'une invitation (page /invitation/<jeton>).
create or replace function public.get_invitation(p_token text)
returns table (company_name text, email text, first_name text, last_name text, accepted boolean)
language sql
security definer
set search_path = public
stable
as $$
  select a.company_name, i.email, i.first_name, i.last_name, i.accepted_at is not null
  from public.account_invitations i
  join public.client_accounts a on a.id = i.account_id
  where i.token = p_token and length(coalesce(p_token, '')) >= 40
    and i.created_at > now() - interval '30 days';
$$;
revoke all on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- Acceptation par l'utilisateur connecté dont l'e-mail correspond.
create or replace function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.account_invitations%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text;
  v_role text;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into inv from public.account_invitations
   where token = p_token and created_at > now() - interval '30 days';
  if not found then raise exception 'Invitation introuvable ou expirée.'; end if;
  if lower(inv.email) <> v_email then
    raise exception 'Cette invitation a été envoyée à %. Connectez-vous avec cette adresse.', inv.email;
  end if;
  v_name := nullif(trim(coalesce(inv.first_name, '') || ' ' || coalesce(inv.last_name, '')), '');
  if exists (select 1 from public.account_memberships where account_id = inv.account_id and user_id = auth.uid()) then
    update public.account_memberships set active = true, display_name = coalesce(display_name, v_name)
     where account_id = inv.account_id and user_id = auth.uid();
  else
    -- membership_role : valeurs autorisées inconnues ici (contrainte
    -- d'origine) ; on essaie les libellés usuels, le rôle réel de l'équipe
    -- est porté par team_role.
    foreach v_role in array array['member', 'collaborator', 'user', 'staff', 'viewer', 'agent'] loop
      begin
        insert into public.account_memberships (account_id, user_id, membership_role, active, display_name, team_role)
        values (inv.account_id, auth.uid(), v_role, true, v_name, 'member');
        exit;
      exception when check_violation or invalid_text_representation then
        null;
      end;
    end loop;
    if not exists (select 1 from public.account_memberships where account_id = inv.account_id and user_id = auth.uid()) then
      raise exception 'Rattachement impossible, contactez ARIA au 06 15 70 36 70.';
    end if;
  end if;
  update public.account_invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return (select company_name from public.client_accounts where id = inv.account_id);
end;
$$;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

-- Équipe d'un compte (visible par ses membres et l'admin).
create or replace function public.list_account_team(p_account_id uuid)
returns table (user_id uuid, display_name text, email text, team_role text, active boolean, pending boolean)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id, m.display_name, u.email::text, m.team_role, coalesce(m.active, true), false
  from public.account_memberships m
  left join auth.users u on u.id = m.user_id
  where m.account_id = p_account_id
    and (public.is_admin() or exists (select 1 from public.account_memberships x where x.account_id = p_account_id and x.user_id = auth.uid() and coalesce(x.active, true)))
  union all
  select null, nullif(trim(coalesce(i.first_name, '') || ' ' || coalesce(i.last_name, '')), ''), i.email, 'member', false, true
  from public.account_invitations i
  where i.account_id = p_account_id and i.accepted_at is null and i.created_at > now() - interval '30 days'
    and public.can_manage_account_team(p_account_id);
$$;
revoke all on function public.list_account_team(uuid) from public;
grant execute on function public.list_account_team(uuid) to authenticated;

-- Retrait d'un collaborateur (jamais le responsable) ou annulation d'invitation.
create or replace function public.remove_collaborator(p_account_id uuid, p_user_id uuid, p_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_account_team(p_account_id) then
    raise exception 'Action réservée au responsable du compte.';
  end if;
  if p_user_id is not null then
    update public.account_memberships set active = false
     where account_id = p_account_id and user_id = p_user_id and team_role <> 'owner';
  elsif p_email is not null then
    delete from public.account_invitations where account_id = p_account_id and lower(email) = lower(p_email) and accepted_at is null;
  end if;
end;
$$;
revoke all on function public.remove_collaborator(uuid, uuid, text) from public;
grant execute on function public.remove_collaborator(uuid, uuid, text) to authenticated;

-- Compte de l'utilisateur connecté (id, nom, rôle dans l'équipe).
create or replace function public.my_team_account()
returns table (account_id uuid, company_name text, team_role text, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.company_name, m.team_role, m.display_name
  from public.account_memberships m
  join public.client_accounts a on a.id = m.account_id
  where m.user_id = auth.uid() and coalesce(m.active, true)
  order by (m.team_role = 'owner') desc
  limit 1;
$$;
revoke all on function public.my_team_account() from public;
grant execute on function public.my_team_account() to authenticated;

-- Doublons : un compte pro existe-t-il déjà pour ce SIRET ?
create or replace function public.pro_account_exists_for_siret(p_siret text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select length(regexp_replace(coalesce(p_siret, ''), '\D', '', 'g')) = 14 and exists (
    select 1 from public.client_accounts
    where regexp_replace(coalesce(siret, ''), '\D', '', 'g') = regexp_replace(p_siret, '\D', '', 'g')
      and validation_status <> 'rejected'
  );
$$;
revoke all on function public.pro_account_exists_for_siret(text) from public;
grant execute on function public.pro_account_exists_for_siret(text) to anon, authenticated;
