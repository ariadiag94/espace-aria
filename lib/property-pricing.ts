import { HOUSE_SIZE_TIERS } from './quote-assistant'

// Grilles tarifaires reprises à l'identique de app/devis/page.tsx (non modifié
// ici, ce fichier existant reste la référence) pour que app/assistant/page.tsx
// affiche exactement les mêmes tarifs que l'outil interne. HOUSE_SIZE_TIERS
// vient de lib/quote-assistant.ts, seule source de vérité pour les tranches
// de surface maison.
export const APARTMENT_SIZE_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5']
export const HOUSE_SIZE_LABELS = HOUSE_SIZE_TIERS.map((tier) => tier.label)
export const HOUSE_QUOTE_ON_REQUEST_INDEX = HOUSE_SIZE_LABELS.length - 1

export const APARTMENT_PACK_PRICES: Record<number, number[]> = {
  2: [150, 170, 190, 210, 230],
  3: [180, 200, 220, 240, 260],
  4: [210, 230, 250, 270, 290],
  5: [240, 260, 280, 300, 320],
  6: [270, 290, 310, 330, 350],
  7: [290, 310, 325, 360, 380],
}

export const HOUSE_PACK_PRICES: Record<number, number[]> = {
  2: [200, 230, 260, 290, 330, 380],
  3: [240, 270, 300, 330, 370, 420],
  4: [280, 310, 340, 370, 410, 460],
  5: [320, 350, 380, 410, 450, 500],
  6: [350, 380, 410, 440, 480, 530],
}

export type PackPropertyType = 'apartment' | 'house'
export type PackPurpose = 'sale' | 'rental'

// Remise de 10 % sur le prix du pack de diagnostics en location, par rapport
// au même pack en vente (nombre de diagnostics et tranche de taille
// identiques), arrondie à l'euro le plus proche. Ne s'applique qu'au prix du
// pack : les options (mesurage, assainissement, DAPP...) gardent leur prix
// actuel quel que soit l'objet. Source unique lue par /assistant et /devis,
// pour que le prix en location ne puisse pas diverger entre les deux pages.
export const RENTAL_PACK_DISCOUNT_RATE = 0.10

export const getPackPrice = (
  propertyType: PackPropertyType,
  packCount: number,
  sizeIndex: number,
  purpose: PackPurpose
): number | null => {
  const table = propertyType === 'apartment' ? APARTMENT_PACK_PRICES : HOUSE_PACK_PRICES
  const salePrice = table[packCount]?.[sizeIndex]
  if (salePrice === undefined) return null
  return purpose === 'rental' ? Math.round(salePrice * (1 - RENTAL_PACK_DISCOUNT_RATE)) : salePrice
}

// Prix de l'option "mesurage (surface habitable)" maison, lu depuis
// HOUSE_SIZE_TIERS (lib/quote-assistant.ts) — seule source de vérité, pour
// vente comme pour location. `null` correspond à ">250 m²" (sur devis, déjà
// couvert par le seuil HOUSE_QUOTE_ON_REQUEST_INDEX qui masque les options).
// Aucun prix équivalent n'existe pour l'appartement dans le moteur existant
// (la Boutin y est comprise dans le pack) : sans entrée ici, l'option
// s'affiche "selon devis" côté page.
export const HOUSE_MEASUREMENT_PRICES = HOUSE_SIZE_TIERS.map((tier) => tier.measurementPrice)

// Prix de l'ERP quand il n'est pas inclus automatiquement dans un pack :
// uniquement pour une "mission minimale" (DPE seul, attestation de surface
// déjà fournie — 1 seul diagnostic facturé). Dès qu'un 2e diagnostic
// s'ajoute (pack complet, ou DPE + diagnostic de surface), l'ERP est inclus
// automatiquement et gratuitement — ce prix ne s'applique plus.
export const ERP_OPTION_PRICE = 25

// Grille "DPE seul" (mission minimale, 1 seul diagnostic facturé, attestation
// de surface déjà fournie par le client) : nouveau palier tarifaire, distinct
// de APARTMENT_PACK_PRICES/HOUSE_PACK_PRICES qui commencent à 2 diagnostics.
// `null` (maison, >250 m²) = sur devis, déjà couvert par
// HOUSE_QUOTE_ON_REQUEST_INDEX.
export const APARTMENT_DPE_ONLY_PRICES: number[] = [110, 130, 150, 170, 190]
export const HOUSE_DPE_ONLY_PRICES: (number | null)[] = [150, 180, 210, 240, 270, 300, null]

