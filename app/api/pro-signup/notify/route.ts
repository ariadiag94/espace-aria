const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  agency: 'Agence immobilière',
  syndic: 'Syndic de copropriété',
  notary: 'Notaire',
  landlord: 'Bailleur / Propriétaire',
  company: 'Entreprise',
  other: 'Autre professionnel',
}

// Endpoint public (pas d'authentification staff, même pattern que
// app/api/leads/notify) : notifie l'équipe ARIA (Mani) d'une nouvelle
// inscription pro en attente de validation, juste après l'écriture dans
// client_accounts/account_memberships (voir app/inscription-pro/page.tsx).
// Son échec ne doit jamais empêcher la confirmation déjà affichée au
// demandeur, le compte étant de toute façon déjà créé en base.
export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return Response.json({ error: 'Le service d’envoi ARIA n’est pas encore configuré.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const companyName = String(body?.company_name || '').trim()
  const contactEmail = String(body?.email || '').trim()

  if (!companyName || !contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return Response.json({ error: 'Informations invalides ou incomplètes.' }, { status: 400 })
  }

  const accountType = String(body?.account_type || '')
  const firstName = String(body?.first_name || '').trim()
  const lastName = String(body?.last_name || '').trim()
  const phone = String(body?.phone || '').trim()
  const siret = String(body?.siret || '').trim()

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">Nouvelle demande de compte pro — en attente de validation</div>
      </div>
      <p><strong>${escapeHtml(companyName)}</strong></p>
      <ul style="padding-left:18px;margin:0 0 18px">
        <li>Type de compte : ${escapeHtml(ACCOUNT_TYPE_LABEL[accountType] || accountType)}</li>
        <li>Contact : ${escapeHtml(firstName)} ${escapeHtml(lastName)}</li>
        <li>Email : ${escapeHtml(contactEmail)}</li>
        ${phone ? `<li>Téléphone : ${escapeHtml(phone)}</li>` : ''}
        ${siret ? `<li>SIRET : ${escapeHtml(siret)}</li>` : ''}
      </ul>
      <p style="margin-top:24px;color:#66788c;font-size:12px">Compte créé automatiquement depuis /inscription-pro, statut "pending" — à valider manuellement.</p>
    </div>`

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>',
      // Même contournement "self-send" que app/api/leads/notify/route.ts.
      to: 'ermansola@gmail.com',
      reply_to: contactEmail,
      subject: `Nouvelle demande de compte pro — ${companyName}`,
      html,
    }),
  })

  const resendData = await resendResponse.json().catch(() => ({}))
  if (!resendResponse.ok) {
    return Response.json(
      { error: String(resendData?.message || resendData?.error || 'Échec de l’envoi.') },
      { status: resendResponse.status },
    )
  }

  return Response.json({ ok: true, emailId: resendData.id })
}
