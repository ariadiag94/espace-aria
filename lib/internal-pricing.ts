// Tarifs réservés à ARIA (jamais affichés dans DiagAssist, sur les flyers
// ni dans l'espace pro) : ajoutés à la main dans un devis depuis /devis.
// Grilles fournies par Mani le 30/09/2026. Prix TTC (TVA 20 %).
// detail : repris sur la ligne du devis (visible par le client).
// note   : aide-mémoire interne, jamais imprimée.

export type InternalPrice = { ref: string; label: string; ttc: number; detail?: string; note?: string; toVerify?: boolean; unit?: string; maxQty?: number }
export type InternalCategory = { id: string; title: string; items: InternalPrice[] }

const AT: { code: string; label: string; amiante: number; plomb: number }[] = [
  { code: '30', label: '< 30 m²', amiante: 210, plomb: 230 },
  { code: '60', label: '30 à 60 m²', amiante: 410, plomb: 430 },
  { code: '90', label: '60 à 90 m²', amiante: 610, plomb: 630 },
  { code: '150', label: '90 à 150 m²', amiante: 900, plomb: 930 },
  { code: '300', label: '150 à 300 m²', amiante: 1470, plomb: 1530 },
  { code: '550', label: '300 à 550 m²', amiante: 2270, plomb: 2370 },
  { code: '850', label: '550 à 850 m²', amiante: 3770, plomb: 3970 },
  { code: '1200', label: '850 à 1 200 m²', amiante: 5470, plomb: 5770 },
]

// Locaux professionnels, cession / reprise de bail (prix TTC de la grille).
const CF: { code: string; label: string; avant1997: number; apres1997: number }[] = [
  { code: '30', label: '< 30 m²', avant1997: 210, apres1997: 175 },
  { code: '60', label: '30 à 60 m²', avant1997: 246, apres1997: 205 },
  { code: '90', label: '60 à 90 m²', avant1997: 294, apres1997: 245 },
  { code: '150', label: '90 à 150 m²', avant1997: 354, apres1997: 295 },
  { code: '300', label: '150 à 300 m²', avant1997: 438, apres1997: 365 },
  { code: '550', label: '300 à 550 m²', avant1997: 534, apres1997: 455 },
]
// Locaux professionnels, vente (VP) et location (LP), prix TTC.
const T8 = ['< 30 m²', '30 à 60 m²', '60 à 90 m²', '90 à 150 m²', '150 à 300 m²', '300 à 550 m²', '550 à 850 m²', '850 à 1 200 m²']
const C8 = ['30', '60', '90', '150', '300', '550', '850', '1200']
const VP_A = [280, 320, 380, 420, 520, 640, 780, 940]
const VP_P = [210, 250, 310, 350, 450, 570, 710, 870]
const LP_A = [255, 285, 325, 375, 445, 535, 645, 775]
const LP_P = [175, 205, 245, 295, 365, 455, 365, 695]
// Contrôle visuel amiante (montants de la grille considérés HT : TTC = HT × 1,2).
const CVA_HT = [200, 250, 300, 400, 450, 550, 600, 650]
// Immeuble, parties communes, par nombre d'étages (R+1 à R+10), TTC.
const PC_DTA = [240, 270, 300, 360, 440, 540, 660, 800, 840, 880]
const PC_PLOMB = [260, 290, 330, 390, 480, 580, 710, 860, 910, 960]
const CF_NOTE = 'Vérifier l’applicabilité selon l’opération : cession du fonds seule, cession/reprise du bail, vente ou location des murs.'

