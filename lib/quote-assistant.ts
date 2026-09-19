export type QuotePropertyType = 'apartment' | 'house'

// Seule source de vérité pour les tranches de surface maison : app/devis/page.tsx
// dérive son houseLabels de ce tableau plutôt que de dupliquer les bornes,
// pour que la grille tarifaire et la suggestion IA ne puissent plus diverger.
// La dernière tranche (maxSurface: null) correspond à "> 250 m²", sans prix
// calculé — évaluation personnalisée requise.
// measurementPrice : prix du mesurage maison (surface habitable) par tranche,
// à lire depuis cette même source plutôt que dupliqué dans une seconde grille.
export const HOUSE_SIZE_TIERS: { label: string; maxSurface: number | null; measurementPrice: number | null }[] = [
  { label: '≤ 70 m²', maxSurface: 70, measurementPrice: 90 },
  { label: '71–100 m²', maxSurface: 100, measurementPrice: 120 },
  { label: '101–130 m²', maxSurface: 130, measurementPrice: 150 },
  { label: '131–160 m²', maxSurface: 160, measurementPrice: 180 },
  { label: '161–200 m²', maxSurface: 200, measurementPrice: 210 },
  { label: '201–250 m²', maxSurface: 250, measurementPrice: 240 },
  { label: '> 250 m²', maxSurface: null, measurementPrice: null },
]

// Prix de l'option assainissement, seule source de vérité pour app/devis
// (Devis Express) et pour l'assistant public (/assistant) — aucune des
// deux pages ne doit garder sa propre valeur codée en dur.
export const APARTMENT_ASSAINISSEMENT_PRICE = 100
export const HOUSE_ASSAINISSEMENT_PRICE = 180

const houseSizeKeyFromSurface = (surface: number) => {
  const index = HOUSE_SIZE_TIERS.findIndex(tier => tier.maxSurface === null || surface <= tier.maxSurface)
  return String(index === -1 ? HOUSE_SIZE_TIERS.length - 1 : index)
}

export type QuoteAssistantDossier = {
  purpose?: string | null
  diagnostics?: string[] | string | null
  property_address?: string | null
  property_type?: string | null
  property_size?: string | number | null
  surface?: string | number | null
  rooms?: string | number | null
  dependencies?: string | null
}

export type QuoteSuggestion = {
  propertyType: QuotePropertyType
  sizeKey: string
  packCount: number
  boutin: boolean
  assainissement: boolean
  proximity: boolean
  // Mission minimale : la checklist ne contient que "DPE" (l'ERP, s'il est
  // coché en plus, n'entre pas dans ce calcul — voir lib/property-alerts.ts).
  // packCount garde une valeur de repli (2) mais n'est pas utilisé pour le
  // prix dans ce cas : /devis calcule via la grille "DPE seul".
  missionMinimale: boolean
  diagnostics: string[]
  reasons: string[]
  warnings: string[]
}

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '')

export const splitDiagnostics = (raw: QuoteAssistantDossier['diagnostics']) => {
  if (Array.isArray(raw)) return raw.map(String).map(value => value.trim()).filter(Boolean)
  if (!raw) return []
  return String(raw).split(/[,;|\n]+/).map(value => value.trim()).filter(Boolean)
}

