-- 025_admin_full_access.sql
-- L'administrateur (is_admin(), migration 019) doit pouvoir tout lire et tout
-- modifier dans l'app : demandes, comptes et rattachements pro, biens,
-- dossiers, devis, rendez-vous, documents, factures, paiements...
--
-- Ajoute sur chaque table existante une policy « <table>_admin_all »
-- (toutes opérations, réservée à is_admin()). Les policies sont additives :
-- rien ne change pour le staff, les pros ou les clients. Idempotent :
-- relançable sans erreur (table absente ou policy déjà présente = ignorée).

do $$
declare
  t text;
  tables text[] := array[
    'leads', 'account_memberships', 'client_accounts', 'profiles',
    'properties', 'dossiers', 'quotes', 'quote_lines', 'quote_items',
    'quote_email_events', 'appointments', 'documents', 'invoices',
    'payments', 'promo_codes'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = t and policyname = t || '_admin_all'
       ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        t || '_admin_all', t
      );
    end if;
  end loop;
end
$$;
