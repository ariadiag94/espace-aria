alter table public.quotes
  add column if not exists property_type text,
  add column if not exists property_size text,
  add column if not exists quote_kind text,
  add column if not exists notes text;

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  quantity numeric not null default 1,
  unit_ttc numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quote_lines_quote_id_idx on public.quote_lines(quote_id);

alter table public.quote_lines enable row level security;

drop policy if exists quote_lines_authenticated_select on public.quote_lines;
create policy quote_lines_authenticated_select on public.quote_lines
for select to authenticated using (true);

drop policy if exists quote_lines_authenticated_insert on public.quote_lines;
create policy quote_lines_authenticated_insert on public.quote_lines
for insert to authenticated with check (true);

drop policy if exists quote_lines_authenticated_update on public.quote_lines;
create policy quote_lines_authenticated_update on public.quote_lines
for update to authenticated using (true) with check (true);

drop policy if exists quote_lines_authenticated_delete on public.quote_lines;
create policy quote_lines_authenticated_delete on public.quote_lines
for delete to authenticated using (true);
