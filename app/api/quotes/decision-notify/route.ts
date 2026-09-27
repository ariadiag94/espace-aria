const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

// Endpoint public (pas d'authentification staff, même pattern que
// app/api/pro-signup/notify et app/api/pro-signup/decision) : la mise à jour
// de public.quotes elle-même est déjà protégée par la RLS
// quotes_client_decision_update + le trigger quotes_client_decision_guard
// (voir supabase/migrations/022_mon_espace_client_portal.sql), exécutée
// avant l'appel à cet endpoint — celui-ci ne fait qu'envoyer les deux emails
// (Mani + client), jamais bloquant.
export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return Response.json({ error: 'Le service d’envoi ARIA n’est pas encore configuré.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const decision = body?.decision === 'accepted' || body?.decision === 'refused' ? body.decision : null
  const quoteNumber = String(body?.quote_number || '').trim()
  const dossierName = String(body?.dossier_name || '').trim()
  const propertyAddress = body?.property_address ? String(body.property_address).trim() : ''
  const totalTtc = typeof body?.total_ttc === 'number' ? body.total_ttc : null
  const contactName = String(body?.contact_name || '').trim()
  const contactEmail = String(body?.contact_email || '').trim()

  if (!decision || !quoteNumber || !contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return Response.json({ error: 'Informations invalides ou incomplètes.' }, { status: 400 })
  }

  const decisionLabel = decision === 'accepted' ? 'accepté' : 'refusé'
  const priceLine = totalTtc !== null ? `<li>Montant : ${escapeHtml(euro(totalTtc))} TTC</li>` : ''

  const staffHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">Décision client sur un devis</div>
      </div>
      <p>Le client a <strong>${decisionLabel}</strong> le devis <strong>${escapeHtml(quoteNumber)}</strong>${dossierName ? ` (dossier ${escapeHtml(dossierName)})` : ''}.</p>
      <ul style="padding-left:18px;margin:0 0 18px">
        ${propertyAddress ? `<li>Bien : ${escapeHtml(propertyAddress)}</li>` : ''}
        ${priceLine}
        <li>Contact : ${escapeHtml(contactName)} (${escapeHtml(contactEmail)})</li>
      </ul>
    </div>`

  const clientHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">18 rue de Budapest · 94140 Alfortville · 06 15 70 36 70</div>
      </div>
      <p>Bonjour${contactName ? ` ${escapeHtml(contactName)}` : ''},</p>
      <p>Nous confirmons que vous avez <strong>${decisionLabel}</strong> le devis <strong>${escapeHtml(quoteNumber)}</strong>.</p>
      <p>${decision === 'accepted' ? 'Nous revenons vers vous prochainement pour la suite.' : 'N’hésitez pas à nous contacter pour toute question.'}</p>
      <p style="margin-top:24px">Cordialement,<br><strong>ARIA Diagnostics</strong><br>06 15 70 36 70<br>contact@aria-diagnostics.fr</p>
    </div>`

  const send = (to: string, replyTo: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>', to, reply_to: replyTo, subject, html }),
    })

  const [staffResponse, clientResponse] = await Promise.all([
    // Même contournement "self-send" que les autres routes de notification.
    send('ermansola@gmail.com', contactEmail, `Devis ${decisionLabel} — ${quoteNumber}`, staffHtml),
    send(contactEmail, 'contact@aria-diagnostics.fr', `Confirmation — devis ${quoteNumber} ${decisionLabel}`, clientHtml),
  ])

  if (!staffResponse.ok || !clientResponse.ok) {
    return Response.json({ error: 'Échec de l’envoi d’au moins un email.' }, { status: 502 })
  }

  return Response.json({ ok: true })
}
