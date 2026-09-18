create table if not exists public.quote_email_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  recipient text not null,
  resend_email_id text,
  sent_at timestamptz not null default now(),
  created_by uuid not null default auth.uid()
);

create index if not exists quote_email_events_quote_id_sent_at_idx
  on public.quote_email_events (quote_id, sent_at desc);

create index if not exists quote_email_events_dossier_id_sent_at_idx
  on public.quote_email_events (dossier_id, sent_at desc);

alter table public.quote_email_events enable row level security;

drop policy if exists "quote_email_events_select_own" on public.quote_email_events;
create policy "quote_email_events_select_own"
  on public.quote_email_events
  for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "quote_email_events_insert_own" on public.quote_email_events;
create policy "quote_email_events_insert_own"
  on public.quote_email_events
  for insert
  to authenticated
  with check (created_by = auth.uid());
