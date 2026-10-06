import { reviewsEmailBlock } from '@/lib/google-reviews'
import { createClient } from '@supabase/supabase-js'
import { generateQuotePdf } from '@/lib/quote-pdf'
import { loadDossierPdfExtras } from '@/lib/dossier-pdf-extras'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const resendErrorMessage = (data: any) => {
  const raw = String(data?.message || data?.error || '').trim()
  const normalized = raw.toLowerCase()

  if (normalized.includes('domain is not verified') || normalized.includes('verify your domain')) {
    return 'Domaine d’envoi ARIA non encore vérifié. L’envoi sera disponible après validation DNS.'
  }

  if (normalized.includes('api key') && (normalized.includes('invalid') || normalized.includes('unauthorized'))) {
    return 'Le service d’envoi ARIA n’est pas correctement authentifié. Vérifie la configuration Resend.'
  }

  return raw || 'Échec de l’envoi du devis.'
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token) {
    return Response.json({ error: 'Session requise.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  if (!resendApiKey) {
    return Response.json(
      { error: 'Le service d’envoi ARIA n’est pas encore configuré.' },
      { status: 503 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return Response.json({ error: 'Session invalide.' }, { status: 401 })
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id,quote_number,status,total_ttc,dossier_id,created_at,property_type,property_size,notes')
    .eq('id', id)
    .single()

  if (quoteError || !quote) {
    return Response.json({ error: quoteError?.message || 'Devis introuvable.' }, { status: 404 })
  }

  const [{ data: dossier, error: dossierError }, { data: lines, error: linesError }] =
    await Promise.all([
      supabase
        .from('dossiers')
        .select('*')
        .eq('id', quote.dossier_id)
        .single(),
      supabase
        .from('quote_lines')
        .select('label,quantity,unit_ttc,total_ttc,sort_order')
        .eq('quote_id', quote.id)
        .order('sort_order', { ascending: true }),
    ])

  if (dossierError || !dossier) {
    return Response.json({ error: dossierError?.message || 'Dossier introuvable.' }, { status: 404 })
  }

  if (linesError) {
    return Response.json({ error: linesError.message }, { status: 500 })
  }

  const recipients = String(dossier.contact_email || '')
    .split(/[;,\s]+/)
    .map((email) => email.trim())
    .filter(Boolean)
  const invalidRecipient = recipients.find((email) => !/^\S+@\S+\.\S+$/.test(email))
  if (!recipients.length) {
    return Response.json(
      { error: 'Aucune adresse e-mail n’est renseignée pour le donneur d’ordre.' },
      { status: 400 },
    )
  }
  if (invalidRecipient) {
    return Response.json(
      { error: `Adresse e-mail invalide : ${invalidRecipient}` },
      { status: 400 },
    )
  }
  const recipient = recipients.join(', ')

  const contactName = escapeHtml(String(dossier.contact_name || 'Madame, Monsieur'))
  const rawPropertyAddress = String(
    dossier.property_address || dossier.dossier_name || 'le bien concerné',
  )
  const propertyAddress = escapeHtml(rawPropertyAddress)

  const calculatedTotal = Math.round(
    (lines || []).reduce(
      (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0),
      0,
    ) * 100,
  ) / 100

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">18 rue de Budapest · 94140 Alfortville · 06 15 70 36 70</div>
      </div>
      <p>Bonjour,</p>
      <p>Suite à votre demande, vous trouverez ci-joint notre proposition commerciale pour la réalisation des diagnostics souhaités, relatifs au bien mentionné en objet.</p>
      <p>Si cette offre vous convient, nous vous remercions de bien vouloir nous la retourner signée et datée, accompagnée de la mention « Bon pour accord ».</p>
      <p>Nous vous invitons également à compléter le formulaire de consentement joint${quote.property_type === 'house' || quote.property_type === 'apartment' ? ' et à nous transmettre l’identifiant fiscal du bien concerné' : ''}.</p>
      <p>Nous vous remercions pour votre confiance et restons à votre entière disposition pour tout complément d’information concernant ce devis.</p>
      <p>En vous souhaitant bonne réception,<br>Cordialement,</p>
      <p style="margin-top:20px">Le service client<br><br><strong>ARIA Diagnostics</strong><br>📞 06 15 70 36 70<br>✉️ contact@aria-diagnostics.fr</p>
      ${await reviewsEmailBlock()}
    </div>`

  let pdfBase64 = ''
  try {
    const diagnostics = Array.isArray(dossier.diagnostics)
      ? dossier.diagnostics.map(String).filter(Boolean)
      : String(dossier.diagnostics || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)

    const extras = await loadDossierPdfExtras(supabase, dossier as Record<string, unknown>)
    const pdfBytes = await generateQuotePdf({
      ...extras,
      quoteNumber: quote.quote_number,
      createdAt: quote.created_at,
      contactName: dossier.contact_name,
      contactEmail: dossier.contact_email,
      contactPhone: dossier.contact_phone,
      propertyAddress: rawPropertyAddress,
      propertyLabel:
        quote.property_type === 'house'
          ? 'Maison'
          : quote.property_type === 'apartment'
            ? 'Appartement'
            : quote.property_type === 'local'
              ? 'Local professionnel'
              : quote.property_type === 'immeuble'
                ? 'Immeuble'
                : quote.property_type === 'travaux'
                  ? 'Avant travaux / démolition'
                  : 'Bien',
      propertySize: quote.property_size,
      notes: quote.notes,
      diagnostics,
      origin: new URL(request.url).origin,
      lines: (lines || []).map((line) => ({
        label: String(line.label || 'Prestation'),
        quantity: Number(line.quantity || 0),
        unit_ttc: Number(line.unit_ttc || 0),
      })),
    })
    pdfBase64 = Buffer.from(pdfBytes).toString('base64')
  } catch (pdfError) {
    console.error('Quote PDF generation failed', pdfError)
    return Response.json(
      { error: 'Le PDF du devis n’a pas pu être généré. L’e-mail n’a pas été envoyé.' },
      { status: 500 },
    )
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>',
      to: recipients,
      reply_to: 'contact@aria-diagnostics.fr',
      subject: `Devis ${quote.quote_number} – ${rawPropertyAddress}`,
      html,
      attachments: [
        {
          filename: `${quote.quote_number}.pdf`,
          content: pdfBase64,
        },
      ],
    }),
  })

  const resendData = await resendResponse.json().catch(() => ({}))
  if (!resendResponse.ok) {
    return Response.json(
      { error: resendErrorMessage(resendData) },
      { status: resendResponse.status },
    )
  }

  const sentAt = new Date().toISOString()
  const { error: quoteUpdateError } = await supabase
    .from('quotes')
    .update({ status: 'sent', total_ttc: calculatedTotal })
    .eq('id', quote.id)

  const { error: dossierUpdateError } = await supabase
    .from('dossiers')
    .update({ status: 'quote_sent' })
    .eq('id', quote.dossier_id)

  await supabase.from('quote_email_events').insert({
    quote_id: quote.id,
    dossier_id: quote.dossier_id,
    recipient,
    resend_email_id: resendData.id || null,
    sent_at: sentAt,
  })

  const warnings = [
    quoteUpdateError ? `statut devis non mis à jour : ${quoteUpdateError.message}` : '',
    dossierUpdateError ? `statut dossier non mis à jour : ${dossierUpdateError.message}` : '',
  ].filter(Boolean)

  return Response.json({
    ok: true,
    sent: true,
    emailId: resendData.id,
    recipient,
    sentAt,
    attachment: `${quote.quote_number}.pdf`,
    warnings,
  })
}
