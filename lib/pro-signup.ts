import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Catégories professionnelles uniquement (account_type de client_accounts
// inclut aussi 'individual', jamais proposé ici — réservé aux dossiers créés
// par le staff pour un particulier). Partagé entre le formulaire
// d'inscription et la page de finalisation (qui relit ce même champ depuis
// user_metadata), pour qu'un libellé ne puisse pas diverger entre les deux.
export const ACCOUNT_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'agency', label: 'Agence immobilière' },
  { id: 'syndic', label: 'Syndic de copropriété' },
  { id: 'notary', label: 'Notaire' },
  { id: 'landlord', label: 'Bailleur / Propriétaire' },
  { id: 'company', label: 'Entreprise' },
  { id: 'other', label: 'Autre professionnel' },
]

export type ProSignupFields = {
  companyName: string
  accountType: string
  firstName: string
  lastName: string
  phone: string
  siret: string
  justificatif: string
}

const CONTACT_SUFFIX = ' Merci de nous contacter directement au 06 15 70 36 70.'

// Séquence de création partagée entre /inscription-pro (confirmation email
// désactivée sur ce projet Supabase, session immédiate après signUp()) et
// /inscription-pro/finalisation (confirmation activée, exécutée après que
// l'utilisateur a cliqué le lien reçu par email et obtenu une session) —
// même logique exacte dans les deux cas, jamais dupliquée.
export async function createProAccount(
  client: SupabaseClient,
  userId: string,
  email: string,
  fields: ProSignupFields,
): Promise<{ error: string | null }> {
  // Id choisi côté client plutôt qu'un .select() après insert : si
  // client_accounts n'accorde pas de droit SELECT à ce rôle, .select()
  // échouerait silencieusement après un insert pourtant réussi — même
  // précaution que pour public.leads dans app/assistant/page.tsx.
  const accountId = crypto.randomUUID()
  const { error: accountError } = await client.from('client_accounts').insert({
    id: accountId,
    account_type: fields.accountType,
    company_name: fields.companyName,
    first_name: fields.firstName,
    last_name: fields.lastName,
    email,
    phone: fields.phone,
    siret: fields.siret,
    justificatif: fields.justificatif || null,
    submitted_at: new Date().toISOString(),
  })

  if (accountError) {
    return { error: `Les informations de votre demande n’ont pas pu être enregistrées (${accountError.message}).${CONTACT_SUFFIX}` }
  }

  const { error: membershipError } = await client.from('account_memberships').insert({
    account_id: accountId,
    user_id: userId,
    membership_role: 'owner',
    active: true,
  })

  if (membershipError) {
    return { error: `Votre demande a été enregistrée, mais l’association à votre compte n’a pas pu être finalisée (${membershipError.message}).${CONTACT_SUFFIX}` }
  }

  fetch('/api/pro-signup/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: fields.companyName,
      account_type: fields.accountType,
      first_name: fields.firstName,
      last_name: fields.lastName,
      email,
      phone: fields.phone,
      siret: fields.siret,
    }),
  }).catch(() => {})

  return { error: null }
}

// Client dédié (pas lib/supabase.ts, qui lève une exception au chargement du
// module si les variables d'env sont absentes) : /inscription-pro et
// /inscription-pro/finalisation sont des pages publiques, elles doivent
// continuer à s'afficher même si Supabase est mal configuré — seule l'action
// doit échouer proprement dans ce cas (même principe que getLeadsClient()
// dans app/assistant/page.tsx). Contrairement à ce client jetable, la
// persistance de session est activée ici : on crée/relit un vrai compte
// utilisateur destiné à être réutilisé.
export const getSignupClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
}
