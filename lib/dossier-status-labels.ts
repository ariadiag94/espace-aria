// Libellés français pour le portail client (/mon-espace) — deux domaines de
// statut distincts, à ne pas confondre :
//
// - quotes.status : cycle de vie d'UN devis précis ('draft'/'sent'/
//   'accepted'/'refused'). 'draft' ne devrait jamais s'afficher côté client
//   (les pages de /mon-espace filtrent .neq('status','draft')), gardé ici
//   uniquement par défensivité.
// - dossiers.status : statut agrégé du dossier dans son ensemble, mis à
//   jour par le staff en parallèle du statut d'un devis (voir
//   app/devis/[id]/page.tsx: 'sent' -> dossiers.status = 'quote_sent',
//   'accepted' -> 'quote_accepted'). Valeurs différentes de celles de
//   quotes.status : ne jamais réutiliser QUOTE_STATUS_LABEL pour dossiers.status.
//
// Repli commun : une valeur non reconnue est humanisée (underscores -> espaces)
// plutôt que de planter ou d'afficher un texte vide — même filet de sécurité
// que celui déjà utilisé côté staff (app/dossiers/page.tsx).
const humanize = (value: string) => value.replaceAll('_', ' ')

const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Devis envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
}

export const quoteStatusLabel = (status: string) => QUOTE_STATUS_LABEL[status] || humanize(status)

const DOSSIER_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  quote_sent: 'Devis envoyé',
  quote_accepted: 'Devis accepté',
  quote_refused: 'Devis refusé',
}

export const dossierStatusLabel = (status: string) => DOSSIER_STATUS_LABEL[status] || humanize(status)