// Grilles unitaires du mode "Diagnostics à la carte" : prix d'un seul
// diagnostic choisi librement, hors DPE (déjà couvert par
// APARTMENT_DPE_ONLY_PRICES/HOUSE_DPE_ONLY_PRICES ci-dessus) et hors ERP
// (déjà couvert par ERP_OPTION_PRICE, prix fixe quelle que soit la taille).
// "surface" = Carrez/Boutin pour un appartement, Boutin/Mesurage pour une
// maison : un seul item, un seul prix, quel que soit l'objet (vente ou
// location), puisque ce mode n'a pas de notion d'objet.
export const APARTMENT_CARREZ_BOUTIN_UNIT_PRICES: number[] = [90, 100, 110, 120, 130]
export const APARTMENT_PLOMB_UNIT_PRICES: number[] = [120, 130, 150, 170, 190]
export const APARTMENT_AMIANTE_UNIT_PRICES: number[] = [90, 100, 120, 130, 140]
export const APARTMENT_ELEC_UNIT_PRICES: number[] = [90, 100, 120, 130, 140]
export const APARTMENT_GAZ_UNIT_PRICES: number[] = [90, 100, 120, 130, 140]
export const APARTMENT_TERMITES_UNIT_PRICES: number[] = [100, 110, 120, 140, 160]

export const HOUSE_BOUTIN_MESURAGE_UNIT_PRICES: (number | null)[] = [120, 150, 180, 210, 240, 270, null]
export const HOUSE_PLOMB_UNIT_PRICES: (number | null)[] = [150, 180, 210, 240, 270, 300, null]
export const HOUSE_AMIANTE_UNIT_PRICES: (number | null)[] = [120, 150, 180, 210, 240, 270, null]
export const HOUSE_ELEC_UNIT_PRICES: (number | null)[] = [120, 150, 180, 210, 240, 270, null]
export const HOUSE_GAZ_UNIT_PRICES: (number | null)[] = [120, 150, 180, 210, 240, 270, null]
export const HOUSE_TERMITES_UNIT_PRICES: (number | null)[] = [130, 160, 190, 220, 250, 280, null]

// Identifiants des 8 diagnostics sélectionnables en mode "à la carte", dans
// l'ordre d'affichage. L'assainissement n'en fait jamais partie (reste un
// item à part, jamais compté dans ce calcul).
export type ALaCarteItemId = 'dpe' | 'erp' | 'surface' | 'plomb' | 'amiante' | 'elec' | 'gaz' | 'termites'
export const ALACARTE_ITEM_IDS: ALaCarteItemId[] = ['dpe', 'erp', 'surface', 'plomb', 'amiante', 'elec', 'gaz', 'termites']

const ALACARTE_UNIT_TABLES: Record<PackPropertyType, Record<Exclude<ALaCarteItemId, 'dpe' | 'erp'>, (number | null)[]>> = {
  apartment: {
    surface: APARTMENT_CARREZ_BOUTIN_UNIT_PRICES,
    plomb: APARTMENT_PLOMB_UNIT_PRICES,
    amiante: APARTMENT_AMIANTE_UNIT_PRICES,
    elec: APARTMENT_ELEC_UNIT_PRICES,
    gaz: APARTMENT_GAZ_UNIT_PRICES,
    termites: APARTMENT_TERMITES_UNIT_PRICES,
  },
  house: {
    surface: HOUSE_BOUTIN_MESURAGE_UNIT_PRICES,
    plomb: HOUSE_PLOMB_UNIT_PRICES,
    amiante: HOUSE_AMIANTE_UNIT_PRICES,
    elec: HOUSE_ELEC_UNIT_PRICES,
    gaz: HOUSE_GAZ_UNIT_PRICES,
    termites: HOUSE_TERMITES_UNIT_PRICES,
  },
}

// Prix d'un seul diagnostic (mode "à la carte", 1 seul item coché).
export const getALaCarteUnitPrice = (
  propertyType: PackPropertyType,
  itemId: ALaCarteItemId,
  sizeIndex: number
): number | null => {
  if (itemId === 'erp') return ERP_OPTION_PRICE
  if (itemId === 'dpe') {
    const table = propertyType === 'apartment' ? APARTMENT_DPE_ONLY_PRICES : HOUSE_DPE_ONLY_PRICES
    return table[sizeIndex] ?? null
  }
  return ALACARTE_UNIT_TABLES[propertyType][itemId]?.[sizeIndex] ?? null
}

// Prix du mode "à la carte" pour un ensemble de diagnostics cochés : 1 seul
// coché -> prix unitaire ci-dessus ; 2 ou plus (jusqu'au maximum du pack, 7
// pour un appartement, 6 pour une maison) -> prix du pack existant
// correspondant au nombre coché, peu importe lesquels ; au-delà du maximum,
// ou 0 coché -> `null` (l'appelant affiche "devis personnalisé" ou rien).
export const getALaCartePrice = (
  propertyType: PackPropertyType,
  checkedIds: ALaCarteItemId[],
  sizeIndex: number
): number | null => {
  const count = checkedIds.length
  if (count === 0) return null
  if (count === 1) return getALaCarteUnitPrice(propertyType, checkedIds[0], sizeIndex)
  const maxPack = propertyType === 'apartment' ? 7 : 6
  if (count > maxPack) return null
  const table = propertyType === 'apartment' ? APARTMENT_PACK_PRICES : HOUSE_PACK_PRICES
  return table[count]?.[sizeIndex] ?? null
}
