export type Purpose = 'sale' | 'rental'
export type PropertyType = 'apartment' | 'house'

export type DiagnosticItem = { id: string; label: string; detail: string }
export type PricedOptionId = 'carrez' | 'boutin' | 'dapp' | 'measurement'
export type PricedOption = { id: PricedOptionId; label: string }

export type DiagnosticsResult = {
  mandatory: DiagnosticItem[]
  toConfirm: DiagnosticItem[]
  options: PricedOption[]
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
  isCoowned,
}: {
  purpose: Purpose
  propertyType: PropertyType
  constructionYear: number
  isCoowned: boolean
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

  if (purpose === 'sale') {
    if (isBefore1997) {
      mandatory.push({ id: 'amiante', label: 'Amiante', detail: 'Bien construit avant 1997.' })
    }
    toConfirm.push({ id: 'termites', label: 'Termites', detail: 'À confirmer selon la commune (zones à risque déclarées par arrêté préfectoral).' })
    toConfirm.push({ id: 'assainissement', label: 'Assainissement', detail: 'À confirmer si le bien n’est pas raccordé au tout-à-l’égout.' })
    if (propertyType === 'apartment') {
      if (isCoowned) {
        options.push({ id: 'carrez', label: 'Mesurage loi Carrez' })
      }
    } else {
      options.push({ id: 'measurement', label: 'Mesurage (surface habitable)' })
    }
  } else {
    if (propertyType === 'apartment') {
      options.push({ id: 'boutin', label: 'Mesurage loi Boutin' })
      // DAPP ne dépend plus de la copropriété : tout appartement construit
      // avant 1997, en location, qu'il soit en copropriété ou non.
      if (isBefore1997) {
        options.push({ id: 'dapp', label: 'DAPP (dossier amiante parties privatives)' })
      }
    } else {
      options.push({ id: 'measurement', label: 'Mesurage (surface habitable)' })
    }
  }

  return { mandatory, toConfirm, options }
}
