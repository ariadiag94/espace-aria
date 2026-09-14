-- 008_accounts_and_scoped_access.sql
-- Fondation d'un vrai système multi-comptes : chaque dossier appartient
-- à un compte (accounts), et seuls les membres de ce compte (ou le staff ARIA)
-- peuvent le consulter/modifier.

-- 1) Table des comptes (un syndic, une agence, un particulier)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'client' check (kind in ('client', 'staff')),
  created_at timestamptz not null default now()
);

-- 2) Rattachement des utilisateurs Supabase Auth à un ou plusieurs comptes
create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

-- 3) Fonction utilitaire : l'utilisateur courant est-il staff ARIA ?
create or replace function public.is_aria_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.account_members
    where user_id = auth.uid() and is_staff = true
  );
$$;

-- 4) Fonction utilitaire : l'utilisateur courant appartient-il à ce compte ?
create or replace function public.is_account_member(target_account_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select public.is_aria_staff() or exists (
    select 1 from public.account_members
    where user_id = auth.uid() and account_id = target_account_id
  );
$$;

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;

drop policy if exists accounts_member_select on public.accounts;
create policy accounts_member_select on public.accounts
for select to authenticated using (public.is_account_member(id));

drop policy if exists account_members_self_select on public.account_members;
create policy account_members_self_select on public.account_members
for select to authenticated using (user_id = auth.uid() or public.is_aria_staff());

-- 5) Recalage de quote_lines : fini le "using (true)" pour tout le monde.
-- On vérifie l'appartenance via quotes -> dossiers -> account_id.
drop policy if exists quote_lines_authenticated_select on public.quote_lines;
drop policy if exists quote_lines_authenticated_insert on public.quote_lines;
drop policy if exists quote_lines_authenticated_update on public.quote_lines;
drop policy if exists quote_lines_authenticated_delete on public.quote_lines;

create policy quote_lines_scoped_select on public.quote_lines
for select to authenticated using (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.is_account_member(d.account_id)
  )
);

create policy quote_lines_scoped_insert on public.quote_lines
for insert to authenticated with check (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.is_account_member(d.account_id)
  )
);

create policy quote_lines_scoped_update on public.quote_lines
for update to authenticated
using (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.is_account_member(d.account_id)
  )
)
with check (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.is_account_member(d.account_id)
  )
);

create policy quote_lines_scoped_delete on public.quote_lines
for delete to authenticated using (
  exists (
    select 1 from public.quotes q
    join public.dossiers d on d.id = q.dossier_id
    where q.id = quote_lines.quote_id
      and public.is_account_member(d.account_id)
  )
);

-- 6) Migration des données existantes : crée un compte "staff" ARIA
-- et y rattache automatiquement tous les utilisateurs déjà présents,
-- pour ne rien casser de l'usage interne actuel.
insert into public.accounts (id, name, kind)
values ('00000000-0000-0000-0000-000000000001', 'ARIA Diagnostics (interne)', 'staff')
on conflict (id) do nothing;

insert into public.account_members (account_id, user_id, is_staff)
select '00000000-0000-0000-0000-000000000001', id, true
from auth.users
on conflict (account_id, user_id) do nothing;

-- 7) Tous les dossiers existants, qui pointent vers un account_id incohérent
-- ou nul, sont rattachés à ce compte interne pour l'instant.
update public.dossiers
set account_id = '00000000-0000-0000-0000-000000000001'
where account_id is null
   or account_id not in (select id from public.accounts);
