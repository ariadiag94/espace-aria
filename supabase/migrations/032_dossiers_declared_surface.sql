-- Surface communiquée par le donneur d'ordre (m²), avant mesurage.
alter table public.dossiers add column if not exists declared_surface_m2 numeric(8,2) check (declared_surface_m2 is null or declared_surface_m2 > 0);
comment on column public.dossiers.declared_surface_m2 is 'Surface communiquée par le donneur d''ordre (m²), avant mesurage';
