const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const LOGIN_URL = 'https://ariadiag.fr/login'

// Endpoint public (pas d'authentification staff — la décision elle-même est
// déjà protégée par la RLS admin-only au moment de la mise à jour de
// client_accounts, voir app/admin/comptes-pro/page.tsx ; cet endpoint ne fait
// qu'envoyer un email, jamais bloquant, même pattern que
// app/api/pro-signup/notify) : notifie le demandeur pro que sa demande a été
// validée ou refusée.
export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return Response.json({ error: 'Le service d’envoi ARIA n’est pas encore configuré.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const email = String(body?.email || '').trim()
  const companyName = String(body?.company_name || '').trim()
  const decision = body?.decision === 'validated' || body?.decision === 'rejected' ? body.decision : null

  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !decision) {
    return Response.json({ error: 'Informations invalides ou incomplètes.' }, { status: 400 })
  }

  const subject = decision === 'validated'
    ? 'Votre compte professionnel ARIA Diagnostics est validé'
    : 'Votre demande de compte professionnel ARIA Diagnostics'

  const body_ = decision === 'validated'
    ? `<p>Votre compte professionnel${companyName ? ` <strong>${escapeHtml(companyName)}</strong>` : ''} a été validé par notre équipe.</p>
       <p>Vous pouvez désormais vous connecter : <a href="${LOGIN_URL}">${LOGIN_URL}</a></p>`
    : `<p>Nous vous informons que votre demande de compte professionnel${companyName ? ` <strong>${escapeHtml(companyName)}</strong>` : ''} n’a pas été retenue.</p>
       <p>Pour toute question, vous pouvez nous contacter à contact@aria-diagnostics.fr.</p>`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">18 rue de Budapest · 94140 Alfortville · 06 15 70 36 70</div>
      </div>
      <p>Bonjour,</p>
      ${body_}
      <p style="margin-top:24px">Cordialement,<br><strong>ARIA Diagnostics</strong><br>06 15 70 36 70<br>contact@aria-diagnostics.fr</p>
    </div>`

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>',
      to: email,
      reply_to: 'contact@aria-diagnostics.fr',
      subject,
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
