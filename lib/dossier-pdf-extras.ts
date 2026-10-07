import type { SupabaseClient } from '@supabase/supabase-js'

// Informations complémentaires du dossier reprises sur le devis PDF
// (en-tête « Dossier », rendez-vous, dépendances, lots / étage de l'ordre de
// mission). Toutes facultatives : un champ vide reste une ligne à compléter.
export type DossierPdfExtras = {
  dossierRef: string | null
  appointmentAt: string | null
  dependencies: string[]
  lotFloor: string | null
  // Titulaire du compte client (propriétaire) quand il diffère du donneur
  // d'ordre du dossier (ex. agence ou architecte qui commande pour son client).
  ownerName: string | null
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export async function loadDossierPdfExtras(
  supabase: SupabaseClient,
  dossier: Record<string, unknown>,
): Promise<DossierPdfExtras> {
  const rawDeps = dossier.dependencies
  const dependencies = Array.isArray(rawDeps)
    ? rawDeps.map(String).map((d) => d.trim()).filter(Boolean)
    : String(rawDeps || '').split(/[,;/]+/).map((d) => d.trim()).filter(Boolean)

  const lotParts = [
    text(dossier.building) && `Bât. ${text(dossier.building)}`,
    text(dossier.staircase) && `Esc. ${text(dossier.staircase)}`,
    text(dossier.floor) && `Étage ${text(dossier.floor)}`,
    text(dossier.door_number) && `Porte ${text(dossier.door_number)}`,
    text(dossier.lot_numbers) && `Lot(s) ${text(dossier.lot_numbers)}`,
  ].filter(Boolean) as string[]

  // Prochain rendez-vous non annulé (sinon le plus récent).
  let appointmentAt: string | null = null
  try {
    const { data } = await supabase.from('appointments').select('*').eq('dossier_id', String(dossier.id))
    const dates = (data || [])
      .filter((a: Record<string, unknown>) => !['cancelled', 'canceled'].includes(String(a.status || '').toLowerCase()))
      .map((a: Record<string, unknown>) => text(a.starts_at) || text(a.start_at) || text(a.scheduled_at) || text(a.date))
      .filter((d): d is string => !!d && !Number.isNaN(new Date(d).getTime()))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    const now = Date.now()
    appointmentAt = dates.find((d) => new Date(d).getTime() >= now) || dates[dates.length - 1] || null
  } catch {
    appointmentAt = null
  }

  let ownerName: string | null = null
  try {
    if (dossier.account_id) {
      const { data: acc } = await supabase.from('client_accounts').select('company_name,first_name,last_name').eq('id', String(dossier.account_id)).maybeSingle()
      const name = acc ? (text(acc.company_name) || [text(acc.first_name), text(acc.last_name)].filter(Boolean).join(' ') || null) : null
      const contact = text(dossier.contact_name)
      if (name && (!contact || name.toLowerCase() !== contact.toLowerCase())) ownerName = name
    }
  } catch {
    ownerName = null
  }

  return {
    ownerName,
    dossierRef: text(dossier.liciel_number),
    appointmentAt,
    dependencies,
    lotFloor: lotParts.length ? lotParts.join(' · ') : null,
  }
}
