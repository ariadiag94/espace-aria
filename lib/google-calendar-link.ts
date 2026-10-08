// Lien « Ajouter à Google Agenda » pré-rempli (aucune clé ni connexion
// nécessaire) : ouvre Google Agenda avec titre, horaires, adresse et détails.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function googleCalendarLink(opts: { title: string; start: string | Date; end?: string | Date | null; location?: string | null; details?: string | null }) {
  const start = new Date(opts.start)
  const end = opts.end ? new Date(opts.end) : new Date(start.getTime() + 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    ...(opts.location ? { location: opts.location } : {}),
    ...(opts.details ? { details: opts.details } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
