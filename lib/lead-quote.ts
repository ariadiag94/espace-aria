import type { ContractLine } from '@/lib/quote-contract'

// Transforme un lead /assistant (ligne de public.leads) en contenu du PDF
// "devis estimatif + ordre de mission" envoyé automatiquement au client
// (voir app/api/leads/[id]/client-documents/route.ts).
//
// Le prix n'est jamais recalculé ici : on reprend estimated_price, le montant
// exact affiché au client à l'écran (même source lib/property-pricing.ts,
// remises pro/location incluses). Une seule ligne de prestation au montant
// total, pour ne jamais présenter une ventilation qui ne correspondrait pas
// au prix affiché.

export type LeadRow = {
  id: string
  created_at: string
  contact_name: string
  contact_phone: string
  contact_email: string
  property_address: string | null
  property_type: string
  purpose: string
  estimated_price: number | string | null
  diagnostics_summary: Record<string, unknown> | null
  floor?: string | null
  dependencies?: string[] | null
  payer_type?: string | null
  heating_type?: string | null
  heating_system_type?: string | null
  heating_charges?: string | null
  dtg_audit_available?: string | null
}

const ALACARTE_LABEL: Record<string, string> = {
  dpe: 'DPE',
  erp: 'ERP (État des risques et pollutions)',
  surface: 'Mesurage (attestation de surface)',
  plomb: 'Plomb (CREP)',
  amiante: 'Amiante',
  elec: 'Électricité',
  gaz: 'Gaz',
  termites: 'Termites',
}

const PURPOSE_LABEL: Record<string, string> = { sale: 'Vente', rental: 'Location', alaCarte: 'Diagnostics à la carte' }
const PROPERTY_TYPE_LABEL: Record<string, string> = { apartment: 'Appartement', house: 'Maison' }
const DEPENDENCY_LABEL: Record<string, string> = { cave: 'Cave', garage: 'Garage', parking: 'Parking', autre: 'Autre' }
const DTG_LABEL: Record<string, string> = { oui: 'Oui', non: 'Non', inconnu: 'Ne sait pas' }

const labelsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (item && typeof item === 'object' ? String((item as Record<string, unknown>).label || '') : String(item || '')))
        .map((label) => label.trim())
        .filter(Boolean)
    : []

export type LeadQuoteContent = {
  eligible: boolean
  reason?: string
  quoteNumber: string
  propertyLabel: string
  propertySize: string | null
  diagnostics: string[]
  lines: ContractLine[]
  technicalInfo: string[]
  total: number
  proDiscount: boolean
  surfaceAttestationProvided: boolean
}

export function buildLeadQuote(lead: LeadRow): LeadQuoteContent {
  const summary = (lead.diagnostics_summary || {}) as Record<string, unknown>
  const created = new Date(lead.created_at)
  const ymd = Number.isNaN(created.getTime())
    ? new Date().toISOString().slice(0, 10).replaceAll('-', '')
    : created.toISOString().slice(0, 10).replaceAll('-', '')
  const quoteNumber = `EST-${ymd}-${lead.id.replaceAll('-', '').slice(0, 6).toUpperCase()}`

  const diagnostics: string[] = []
  const push = (label: string) => {
    if (label && !diagnostics.includes(label)) diagnostics.push(label)
  }

  if (lead.purpose === 'alaCarte') {
    if (Array.isArray(summary.checkedItems)) summary.checkedItems.forEach((id) => push(ALACARTE_LABEL[String(id)] || String(id)))
  } else {
    labelsOf(summary.mandatory).forEach(push)
    labelsOf(summary.addedToConfirm).forEach(push)
    labelsOf(summary.addedOptions).forEach(push)
  }
  if (summary.assainissement === true) push('Assainissement')

  const total = Number(lead.estimated_price)
  const priceStatus = String(summary.priceStatus || 'estimated')
  const propertyLabel = PROPERTY_TYPE_LABEL[lead.property_type] || 'Bien'
  const propertySize = typeof summary.sizeLabel === 'string' && summary.sizeLabel ? summary.sizeLabel : null
  const purposeLabel = PURPOSE_LABEL[lead.purpose] || lead.purpose

  const technicalInfo: string[] = [
    `Type de bien : ${propertyLabel}`,
    `Objet : ${purposeLabel}`,
  ]
  if (propertySize) technicalInfo.push(`Surface déclarée : ${propertySize}`)
  if (summary.constructionYear !== undefined && summary.constructionYear !== null && String(summary.constructionYear).trim()) {
    technicalInfo.push(`Année de construction déclarée : ${String(summary.constructionYear)}`)
  }
  if (lead.floor) technicalInfo.push(`Étage : ${lead.floor}`)
  if (Array.isArray(lead.dependencies) && lead.dependencies.length) {
    technicalInfo.push(`Dépendances : ${lead.dependencies.map((id) => DEPENDENCY_LABEL[id] || id).join(', ')}`)
  }
  if (typeof summary.hasGas === 'boolean') technicalInfo.push(`Installation gaz : ${summary.hasGas ? 'oui' : 'non'}`)
  if (lead.heating_type === 'collectif' || lead.heating_type === 'individuel') {
    technicalInfo.push(`Chauffage : ${lead.heating_type === 'collectif' ? 'collectif' : 'individuel'}`)
    if (lead.heating_type === 'collectif') {
      if (lead.heating_system_type) technicalInfo.push(`Type de chauffage collectif : ${lead.heating_system_type}`)
      if (lead.heating_charges) technicalInfo.push(`Charges de chauffage : ${lead.heating_charges}`)
      if (lead.dtg_audit_available && DTG_LABEL[lead.dtg_audit_available]) technicalInfo.push(`Audit / DTG disponible : ${DTG_LABEL[lead.dtg_audit_available]}`)
    }
  }
  technicalInfo.push('Informations déclarées par le donneur d’ordre, à confirmer lors de la visite.')

  const base = { surfaceAttestationProvided: summary.surfaceAttestationProvided === true, proDiscount: Boolean(lead.payer_type), quoteNumber, propertyLabel, propertySize, diagnostics, technicalInfo, total: Number.isFinite(total) ? total : 0 }

  if (priceStatus !== 'estimated' || !Number.isFinite(total) || total <= 0) {
    return { ...base, eligible: false, reason: 'Prix hors grille : devis personnalisé à établir par ARIA.', lines: [] }
  }
  if (!diagnostics.length) {
    return { ...base, eligible: false, reason: 'Aucun diagnostic identifié dans la demande.', lines: [] }
  }

  // Remise pro appliquée dès que le donneur d'ordre est un compte pro validé
  // (payer_type n'est renseigné que dans ce cas, voir app/assistant/page.tsx).
  const sizeSuffix = `${propertyLabel.toLowerCase()}${propertySize ? ` ${propertySize}` : ''}`
  const lineLabel = lead.purpose === 'alaCarte'
    ? `Diagnostics à la carte — ${sizeSuffix}`
    : `Pack diagnostics ${purposeLabel.toLowerCase()} — ${sizeSuffix}`

  return {
    ...base,
    eligible: true,
    lines: [{ label: lineLabel, quantity: 1, unit_ttc: total }],
  }
}
