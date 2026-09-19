import { APARTMENT_ASSAINISSEMENT_PRICE, HOUSE_ASSAINISSEMENT_PRICE } from './quote-assistant'
import { getCommuneCoverage } from './commune-rules'

export type Purpose = 'sale' | 'rental'
export type PropertyType = 'apartment' | 'house'

// countsTowardPack : false pour un item obligatoire qui ne doit PAS
// augmenter le nombre de diagnostics utilisé pour choisir le pack (ex.
// mesurage maison, dont le prix par tranche est déjà distinct du prix de
// pack). Par défaut (undefined), un item obligatoire compte dans le pack.
export type DiagnosticItem = { id: string; label: string; detail: string; countsTowardPack?: boolean }
export type PricedOptionId = 'measurement'
export type PricedOption = { id: PricedOptionId; label: string }

export type DiagnosticsResult = {
  mandatory: DiagnosticItem[]
  toConfirm: DiagnosticItem[]
  options: PricedOption[]
  // Message affiché quand le client a déjà une attestation de surface
  // (Carrez / Boutin / surface habitable selon le cas) : le diagnostic de
  // mesurage correspondant n'est alors ni obligatoire ni facturé.
  surfaceAttestationNote: string | null
}

// Seuils électricité/gaz (installation de plus de 15 ans, approximée depuis
// l'année de construction) et plomb (< 1949) repris tels quels de la règle
// déjà codée dans app/dossiers/nouveau/page.tsx (constructionYearAlerts).
// Le reste (DPE/ERP systématiques, amiante vente, termites/assainissement à
// confirmer, Carrez/Boutin/DAPP) est la règle demandée pour ce parcours
// public, appliquée ici à l'identique de ce qui a été spécifié — rien
// d'autre n'est déduit ou approximé au-delà de ce qui est listé.
export const computeDiagnostics = ({
  purpose,
  propertyType,
  constructionYear,
  communeSlug,
  hasSurfaceAttestation,
}: {
  purpose: Purpose
  propertyType: PropertyType
  constructionYear: number
  communeSlug: string | null
  hasSurfaceAttestation: boolean
}): DiagnosticsResult => {
  const age = new Date().getFullYear() - constructionYear
  const isOldInstallation = age >= 15
  const isBefore1949 = constructionYear < 1949
  const isBefore1997 = constructionYear < 1997

  const mandatory: DiagnosticItem[] = [
    { id: 'dpe', label: 'DPE', detail: 'Diagnostic de performance énergétique, obligatoire pour toute vente ou location.' },
    { id: 'erp', label: 'ERP', detail: 'État des risques et pollutions, obligatoire pour toute vente ou location.' },
  ]
  if (isOldInstallation) {
    mandatory.push({ id: 'elec', label: 'Électricité', detail: 'Installation électrique de plus de 15 ans (approximé depuis l’année de construction, une rénovation récente peut changer la donne).' })
    mandatory.push({ id: 'gaz', label: 'Gaz', detail: 'Installation gaz de plus de 15 ans (approximé depuis l’année de construction, une rénovation récente peut changer la donne).' })
  }
  if (isBefore1949) {
    mandatory.push({ id: 'plomb', label: 'Plomb (CREP)', detail: 'Bien construit avant 1949.' })
  }

  const toConfirm: DiagnosticItem[] = []
  const options: PricedOption[] = []
  let surfaceAttestationNote: string | null = null
  // Le DPE a besoin d'une surface pour être calculé : si le client a déjà
  // une attestation de surface (Carrez / Boutin / surface habitable selon
  // le cas), le diagnostic de mesurage correspondant n'est ni obligatoire
  // ni facturé — sinon il redevient obligatoire, comme avant cette règle.
  const SURFACE_ATTESTATION_NOTE = 'Vous devrez nous transmettre cette attestation avant notre intervention.'

  if (purpose === 'sale') {
    if (isBefore1997) {
      mandatory.push({ id: 'amiante', label: 'Amiante', detail: 'Bien construit avant 1997.' })
    }

    // Termites : jamais en location (branche purpose === 'sale' uniquement).
    // La couverture de la commune (lib/commune-rules.ts) détermine si le
    // diagnostic est obligatoire (compte dans le pack), à confirmer selon la
    // zone exacte, ou simplement à vérifier auprès de la mairie.
    const communeCoverage = getCommuneCoverage(communeSlug)
    if (communeCoverage === 'entiere') {
      mandatory.push({ id: 'termites', label: 'Termites', detail: 'Obligatoire pour une vente dans votre commune (arrêté préfectoral).' })
    } else if (communeCoverage === 'partielle') {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'Seule une partie de votre commune est classée en zone termitée (arrêté préfectoral) : obligatoire si votre bien se trouve dans cette zone. Nous le vérifions avec votre adresse.' })
    } else if (communeCoverage === 'aucun') {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'Pas d’arrêté préfectoral recensé dans votre commune : en principe non obligatoire pour une vente. Un contrôle reste possible sur demande.' })
    } else {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'À vérifier auprès de votre mairie.' })
    }

    const assainissementPrice = propertyType === 'apartment' ? APARTMENT_ASSAINISSEMENT_PRICE : HOUSE_ASSAINISSEMENT_PRICE
    // Alfortville et Maisons-Alfort ont un traitement particulier pour
    // l'assainissement (respectivement réalisé par ARIA, et réservé au
    // service public) ; toute autre commune garde le texte générique.
    const assainissementDetail = communeSlug === 'alfortville'
      ? `Contrôle du raccordement au réseau d’eaux usées, réalisé par ARIA Diagnostics : + ${assainissementPrice} €.`
      : communeSlug === 'maisons-alfort'
        ? 'Contrôle du raccordement au réseau d’eaux usées, réalisé par le service public dans votre commune (pas de prix chez ARIA).'
        : `Contrôle du raccordement au réseau d’eaux usées. Dans certaines communes, il est réservé au service public : à vérifier auprès de votre mairie. Si nous le réalisons : + ${assainissementPrice} €`
    toConfirm.push({ id: 'assainissement', label: 'Assainissement', detail: assainissementDetail })
    if (propertyType === 'apartment') {
      // Mesurage loi Carrez : obligatoire pour une vente d'appartement (et
      // compte dans le pack) sauf si le client a déjà une attestation de
      // surface Carrez.
      if (hasSurfaceAttestation) {
        surfaceAttestationNote = SURFACE_ATTESTATION_NOTE
      } else {
        mandatory.push({ id: 'carrez', label: 'Mesurage loi Carrez', detail: 'Surface privative à mentionner dans l’acte de vente d’un lot de copropriété.' })
      }
    } else {
      // Mesurage (surface habitable) pour une maison : obligatoire (mais ne
      // compte pas dans le pack, tarifé par tranche) sauf si le client a
      // déjà une attestation de surface habitable.
      if (hasSurfaceAttestation) {
        surfaceAttestationNote = SURFACE_ATTESTATION_NOTE
      } else {
        mandatory.push({ id: 'measurement', label: 'Mesurage (surface habitable)', detail: 'Mesure de la surface habitable, nécessaire notamment pour le DPE.', countsTowardPack: false })
      }
    }
  } else {
    if (propertyType === 'apartment') {
      // Mesurage loi Boutin : obligatoire (et compte dans le pack) pour tout
      // appartement en location, sauf si le client a déjà une attestation
      // de surface Boutin.
      if (hasSurfaceAttestation) {
        surfaceAttestationNote = SURFACE_ATTESTATION_NOTE
      } else {
        mandatory.push({ id: 'boutin', label: 'Mesurage loi Boutin', detail: 'Surface habitable à mentionner dans le bail.' })
      }
      // DAPP : obligatoire (et compte dans le pack) pour tout appartement
      // construit avant 1997, en location, indépendamment de l'attestation
      // de surface. Jamais pour une maison, jamais pour un bien construit
      // en 1997 ou après.
      if (isBefore1997) {
        mandatory.push({ id: 'dapp', label: 'DAPP', detail: 'Dossier amiante parties privatives, pour un appartement construit avant 1997.' })
      }
    } else {
      // Mesurage (surface habitable) pour une maison en location : même
      // règle que pour une vente.
      if (hasSurfaceAttestation) {
        surfaceAttestationNote = SURFACE_ATTESTATION_NOTE
      } else {
        mandatory.push({ id: 'measurement', label: 'Mesurage (surface habitable)', detail: 'Mesure de la surface habitable, nécessaire notamment pour le DPE.', countsTowardPack: false })
      }
    }
  }

  return { mandatory, toConfirm, options, surfaceAttestationNote }
}
