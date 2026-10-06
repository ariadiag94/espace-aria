import { reviewsEmailBlock } from './google-reviews'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateQuotePdf } from '@/lib/quote-pdf'
import { loadDossierPdfExtras } from '@/lib/dossier-pdf-extras'
import { PREPARATION_CHECKLIST } from '@/lib/ressources-content'

// Automatisations quotidiennes (voir supabase/migrations/028_automations.sql)
// lancées par /api/cron/daily :
//  1. relance des devis envoyés sans réponse : 1re relance 3 jours après
//     l'envoi, 2e relance 4 jours après la 1re (≈ J+7), jamais plus ;
//  2. rappel au client la veille de l'intervention.
// Chaque envoi est journalisé dans automation_log (jamais deux fois le même).
// dryRun = aperçu : rien n'est envoyé ni journalisé.

type Row = Record<string, any>

export type AutomationItem = {
  kind: 'quote_reminder' | 'appointment_reminder'
  label: string
  recipient: string
  detail: string
  status: 'à envoyer' | 'envoyé' | 'erreur' | 'ignoré'
  error?: string
}

export type AutomationReport = {
  dryRun: boolean
  settings: Record<string, boolean>
  items: AutomationItem[]
}

const DAY = 24 * 3600 * 1000
const FIRST_REMINDER_DAYS = 3
const SECOND_REMINDER_DAYS = 4
const MAX_QUOTE_AGE_DAYS = 30
const ARIA_BCC = 'ermansola@gmail.com'

const esc = (v: unknown) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const parisDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
const parisLong = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })
const parisTime = (d: Date) => d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
const recipientsOf = (dossier: Row) => String(dossier.contact_email || '')
  .split(/[;,\s]+/).map((e) => e.trim()).filter((e) => /^\S+@\S+\.\S+$/.test(e))

