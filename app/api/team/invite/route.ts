import { createClient } from '@supabase/supabase-js'

// Invitation d'un collaborateur sur un compte pro (voir migration 029).
// Autorisé au responsable du compte ou à l'admin ARIA (contrôle en base par
// invite_collaborator). Envoie le lien /invitation/<jeton> par e-mail.

const esc = (v: unknown) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ error: 'Session requise.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!url || !key) return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  if (!resendKey) return Response.json({ error: 'Le service d’envoi n’est pas configuré.' }, { status: 503 })

  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const body = await request.json().catch(() => ({}))
  const email = String(body?.email || '').trim().toLowerCase()
  const firstName = String(body?.firstName || '').trim().slice(0, 80)
  const lastName = String(body?.lastName || '').trim().slice(0, 80)
  if (!firstName || !lastName) return Response.json({ error: 'Prénom et nom du collaborateur requis.' }, { status: 400 })

  // Invitation dans l'équipe interne ARIA (assistante / stagiaire), admin seul.
  if (body?.kind === 'staff') {
    const { data: staffToken, error: staffError } = await supabase.rpc('invite_staff', { p_email: email, p_first_name: firstName, p_last_name: lastName })
    if (staffError || !staffToken) return Response.json({ error: staffError?.message || 'Invitation impossible.' }, { status: 400 })
    const staffLink = `${new URL(request.url).origin}/invitation/${staffToken}`
    const staffHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.55;max-width:620px;margin:auto">
      <div style="border-bottom:3px solid #23A5DF;padding-bottom:12px;margin-bottom:20px"><div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div></div>
      <p>Bonjour ${esc(firstName)},</p>
      <p>Erman Solakoglu vous donne accès à l’<strong>Espace ARIA</strong> (dossiers et agenda des interventions).</p>
      <p style="margin:24px 0"><a href="${staffLink}" style="background:#062b59;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">Activer mon accès →</a></p>
      <p style="color:#66788c;font-size:13px">Lien personnel, valable 30 jours.</p>
    </div>`
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>', reply_to: 'contact@aria-diagnostics.fr', to: [email], subject: 'Votre accès à l’Espace ARIA', html: staffHtml }),
    })
    if (!r.ok) return Response.json({ error: `Invitation créée mais e-mail non envoyé. Lien à transmettre : ${staffLink}` }, { status: 502 })
    return Response.json({ ok: true })
  }

  const { data: mine } = await supabase.rpc('my_team_account')
  const myRow = Array.isArray(mine) ? mine[0] : null
  let accountId = typeof body?.accountId === 'string' ? body.accountId : ''
  if (!accountId) {
    if (!myRow) return Response.json({ error: 'Aucun compte professionnel rattaché.' }, { status: 403 })
    accountId = myRow.account_id
  }
  // Invitation envoyée par l'admin ARIA (depuis Comptes pro) ou par le responsable.
  const inviter = myRow && myRow.account_id === accountId ? (myRow.display_name || 'Votre responsable') : 'ARIA Diagnostics'
  let companyName = myRow && myRow.account_id === accountId ? (myRow.company_name || '') : ''

  const { data: inviteToken, error } = await supabase.rpc('invite_collaborator', { p_account_id: accountId, p_email: email, p_first_name: firstName, p_last_name: lastName })
  if (error || !inviteToken) return Response.json({ error: error?.message || 'Invitation impossible.' }, { status: 400 })
  if (!companyName) {
    const { data } = await supabase.rpc('get_invitation', { p_token: inviteToken })
    companyName = (Array.isArray(data) ? data[0]?.company_name : '') || 'votre agence'
  }

  const link = `${new URL(request.url).origin}/invitation/${inviteToken}`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.55;max-width:620px;margin:auto">
      <div style="border-bottom:3px solid #23A5DF;padding-bottom:12px;margin-bottom:20px"><div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div></div>
      <p>Bonjour ${esc(firstName)},</p>
      <p>${esc(inviter)} vous invite à rejoindre l’espace <strong>${esc(companyName)}</strong> sur l’application ARIA Diagnostics : demandes de devis de diagnostics immobiliers, tarif partenaire et suivi des dossiers de l’agence.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#062b59;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">Rejoindre ${esc(companyName)} →</a></p>
      <p style="color:#66788c;font-size:13px">Ce lien est personnel et valable 30 jours. Si vous n’attendiez pas cette invitation, ignorez simplement cet e-mail.</p>
      <p>ARIA Diagnostics · 06 15 70 36 70 · contact@aria-diagnostics.fr</p>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>', reply_to: 'contact@aria-diagnostics.fr', to: [email], subject: `Invitation à rejoindre ${companyName} sur l’espace ARIA`, html }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return Response.json({ error: `Invitation créée mais e-mail non envoyé (${d?.message || res.status}). Lien à transmettre : ${link}` }, { status: 502 })
  }
  return Response.json({ ok: true })
}
