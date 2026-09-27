// Libellés français pour le portail client (/mon-espace) — deux domaines de
// statut distincts, à ne pas confondre :
//
// - quotes.status : cycle de vie d'UN devis précis ('draft'/'sent'/
//   'accepted'/'refused'). 'draft' ne devrait jamais s'afficher côté client
//   (les pages de /mon-espace filtrent .neq('status','draft')), gardé ici
//   uniquement par défensivité.
// - dossiers.status : statut agrégé du dossier dans son ensemble. Les 8
//   valeurs ci-dessous sont exactement celles utilisées par
//   app/dashboard/page.tsx (labelStatus, lu directement dans le code
//   staff — jamais inventées) : draft, quote_sent, quote_accepted,
//   to_schedule, scheduled, reports_ready, waiting_payment, completed.
//   quote_refused est la seule valeur nouvelle (décision produit du
//   2026-09-27, chantier "compte pro" — synchronisation dossiers.status
//   lors d'une décision client sur /mon-espace, voir
//   supabase/migrations/023_dossiers_client_decision_sync.sql), à ajouter
//   aussi dans app/dashboard/page.tsx pour rester cohérente partout où le
//   statut est affiché. Valeurs différentes de celles de quotes.status :
//   ne jamais réutiliser QUOTE_STATUS_LABEL pour dossiers.status.
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
  to_schedule: 'À planifier',
  scheduled: 'Planifié',
  reports_ready: 'Rapports prêts',
  waiting_payment: 'Règlement',
  completed: 'Terminé',
}

export const dossierStatusLabel = (status: string) => DOSSIER_STATUS_LABEL[status] || humanize(status)