export const INTERNAL_PRICING: InternalCategory[] = [
  {
    id: 'avant-travaux',
    title: 'Avant travaux',
    items: AT.flatMap((t) => [
      { ref: `RAAT-${t.code}`, label: `Repérage amiante avant travaux – ${t.label}`, ttc: t.amiante, detail: 'analyses laboratoire en supplément selon mission' },
      { ref: `PBAT-${t.code}`, label: `Diagnostic plomb avant travaux – ${t.label}`, ttc: t.plomb },
      { ref: `TAT-${t.code}`, label: `Termites avant travaux – ${t.label}`, ttc: t.amiante, note: 'Si zone termites' },
    ]),
  },
  {
    id: 'locaux-pro',
    title: 'Locaux professionnels – cession / reprise de bail',
    items: CF.flatMap((t) => [
      { ref: `CF-A${t.code}`, label: `Pack locaux professionnels – permis avant 1997 – ${t.label}`, ttc: t.avant1997, detail: 'DPE + ERP + DTA / mise à jour du DTA selon l’existant', note: CF_NOTE },
      { ref: `CF-P${t.code}`, label: `Pack locaux professionnels – permis après 1997 – ${t.label}`, ttc: t.apres1997, detail: 'DPE + ERP', note: CF_NOTE },
    ]),
  },
  {
    id: 'locaux-pro-vente',
    title: 'Locaux professionnels – vente',
    items: C8.flatMap((c, i) => [
      { ref: `VP-A${c}`, label: `Pack vente locaux professionnels – permis avant 1997 – ${T8[i]}`, ttc: VP_A[i], detail: 'DPE + termites si zone concernée + Carrez si copropriété + ERP + DTA / mise à jour du DTA selon le dossier existant ; analyses amiante éventuelles en supplément' },
      { ref: `VP-P${c}`, label: `Pack vente locaux professionnels – permis après 1997 – ${T8[i]}`, ttc: VP_P[i], detail: 'DPE + termites si zone concernée + Carrez si copropriété + ERP' },
    ]),
  },
  {
    id: 'locaux-pro-location',
    title: 'Locaux professionnels – location',
    items: C8.flatMap((c, i) => [
      { ref: `LP-A${c}`, label: `Pack location locaux professionnels – permis avant 1997 – ${T8[i]}`, ttc: LP_A[i], detail: 'DPE + ERP + DTA / mise à jour du DTA selon le dossier existant ; analyses amiante éventuelles en supplément' },
      { ref: `LP-P${c}`, label: `Pack location locaux professionnels – permis après 1997 – ${T8[i]}`, ttc: LP_P[i], detail: 'DPE + ERP',
        ...(c === '850' ? { toVerify: true, note: 'Tarif relevé à 365 € TTC, incohérent avec la tranche précédente (455 €) : à vérifier avant usage.' } : {}) },
    ]),
  },
  {
    id: 'controle-visuel-amiante',
    title: 'Contrôle visuel amiante',
    items: C8.map((c, i) => ({ ref: `CVA-${c}`, label: `Contrôle visuel amiante – ${T8[i]}`, ttc: Math.round(CVA_HT[i] * 1.2), note: `Tarif de référence ${CVA_HT[i]} € HT` })),
  },
  {
    id: 'immeuble',
    title: 'Immeuble – parties communes',
    items: [
      ...PC_DTA.flatMap((v, i) => [
        { ref: `DTA-R${i + 1}`, label: `DTA parties communes – R+${i + 1}`, ttc: v, note: 'Tarif de référence relevé' },
        { ref: `PPC-R${i + 1}`, label: `Plomb parties communes (CREP) – R+${i + 1}`, ttc: PC_PLOMB[i], note: 'Tarif de référence relevé' },
        { ref: `TPC-R${i + 1}`, label: `Termites parties communes – R+${i + 1}`, ttc: v, note: 'Tarif de référence relevé' },
      ]),
      { ref: 'ASS-IM', label: 'Assainissement immeuble', ttc: 470, unit: 'cage d’escalier' },
      { ref: 'DPEC-LOT', label: 'DPE collectif', ttc: 84, unit: 'lot', maxQty: 50, detail: '70 € HT par lot', note: 'Au-delà de 50 lots : sur devis' },
    ],
  },
]

export const htFromTtc = (ttc: number) => Math.round((ttc / 1.2) * 100) / 100