const frame = (inner: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
    <div style="border-bottom:3px solid #23A5DF;padding-bottom:14px;margin-bottom:22px">
      <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
      <div style="font-size:13px;color:#66788c">18 rue de Budapest · 94140 Alfortville · 06 15 70 36 70</div>
    </div>
    ${inner}
    <p style="margin-top:24px">Cordialement,<br><strong>ARIA Diagnostics</strong><br>06 15 70 36 70<br>contact@aria-diagnostics.fr</p>
  </div>`

async function sendEmail(resendKey: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>', reply_to: 'contact@aria-diagnostics.fr', bcc: [ARIA_BCC], ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(String(data?.message || data?.error || `Resend ${res.status}`))
  return String(data?.id || '')
}

async function quotePdfBase64(supabase: SupabaseClient, quote: Row, dossier: Row, origin: string) {
  const { data: lines } = await supabase.from('quote_lines').select('label,quantity,unit_ttc,sort_order').eq('quote_id', quote.id).order('sort_order', { ascending: true })
  const diagnostics = Array.isArray(dossier.diagnostics)
    ? dossier.diagnostics.map(String).filter(Boolean)
    : String(dossier.diagnostics || '').split(',').map((v) => v.trim()).filter(Boolean)
  const extras = await loadDossierPdfExtras(supabase, dossier)
  const bytes = await generateQuotePdf({
    ...extras,
    quoteNumber: quote.quote_number,
    createdAt: quote.created_at,
    contactName: dossier.contact_name,
    contactEmail: dossier.contact_email,
    contactPhone: dossier.contact_phone,
    propertyAddress: String(dossier.property_address || dossier.dossier_name || 'le bien concerné'),
    propertyLabel: quote.property_type === 'house' ? 'Maison' : quote.property_type === 'apartment' ? 'Appartement' : quote.property_type === 'local' ? 'Local professionnel' : quote.property_type === 'immeuble' ? 'Immeuble' : quote.property_type === 'travaux' ? 'Avant travaux / démolition' : 'Bien',
    propertySize: quote.property_size,
    notes: quote.notes,
    diagnostics,
    origin,
    lines: (lines || []).map((l: Row) => ({ label: String(l.label || 'Prestation'), quantity: Number(l.quantity || 0), unit_ttc: Number(l.unit_ttc || 0) })),
  })
  return Buffer.from(bytes).toString('base64')
}

export async function runDailyAutomations(
  supabase: SupabaseClient,
  opts: { dryRun: boolean; origin: string; resendKey: string | null; now?: Date },
): Promise<AutomationReport> {
  const now = opts.now || new Date()
  const items: AutomationItem[] = []

  const { data: settingRows } = await supabase.from('automation_settings').select('key,enabled')
  const settings: Record<string, boolean> = { quote_reminders: true, appointment_reminders: true }
  ;(settingRows || []).forEach((r: Row) => { settings[r.key] = r.enabled !== false })

  const canSend = !opts.dryRun && !!opts.resendKey
  const log = async (entry: Row) => { if (!opts.dryRun) await supabase.from('automation_log').insert(entry) }

  // ---------- 1. Relances des devis ----------
  if (settings.quote_reminders) {
    const { data: quotes } = await supabase.from('quotes').select('*').eq('status', 'sent')
    const quoteIds = (quotes || []).map((q: Row) => q.id)
    if (quoteIds.length) {
      const [{ data: events }, { data: logs }, { data: dossiers }] = await Promise.all([
        supabase.from('quote_email_events').select('quote_id,sent_at').in('quote_id', quoteIds),
        supabase.from('automation_log').select('target_id,step,created_at').eq('kind', 'quote_reminder').in('target_id', quoteIds),
        supabase.from('dossiers').select('*').in('id', Array.from(new Set((quotes || []).map((q: Row) => q.dossier_id)))),
      ])
      const dossierById = new Map((dossiers || []).map((d: Row) => [d.id, d]))
      for (const quote of quotes || []) {
        const sends = (events || []).filter((e: Row) => e.quote_id === quote.id).map((e: Row) => new Date(e.sent_at).getTime())
        const lastSend = sends.length ? Math.max(...sends) : new Date(quote.created_at).getTime()
        const reminders = (logs || []).filter((l: Row) => l.target_id === quote.id)
        const lastReminder = reminders.length ? Math.max(...reminders.map((l: Row) => new Date(l.created_at).getTime())) : 0
        const step = reminders.length + 1
        if (step > 2) continue
        if (now.getTime() - lastSend > MAX_QUOTE_AGE_DAYS * DAY) continue
        const due = step === 1
          ? now.getTime() - lastSend >= FIRST_REMINDER_DAYS * DAY
          : now.getTime() - Math.max(lastReminder, lastSend) >= SECOND_REMINDER_DAYS * DAY
        if (!due) continue
        const dossier = dossierById.get(quote.dossier_id)
        // Dossier déjà avancé (RDV fixé, rapport…) : plus rien à relancer.
        if (!dossier || !['quote_sent', 'draft', null, undefined, ''].includes(dossier.status)) continue
        const to = recipientsOf(dossier)
        const label = `Devis ${quote.quote_number} — ${dossier.dossier_name || dossier.property_address || ''} (relance ${step}/2)`
        if (!to.length) { items.push({ kind: 'quote_reminder', label, recipient: '—', detail: 'Pas d’e-mail sur le dossier', status: 'ignoré' }); continue }
        const item: AutomationItem = { kind: 'quote_reminder', label, recipient: to.join(', '), detail: `${euro(Number(quote.total_ttc || 0))} TTC, envoyé le ${new Date(lastSend).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}`, status: 'à envoyer' }
        items.push(item)
        if (!canSend) continue
        try {
          const pdf = await quotePdfBase64(supabase, quote, dossier, opts.origin)
          const address = String(dossier.property_address || dossier.dossier_name || 'votre bien')
          const html = frame(`
            <p>Bonjour ${esc(dossier.contact_name || 'Madame, Monsieur')},</p>
            <p>${step === 1 ? 'Nous revenons vers vous' : 'Nous nous permettons de vous relancer une dernière fois'} au sujet de notre devis <strong>${esc(quote.quote_number)}</strong> (${esc(euro(Number(quote.total_ttc || 0)))} TTC) pour <strong>${esc(address)}</strong>, que vous retrouverez ci-joint.</p>
            <p>Pour confirmer la mission, il vous suffit de nous retourner l’ordre de mission signé (mention « Bon pour accord ») en réponse à cet e-mail${dossier.account_id ? `, ou de l’accepter directement depuis votre espace : <a href="${opts.origin}/mon-espace">${opts.origin.replace(/^https?:\/\//, '')}/mon-espace</a>` : ''}. Nous vous proposerons ensuite un créneau d’intervention.</p>
            <p>Une question, une précision sur le bien ? Répondez simplement à cet e-mail ou appelez-nous au 06 15 70 36 70.</p>`)
          const htmlWithReviews = html.replace(/\n  <\/div>$/, `${await reviewsEmailBlock()}\n  </div>`)
          const id = await sendEmail(opts.resendKey!, {
            to, subject: `${step === 1 ? 'Relance' : 'Dernière relance'} — votre devis ARIA Diagnostics ${quote.quote_number}`, html: htmlWithReviews,
            attachments: [{ filename: `${quote.quote_number}.pdf`, content: pdf }],
          })
          await log({ kind: 'quote_reminder', target_id: quote.id, dossier_id: quote.dossier_id, recipient: to.join(', '), step, resend_email_id: id || null })
          item.status = 'envoyé'
        } catch (e) {
          item.status = 'erreur'; item.error = e instanceof Error ? e.message : String(e)
        }
      }
    }
  }

  // ---------- 2. Rappels de rendez-vous (veille) ----------
  if (settings.appointment_reminders) {
    const tomorrow = parisDate(new Date(now.getTime() + DAY))
    const { data: appointments } = await supabase.from('appointments').select('*')
    const upcoming = (appointments || []).filter((a: Row) => {
      if (['cancelled', 'canceled'].includes(String(a.status || '').toLowerCase())) return false
      const start = new Date(a.starts_at || a.scheduled_at || '')
      return !Number.isNaN(start.getTime()) && parisDate(start) === tomorrow
    })
    if (upcoming.length) {
      const ids = upcoming.map((a: Row) => a.id)
      const [{ data: logs }, { data: dossiers }] = await Promise.all([
        supabase.from('automation_log').select('target_id').eq('kind', 'appointment_reminder').in('target_id', ids),
        supabase.from('dossiers').select('*').in('id', Array.from(new Set(upcoming.map((a: Row) => a.dossier_id)))),
      ])
      const done = new Set((logs || []).map((l: Row) => l.target_id))
      const dossierById = new Map((dossiers || []).map((d: Row) => [d.id, d]))
      for (const appt of upcoming) {
        if (done.has(appt.id)) continue
        const dossier = dossierById.get(appt.dossier_id)
        if (!dossier) continue
        const start = new Date(appt.starts_at || appt.scheduled_at)
        const to = recipientsOf(dossier)
        const label = `RDV ${parisLong(start)} à ${parisTime(start)} — ${dossier.dossier_name || dossier.property_address || ''}`
        if (!to.length) { items.push({ kind: 'appointment_reminder', label, recipient: '—', detail: 'Pas d’e-mail sur le dossier', status: 'ignoré' }); continue }
        const item: AutomationItem = { kind: 'appointment_reminder', label, recipient: to.join(', '), detail: String(dossier.property_address || ''), status: 'à envoyer' }
        items.push(item)
        if (!canSend) continue
        try {
          const access = [dossier.building && `bât. ${dossier.building}`, dossier.staircase && `esc. ${dossier.staircase}`, dossier.floor && `étage ${dossier.floor}`, dossier.door_number && `porte ${dossier.door_number}`].filter(Boolean).join(', ')
          const html = frame(`
            <p>Bonjour ${esc(dossier.contact_name || 'Madame, Monsieur')},</p>
            <p>Nous vous rappelons notre intervention <strong>demain, ${esc(parisLong(start))} à ${esc(parisTime(start))}</strong>, au <strong>${esc(dossier.property_address || dossier.dossier_name || '')}</strong>${access ? ` (${esc(access)})` : ''}.</p>
            <p style="margin-bottom:6px"><strong>Pour que la visite se passe au mieux :</strong></p>
            <ul style="margin-top:0;padding-left:20px">${PREPARATION_CHECKLIST.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
            <p>Un empêchement ? Merci de nous prévenir au plus tôt au 06 15 70 36 70 ou en répondant à cet e-mail.</p>`)
          const id = await sendEmail(opts.resendKey!, { to, subject: `Rappel : intervention ARIA Diagnostics demain à ${parisTime(start)}`, html })
          await log({ kind: 'appointment_reminder', target_id: appt.id, dossier_id: appt.dossier_id, recipient: to.join(', '), step: 1, resend_email_id: id || null })
          item.status = 'envoyé'
        } catch (e) {
          item.status = 'erreur'; item.error = e instanceof Error ? e.message : String(e)
        }
      }
    }
  }

  return { dryRun: opts.dryRun, settings, items }
}
