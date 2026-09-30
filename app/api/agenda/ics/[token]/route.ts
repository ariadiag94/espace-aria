import { createClient } from '@supabase/supabase-js'

// Flux iCalendar des rendez-vous ARIA, à ajouter dans Google Agenda
// (« Autres agendas » → « À partir de l'URL »). Accès par jeton secret :
// voir supabase/migrations/027_calendar_feed.sql.

type Row = Record<string, unknown> & { dossier?: Record<string, unknown> | null }

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())
const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
// Plie les lignes à 75 octets (RFC 5545).
const fold = (line: string) => {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch)
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: raw } = await context.params
  const token = raw.replace(/\.ics$/i, '')
  if (!/^[0-9a-f]{40,128}$/i.test(token)) return new Response('Lien invalide', { status: 404 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new Response('Configuration manquante', { status: 500 })
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.rpc('calendar_feed', { p_token: token })
  if (error) return new Response('Agenda indisponible', { status: 503 })

  const origin = new URL(request.url).origin
  const now = stamp(new Date())
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ARIA Diagnostics//Espace ARIA//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:ARIA — Interventions', 'X-WR-TIMEZONE:Europe/Paris', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ]
  for (const row of (Array.isArray(data) ? data : []) as Row[]) {
    const start = new Date(str(row.starts_at || row.scheduled_at))
    if (Number.isNaN(start.getTime())) continue
    const endRaw = new Date(str(row.ends_at))
    const end = !Number.isNaN(endRaw.getTime()) && endRaw > start ? endRaw : new Date(start.getTime() + 3600_000)
    const d = row.dossier || {}
    const title = str(d.dossier_name) || 'Intervention ARIA'
    const address = str(d.property_address)
    const access = [
      d.building && `Bât. ${str(d.building)}`, d.staircase && `Esc. ${str(d.staircase)}`, d.floor && `Étage ${str(d.floor)}`,
      d.door_number && `Porte ${str(d.door_number)}`,
    ].filter(Boolean).join(' · ')
    const description = [
      str(d.contact_name) && `Contact : ${str(d.contact_name)}${str(d.contact_phone) ? ` — ${str(d.contact_phone)}` : ''}`,
      access && `Accès : ${access}`,
      str(d.access_instructions) && `Instructions : ${str(d.access_instructions)}`,
      str(d.key_pickup) && `Clés : ${str(d.key_pickup)}`,
      str(row.notes) && `Notes : ${str(row.notes)}`,
      str(row.dossier_id) && `Dossier : ${origin}/dossiers/${str(row.dossier_id)}`,
    ].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${str(row.id)}@espace-aria`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(title)}`,
      ...(address ? [`LOCATION:${esc(address)}`] : []),
      ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="aria-agenda.ics"' },
  })
}
