-- Espace ARIA – appointment compatibility
-- Keep the existing starts_at model while supporting the current V2.1 client field scheduled_at.

alter table public.appointments
  add column if not exists scheduled_at timestamp with time zone;

update public.appointments
set scheduled_at = starts_at
where scheduled_at is null
  and starts_at is not null;

create or replace function public.sync_appointment_schedule_fields()
returns trigger
language plpgsql
as $$
begin
  if new.scheduled_at is null and new.starts_at is not null then
    new.scheduled_at := new.starts_at;
  elsif new.starts_at is null and new.scheduled_at is not null then
    new.starts_at := new.scheduled_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_appointment_schedule_fields on public.appointments;
create trigger trg_sync_appointment_schedule_fields
before insert or update on public.appointments
for each row
execute function public.sync_appointment_schedule_fields();