const parseNumber = (raw: unknown) => {
  const match = String(raw ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const inferPropertyType = (dossier: QuoteAssistantDossier): QuotePropertyType | null => {
  const raw = normalize(String(dossier.property_type ?? ''))
  if (raw.includes('maison') || raw.includes('house') || raw.includes('pavillon')) return 'house'
  if (raw.includes('appartement') || raw.includes('apartment') || raw.includes('studio')) return 'apartment'
  return null
}

const inferSizeKey = (dossier: QuoteAssistantDossier, propertyType: QuotePropertyType) => {
  const rawSize = String(dossier.property_size ?? '')
  const roomMatch = rawSize.match(/T\s*([1-5])/i)
  if (propertyType === 'apartment' && roomMatch) return String(Number(roomMatch[1]) - 1)

  const rooms = parseNumber(dossier.rooms)
  if (propertyType === 'apartment' && rooms) return String(Math.max(0, Math.min(4, Math.round(rooms) - 1)))

  const surface = parseNumber(dossier.surface ?? dossier.property_size)
  if (propertyType === 'house' && surface !== null) return houseSizeKeyFromSurface(surface)

  return null
}

export const buildQuoteSuggestion = (dossier: QuoteAssistantDossier): QuoteSuggestion => {
  const diagnostics = splitDiagnostics(dossier.diagnostics)
  const normalizedDiagnostics = diagnostics.map(normalize)
  const propertyType = inferPropertyType(dossier) ?? 'apartment'
  const sizeKey = inferSizeKey(dossier, propertyType) ?? '0'
  const hasBoutin = normalizedDiagnostics.some(value => value.includes('boutin'))
  // Règle tarifaire ARIA : la Boutin est comprise dans le pack appartement.
  // Elle ne devient une option facturable que pour une maison.
  const boutin = propertyType === 'house' && hasBoutin
  const assainissement = normalizedDiagnostics.some(value => value.includes('assain'))
  const pricedDiagnostics = normalizedDiagnostics.filter(value => {
    if (value.includes('assain')) return false
    if (propertyType === 'house' && value.includes('boutin')) return false
    return true
  })
  const maxPack = propertyType === 'house' ? 6 : 7
  // Mission minimale : la checklist ne contient réellement que le DPE, une
  // fois l'ERP écarté (il n'entre jamais dans ce calcul de seuil, comme sur
  // /assistant). Dans ce cas on ne plafonne pas à 2 : packCount garde une
  // valeur de repli, /devis bascule sur la grille "DPE seul".
  const realDiagnostics = pricedDiagnostics.filter(value => value !== 'erp')
  const missionMinimale = realDiagnostics.length === 1 && realDiagnostics[0] === 'dpe'
  const packCount = missionMinimale ? 2 : Math.max(2, Math.min(maxPack, pricedDiagnostics.length || 2))
  const address = normalize(String(dossier.property_address ?? ''))
  const proximity = address.includes('94140') || address.includes('94700') || address.includes('alfortville') || address.includes('maisonsalfort')
  const reasons: string[] = []
  const warnings: string[] = []

  if (diagnostics.length) reasons.push(`${diagnostics.length} mission(s) détectée(s) dans le dossier`)
  if (missionMinimale) reasons.push('Mission minimale détectée : DPE seul (le nombre de diagnostics n’est pas plafonné à 2)')
  if (boutin) reasons.push('Option Loi Boutin détectée pour la maison')
  if (propertyType === 'apartment' && hasBoutin) reasons.push('Loi Boutin comprise dans le pack appartement')
  if (assainissement) reasons.push('Option assainissement détectée')
  if (proximity) reasons.push('Adresse éligible à la remise proximité')
  if (dossier.dependencies?.trim()) reasons.push('Dépendances signalées : vérifier le périmètre et le prix')

  if (!diagnostics.length) warnings.push('Aucun diagnostic n’est renseigné : vérifier le nombre de missions.')
  if (!inferPropertyType(dossier)) warnings.push('Type de bien absent : Appartement a été proposé par défaut.')
  if (!inferSizeKey(dossier, propertyType)) warnings.push(propertyType === 'house' ? `Surface absente : la tranche ${HOUSE_SIZE_TIERS[0].label} a été proposée.` : 'Typologie absente : T1 a été proposé.')
  if (propertyType === 'house' && sizeKey === String(HOUSE_SIZE_TIERS.length - 1)) warnings.push('Surface supérieure à 250 m² : aucun prix de pack ne s’applique, une évaluation personnalisée est nécessaire.')
  if (dossier.dependencies?.trim()) warnings.push('Les dépendances peuvent nécessiter une ligne ou une majoration manuelle.')

  return { propertyType, sizeKey, packCount, boutin, assainissement, proximity, missionMinimale, diagnostics, reasons, warnings }
}
