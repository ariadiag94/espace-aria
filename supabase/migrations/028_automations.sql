-- 028_automations.sql
-- Automatisations quotidiennes (route /api/cron/daily, lancée chaque matin
-- par Vercel Cron) :
--   - relance des devis envoyés restés sans réponse (J+3 puis J+7) ;
--   - rappel e-mail au client la veille de l'intervention.
-- automation_settings : interrupteurs pilotés depuis /automatisations.
-- automation_log : journal des envois (sert aussi à ne jamais envoyer deux
-- fois la même relance ou le même rappel).

create table if not exists public.automation_settings (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.automation_settings (key, enabled) values
  ('quote_reminders', true),
  ('appointment_reminders', true)
on conflict (key) do nothing;

create table if not exists public.automation_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quote_reminder', 'appointment_reminder')),
  target_id uuid not null,
  dossier_id uuid,
  recipient text,
  step int not null default 1,
  resend_email_id text,
  created_at timestamptz not null default now()
);

create index if not exists automation_log_target_idx on public.automation_log (kind, target_id, created_at desc);

alter table public.automation_settings enable row level security;
alter table public.automation_log enable row level security;

drop policy if exists automation_settings_admin_all on public.automation_settings;
create policy automation_settings_admin_all on public.automation_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists automation_log_admin_all on public.automation_log;
create policy automation_log_admin_all on public.automation_log
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
