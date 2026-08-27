export type QuotePropertyType = 'apartment' | 'house'

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
  diagnostics: string[]
  reasons: string[]
  warnings: string[]
}

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '')

const splitDiagnostics = (raw: QuoteAssistantDossier['diagnostics']) => {
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
  if (propertyType === 'house' && surface !== null) {
    if (surface <= 70) return '0'
    if (surface <= 100) return '1'
    if (surface <= 120) return '2'
    if (surface <= 150) return '3'
    return '4'
  }

  return null
}

export const buildQuoteSuggestion = (dossier: QuoteAssistantDossier): QuoteSuggestion => {
  const diagnostics = splitDiagnostics(dossier.diagnostics)
  const normalizedDiagnostics = diagnostics.map(normalize)
  const propertyType = inferPropertyType(dossier) ?? 'apartment'
  const sizeKey = inferSizeKey(dossier, propertyType) ?? '0'
  const boutin = normalizedDiagnostics.some(value => value.includes('boutin'))
  const assainissement = normalizedDiagnostics.some(value => value.includes('assain'))
  const pricedDiagnostics = normalizedDiagnostics.filter(value => !value.includes('boutin') && !value.includes('assain'))
  const maxPack = propertyType === 'house' ? 6 : 7
  const packCount = Math.max(2, Math.min(maxPack, pricedDiagnostics.length || 2))
  const address = normalize(String(dossier.property_address ?? ''))
  const proximity = address.includes('94140') || address.includes('94700') || address.includes('alfortville') || address.includes('maisonsalfort')
  const reasons: string[] = []
  const warnings: string[] = []

  if (diagnostics.length) reasons.push(`${diagnostics.length} mission(s) détectée(s) dans le dossier`)
  if (boutin) reasons.push('Option Loi Boutin détectée')
  if (assainissement) reasons.push('Option assainissement détectée')
  if (proximity) reasons.push('Adresse éligible à la remise proximité')
  if (dossier.dependencies?.trim()) reasons.push('Dépendances signalées : vérifier le périmètre et le prix')

  if (!diagnostics.length) warnings.push('Aucun diagnostic n’est renseigné : vérifier le nombre de missions.')
  if (!inferPropertyType(dossier)) warnings.push('Type de bien absent : Appartement a été proposé par défaut.')
  if (!inferSizeKey(dossier, propertyType)) warnings.push(propertyType === 'house' ? 'Surface absente : la tranche ≤ 70 m² a été proposée.' : 'Typologie absente : T1 a été proposé.')
  if (dossier.dependencies?.trim()) warnings.push('Les dépendances peuvent nécessiter une ligne ou une majoration manuelle.')

  return { propertyType, sizeKey, packCount, boutin, assainissement, proximity, diagnostics, reasons, warnings }
}
