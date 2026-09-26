import { APARTMENT_ASSAINISSEMENT_PRICE, HOUSE_ASSAINISSEMENT_PRICE } from './quote-assistant'
import { getCommuneCoverage } from './commune-rules'

export type Purpose = 'sale' | 'rental'
export type PropertyType = 'apartment' | 'house'

// countsTowardPack : false pour un item obligatoire qui ne doit PAS
// augmenter le nombre de diagnostics utilisé pour choisir le pack (ex. ERP
// offert en mission minimale + attestation "Non", dont le prix vient de la
// réutilisation directe du pack 2, pas d'un 3e diagnostic compté). Par
// défaut (undefined), un item obligatoire compte dans le pack.
export type DiagnosticItem = { id: string; label: string; detail: string; countsTowardPack?: boolean }
export type PricedOptionId = 'measurement' | 'erp'
export type PricedOption = { id: PricedOptionId; label: string }

export type DiagnosticsResult = {
  mandatory: DiagnosticItem[]
  toConfirm: DiagnosticItem[]
  options: PricedOption[]
  // Message affiché quand le client a déjà une attestation de surface
  // (Carrez / Boutin / surface habitable selon le cas) : le diagnostic de
  // mesurage correspondant n'est alors ni obligatoire ni facturé.
  surfaceAttestationNote: string | null
  // "Mission minimale" : le seul diagnostic obligatoire réel est le DPE
  // (aucun électricité/gaz/plomb/amiante/termites-entière/DAPP). L'ERP et le
  // diagnostic de surface suivent alors une règle différente du pack complet
  // (voir plus bas) ; exposé pour que les pages n'aient pas à redupliquer ce
  // seuil.
  isMinimalMission: boolean
}

// Texte de l'item assainissement, partagé par le moteur guidé (vente) et par
// le mode "Diagnostics à la carte" (où l'assainissement reste affiché mais
// hors du calcul de prix) : Alfortville et Maisons-Alfort ont un traitement
// particulier (respectivement réalisé par ARIA, et réservé au service
// public) ; toute autre commune garde le texte générique.
export const buildAssainissementDetail = (propertyType: PropertyType, communeSlug: string | null): string => {
  const assainissementPrice = propertyType === 'apartment' ? APARTMENT_ASSAINISSEMENT_PRICE : HOUSE_ASSAINISSEMENT_PRICE
  return communeSlug === 'alfortville'
    ? `Contrôle du raccordement au réseau d’eaux usées, réalisé par ARIA Diagnostics : + ${assainissementPrice} €.`
    : communeSlug === 'maisons-alfort'
      ? 'Contrôle du raccordement au réseau d’eaux usées, réalisé par le service public dans votre commune (pas de prix chez ARIA).'
      : `Contrôle du raccordement au réseau d’eaux usées. Dans certaines communes, il est réservé au service public : à vérifier auprès de votre mairie. Si nous le réalisons : + ${assainissementPrice} €`
}

