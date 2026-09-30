import { createClient } from '@supabase/supabase-js'
import { runDailyAutomations, type AutomationReport } from '@/lib/automations'

// Automatisations quotidiennes (relances devis + rappels RDV), voir
// lib/automations.ts.
// - GET : appelé chaque matin par Vercel Cron (vercel.json), authentifié par
//   CRON_SECRET ; utilise la clé service Supabase (aucune session).
// - POST : depuis /automatisations, par l'admin connecté (aperçu ou envoi
//   immédiat) ; utilise sa propre session (accès admin complet, migration 025).

export const maxDuration = 60

const ORIGIN = 'https://espace-aria.vercel.app'

async function notifyAria(resendKey: string, report: AutomationReport) {
  const sent = report.items.filter((i) => i.status === 'envoyé' || i.status === 'erreur')
  if (!sent.length) return
  const rows = sent.map((i) => `<li>${i.status === 'erreur' ? '⚠️ ' : ''}${i.kind === 'quote_reminder' ? 'Relance devis' : 'Rappel RDV'} — ${i.label} → ${i.recipient}${i.error ? ` (erreur : ${i.error})` : ''}</li>`).join('')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Espace ARIA <contact@aria-diagnostics.fr>', to: ['ermansola@gmail.com'],
      subject: `Espace ARIA — ${sent.length} envoi(s) automatique(s) ce matin`,
      html: `<div style="font-family:Arial,sans-serif"><p>Envois automatiques du jour :</p><ul>${rows}</ul><p><a href="${ORIGIN}/automatisations">Voir les automatisations</a></p></div>`,
    }),
  }).catch(() => undefined)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Non autorisé.' }, { status: 401 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY || null
  if (!url || !serviceKey) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 503 })
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const report = await runDailyAutomations(supabase, { dryRun: false, origin: ORIGIN, resendKey })
  if (resendKey) await notifyAria(resendKey, report)
  return Response.json(report)
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ error: 'Session requise.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return Response.json({ error: 'Réservé à l’administrateur.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const dryRun = body?.dryRun !== false
  const resendKey = process.env.RESEND_API_KEY || null
  const report = await runDailyAutomations(supabase, { dryRun, origin: ORIGIN, resendKey })
  return Response.json({ ...report, cronReady: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY) })
}
