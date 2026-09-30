-- 027_calendar_feed.sql
-- Abonnement Google Agenda (ou Apple/Outlook) aux rendez-vous de l'app :
-- flux iCalendar lu par /api/agenda/ics/<jeton>. Google interroge ce lien
-- sans être connecté à l'app : l'accès repose sur un jeton secret, créé
-- par un membre interne et révocable (régénérer = l'ancien lien cesse de
-- fonctionner).

create table if not exists public.calendar_feed_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.calendar_feed_tokens enable row level security;

drop policy if exists calendar_feed_tokens_own_select on public.calendar_feed_tokens;
create policy calendar_feed_tokens_own_select on public.calendar_feed_tokens
  for select to authenticated using (user_id = auth.uid());

-- Crée (ou remplace) le jeton de l'utilisateur interne connecté.
create or replace function public.create_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.is_internal() then
    raise exception 'Accès réservé à ARIA';
  end if;
  delete from public.calendar_feed_tokens where user_id = auth.uid();
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.calendar_feed_tokens (token, user_id) values (v_token, auth.uid());
  return v_token;
end;
$$;

revoke all on function public.create_calendar_feed_token() from public;
grant execute on function public.create_calendar_feed_token() to authenticated;

-- Rendez-vous (90 derniers jours + à venir, hors annulés) avec leur dossier,
-- uniquement pour un jeton valide appartenant à un admin/staff.
create or replace function public.calendar_feed(p_token text)
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  -- Colonnes lues via jsonb : la requête reste valide même si une colonne
  -- optionnelle (scheduled_at, status…) n'existe pas dans appointments.
  select j || jsonb_build_object('dossier', to_jsonb(d))
  from public.appointments a
  cross join lateral (select to_jsonb(a) as j) x
  left join public.dossiers d on d.id::text = x.j->>'dossier_id'
  where length(coalesce(p_token, '')) >= 40
    and exists (
      select 1 from public.calendar_feed_tokens t
      join public.profiles p on p.id = t.user_id
      where t.token = p_token and p.role in ('admin', 'staff')
    )
    and lower(coalesce(x.j->>'status', '')) not in ('cancelled', 'canceled')
    and coalesce(x.j->>'starts_at', x.j->>'scheduled_at', x.j->>'created_at')::timestamptz > now() - interval '90 days'
  order by coalesce(x.j->>'starts_at', x.j->>'scheduled_at', x.j->>'created_at')::timestamptz;
$$;

revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