// Seuil électricité (installation de plus de 15 ans, approximée depuis
// l'année de construction) et plomb (< 1949) repris tels quels de la règle
// déjà codée dans app/dossiers/nouveau/page.tsx (constructionYearAlerts).
// Gaz applique le même seuil d'âge, mais uniquement si le client a confirmé
// avoir une installation gaz (hasGas) — contrairement à l'électricité,
// présente sur tout logement, une installation gaz peut ne pas exister du
// tout, donc jamais déduite de l'âge seul (2026-09-26).
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
  hasGas,
}: {
  purpose: Purpose
  propertyType: PropertyType
  constructionYear: number
  communeSlug: string | null
  hasSurfaceAttestation: boolean
  // Gaz : obligatoire seulement si le bien a réellement une installation gaz
  // ET qu'elle a plus de 15 ans — contrairement à Électricité, qui reste basé
  // sur l'âge seul (toute installation électrique en a une, pas toute
  // installation gaz). Répondu par une question dédiée dans /assistant.
  hasGas: boolean
}): DiagnosticsResult => {
  const age = new Date().getFullYear() - constructionYear
  const isOldInstallation = age >= 15
  const isBefore1949 = constructionYear < 1949
  const isBefore1997 = constructionYear < 1997

  const toConfirm: DiagnosticItem[] = []
  const options: PricedOption[] = []
  let surfaceAttestationNote: string | null = null
  // Le DPE a besoin d'une surface pour être calculé : si le client a déjà
  // une attestation de surface (Carrez / Boutin / surface habitable selon
  // le cas), le diagnostic de mesurage correspondant n'est ni obligatoire
  // ni facturé — sinon il redevient obligatoire.
  const SURFACE_ATTESTATION_NOTE = 'Vous devrez nous transmettre cette attestation avant notre intervention.'

  // Termites : jamais en location (uniquement calculé pour purpose==='sale').
  // La couverture de la commune (lib/commune-rules.ts) détermine si le
  // diagnostic est obligatoire (compte dans le pack et dans le seuil
  // "mission minimale"), à confirmer selon la zone exacte, ou simplement à
  // vérifier auprès de la mairie.
  const communeCoverage = purpose === 'sale' ? getCommuneCoverage(communeSlug) : null
  const termitesMandatory = purpose === 'sale' && communeCoverage === 'entiere'
  // DAPP : uniquement pour un appartement en location construit avant 1997,
  // indépendamment de l'attestation de surface. Jamais pour une maison,
  // jamais pour un bien construit en 1997 ou après, jamais en vente.
  const dappMandatory = purpose === 'rental' && propertyType === 'apartment' && isBefore1997
  const amianteMandatory = purpose === 'sale' && isBefore1997

  // "Mission minimale" = le seul diagnostic obligatoire réel est le DPE :
  // aucun électricité/gaz, plomb, amiante, termites (commune "entière") ni
  // DAPP. L'ERP n'entre jamais dans ce calcul de seuil (voir règle ERP plus
  // bas) ; le diagnostic de surface (Carrez/Boutin/Mesurage) non plus, sa
  // propre règle dépend du résultat de ce seuil.
  const isMinimalMission = !isOldInstallation && !isBefore1949 && !amianteMandatory && !termitesMandatory && !dappMandatory

  // Libellé/détail du diagnostic de surface selon le type de bien et l'objet,
  // partagés par les deux branches ("mission minimale" et "pack complet")
  // ci-dessous pour ne pas dupliquer les textes.
  const surfaceItem = propertyType === 'apartment'
    ? (purpose === 'sale'
        ? { id: 'carrez', label: 'Mesurage loi Carrez', detail: 'Surface privative à mentionner dans l’acte de vente d’un lot de copropriété.' }
        : { id: 'boutin', label: 'Mesurage loi Boutin', detail: 'Surface habitable à mentionner dans le bail.' })
    : { id: 'measurement', label: 'Mesurage (surface habitable)', detail: 'Mesure de la surface habitable, nécessaire notamment pour le DPE.' }

  // Règle ERP : en mission minimale, si le client a déjà une attestation de
  // surface, le seul diagnostic facturé est le DPE (1) — l'ERP devient une
  // option à cocher (+25 €), non incluse par défaut. Dans tous les autres
  // cas (mission minimale + pas d'attestation → DPE + surface = 2 ; ou pack
  // complet), l'ERP est inclus automatiquement et gratuitement, mais reste
  // une ligne visible du récapitulatif ("25 € offert").
  const erpIncludedFree = !(isMinimalMission && hasSurfaceAttestation)

  const mandatory: DiagnosticItem[] = [
    { id: 'dpe', label: 'DPE', detail: 'Diagnostic de performance énergétique, obligatoire pour toute vente ou location.' },
  ]
  if (erpIncludedFree) {
    // countsTowardPack: false uniquement en mission minimale + "Non" (le
    // prix réutilise directement le pack 2 existant : DPE + surface = 2,
    // l'ERP ne doit pas pousser ce compte à 3). En pack complet, l'ERP
    // compte dans le pack comme avant cette règle.
    mandatory.push({ id: 'erp', label: 'ERP', detail: 'État des risques et pollutions — 25 € offert, inclus automatiquement.', countsTowardPack: isMinimalMission ? false : undefined })
  } else {
    options.push({ id: 'erp', label: 'ERP (état des risques et pollutions)' })
  }
  if (isOldInstallation) {
    mandatory.push({ id: 'elec', label: 'Électricité', detail: 'Installation électrique de plus de 15 ans (approximé depuis l’année de construction, une rénovation récente peut changer la donne).' })
  }
  // Gaz : contrairement à l'électricité (présente sur tout logement), le gaz
  // dépend de la présence réelle d'une installation — déclarée par le client,
  // pas déduite de l'année seule. Obligatoire seulement si les deux
  // conditions sont réunies.
  if (isOldInstallation && hasGas) {
    mandatory.push({ id: 'gaz', label: 'Gaz', detail: 'Installation gaz de plus de 15 ans (approximé depuis l’année de construction, une rénovation récente peut changer la donne).' })
  }
  if (isBefore1949) {
    mandatory.push({ id: 'plomb', label: 'Plomb (CREP)', detail: 'Bien construit avant 1949.' })
  }

  if (purpose === 'sale') {
    if (amianteMandatory) {
      mandatory.push({ id: 'amiante', label: 'Amiante', detail: 'Bien construit avant 1997.' })
    }

    if (communeCoverage === 'entiere') {
      mandatory.push({ id: 'termites', label: 'Termites', detail: 'Obligatoire pour une vente dans votre commune (arrêté préfectoral).' })
    } else if (communeCoverage === 'partielle') {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'Seule une partie de votre commune est classée en zone termitée (arrêté préfectoral) : obligatoire si votre bien se trouve dans cette zone. Nous le vérifions avec votre adresse.' })
    } else if (communeCoverage === 'aucun') {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'Pas d’arrêté préfectoral recensé dans votre commune : en principe non obligatoire pour une vente. Un contrôle reste possible sur demande.' })
    } else {
      toConfirm.push({ id: 'termites', label: 'Termites', detail: 'À vérifier auprès de votre mairie.' })
    }

    toConfirm.push({ id: 'assainissement', label: 'Assainissement', detail: buildAssainissementDetail(propertyType, communeSlug) })
  }

  // Diagnostic de surface (Carrez / Boutin / Mesurage) :
  // - Mission minimale : question posée (portée par hasSurfaceAttestation,
  //   déjà répondue au moment de cet appel). "Non" → obligatoire, compte
  //   dans le pack (packCount = 2 : DPE + surface, réutilise le pack 2
  //   existant). "Oui" → rien d'ajouté, note affichée.
  // - Pack complet : pas de question (comportement d'avant la PR #27).
  //   Appartement : Carrez (vente) / Boutin (location) toujours obligatoire
  //   automatique, compte dans le pack, sans prix séparé. Maison : Mesurage
  //   toujours une option chiffrée (HOUSE_MEASUREMENT_PRICES côté page),
  //   jamais obligatoire.
  if (isMinimalMission) {
    if (hasSurfaceAttestation) {
      surfaceAttestationNote = SURFACE_ATTESTATION_NOTE
    } else {
      mandatory.push({ id: surfaceItem.id, label: surfaceItem.label, detail: surfaceItem.detail })
    }
  } else if (propertyType === 'apartment') {
    mandatory.push({ id: surfaceItem.id, label: surfaceItem.label, detail: surfaceItem.detail })
  } else {
    options.push({ id: 'measurement', label: surfaceItem.label })
  }

  if (dappMandatory) {
    mandatory.push({ id: 'dapp', label: 'DAPP', detail: 'Dossier amiante parties privatives, pour un appartement construit avant 1997.' })
  }

  return { mandatory, toConfirm, options, surfaceAttestationNote, isMinimalMission }
}
