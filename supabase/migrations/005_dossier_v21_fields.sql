-- Espace ARIA – V2.1 dossier fields
-- Adds the editable terrain / access / mission fields used by the dossier workspace.

alter table public.dossiers
  add column if not exists property_address text,
  add column if not exists contact_email text,
  add column if not exists building text,
  add column if not exists staircase text,
  add column if not exists floor text,
  add column if not exists door_number text,
  add column if not exists lot_numbers text,
  add column if not exists dependencies text,
  add column if not exists parking_instructions text,
  add column if not exists digicode text,
  add column if not exists interphone text,
  add column if not exists diagnostics text[];
