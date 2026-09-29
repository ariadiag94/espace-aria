import { createClient } from '@supabase/supabase-js'
import { generateQuotePdf } from '@/lib/quote-pdf'
import { buildLeadQuote, type LeadRow } from '@/lib/lead-quote'

// Envoi automatique au client, en fin de /assistant, du PDF "devis estimatif
// + ordre de mission + CGV/CGI/annexes" (décision du 2026-09-27 : 100 %
// automatique, sans validation humaine).
//
// Garde-fous (voir supabase/migrations/024_leads_client_documents.sql) :
// - session obligatoire (Bearer), utilisateur ayant has_assistant_access() ;
// - le lead doit avoir été créé par cet utilisateur, il y a moins de 15 min ;
// - un seul envoi par lead (réservation atomique côté base) ;
// - destinataire = uniquement l'adresse enregistrée dans le lead (jamais
//   une adresse transmise dans la requête) ;
// - prix = estimated_price enregistré (montant affiché au client) ; hors
//   grille ("devis personnalisé"), rien n'est envoyé : ARIA établit le devis.
//
// L'échec de cette route n'annule jamais la demande : le lead est déjà en
// base et la notification interne (/api/leads/notify) part de son côté.

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const euro = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ error: 'Session requise.' }, { status: 401 })
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Demande invalide.' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!supabaseUrl || !supabaseKey) return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  if (!resendApiKey) return Response.json({ error: 'Le service d’envoi ARIA n’est pas encore configuré.' }, { status: 503 })

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return Response.json({ error: 'Session invalide.' }, { status: 401 })

  // Réservation atomique : renvoie le lead uniquement si toutes les
  // conditions sont réunies (auteur, accès, délai, pas déjà envoyé).
  const { data: claimed, error: claimError } = await supabase.rpc('claim_lead_client_documents', { p_lead_id: id })
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 })
  const lead = (Array.isArray(claimed) ? claimed[0] : claimed) as LeadRow | null
  if (!lead) {
    return Response.json({ error: 'Envoi impossible pour cette demande (déjà envoyée, expirée ou non autorisée).' }, { status: 409 })
  }

  const release = () => supabase.rpc('finish_lead_client_documents', { p_lead_id: id, p_success: false })

  const recipient = String(lead.contact_email || '').trim()
  if (!/^\S+@\S+\.\S+$/.test(recipient)) {
    await release()
    return Response.json({ error: 'Adresse e-mail du client invalide.' }, { status: 400 })
  }

  const content = buildLeadQuote(lead)
  if (!content.eligible) {
    // Pas d'envoi automatique : la réservation est libérée, ARIA traitera
    // la demande manuellement via /devis (la notification interne est partie).
    await release()
    return Response.json({ ok: true, sent: false, reason: content.reason })
  }

  const propertyAddress = String(lead.property_address || 'le bien concerné')

  let pdfBase64 = ''
  try {
    const pdfBytes = await generateQuotePdf({
      quoteNumber: content.quoteNumber,
      createdAt: lead.created_at,
      contactName: lead.contact_name,
      contactEmail: lead.contact_email,
      contactPhone: lead.contact_phone,
      propertyAddress,
      propertyLabel: content.propertyLabel,
      propertySize: content.propertySize,
      notes: `Devis estimatif sur informations déclarées${content.proDiscount ? ', tarif partenaire -10 % inclus' : ''}.${content.surfaceAttestationProvided ? ' À défaut d’attestation de surface transmise avant l’intervention, le mesurage sera réalisé sur place et facturé en supplément, au tarif du pack DPE + surface.' : ''}`,
      diagnostics: content.diagnostics,
      missionTechnicalInfo: content.technicalInfo,
      dependencies: Array.isArray(lead.dependencies) ? lead.dependencies : [],
      origin: new URL(request.url).origin,
      lines: content.lines,
    })
    pdfBase64 = Buffer.from(pdfBytes).toString('base64')
  } catch (pdfError) {
    console.error('Lead PDF generation failed', pdfError)
    await release()
    return Response.json({ error: 'Le PDF n’a pas pu être généré.' }, { status: 500 })
  }

  const contactName = escapeHtml(String(lead.contact_name || 'Madame, Monsieur'))
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">18 rue de Budapest · 94140 Alfortville · 06 15 70 36 70</div>
      </div>
      <p>Bonjour ${contactName},</p>
      <p>Merci pour votre demande concernant <strong>${escapeHtml(propertyAddress)}</strong>.</p>
      <p>Vous trouverez ci-joint votre devis estimatif <strong>${escapeHtml(content.quoteNumber)}</strong> (${escapeHtml(euro(content.total))} TTC), accompagné de l’ordre de mission, des conditions générales et des annexes applicables.</p>
      ${content.surfaceAttestationProvided ? '<p>Ce devis est établi sur la base de votre attestation de surface : merci de nous la transmettre en réponse à cet e-mail avant l’intervention. À défaut, le mesurage sera réalisé sur place et facturé en supplément.</p>' : ''}
      <p>Pour confirmer la mission, il vous suffit de nous retourner l’ordre de mission signé (mention « Bon pour accord »), en réponse à cet e-mail. Nous vous recontactons sous 24 h ouvrées pour fixer le rendez-vous.</p>
      <p style="color:#66788c;font-size:12px">Devis établi sur la base des informations déclarées, sous réserve de conformité du bien constatée par ARIA Diagnostics.</p>
      <p style="margin-top:24px">Cordialement,<br><strong>ARIA Diagnostics</strong><br>06 15 70 36 70<br>contact@aria-diagnostics.fr</p>
    </div>`

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>',
      to: [recipient],
      // Copie à ARIA (même raison que /api/leads/notify : pas d'envoi vers
      // l'adresse expéditrice, filtré silencieusement par Gmail).
      bcc: ['ermansola@gmail.com'],
      reply_to: 'contact@aria-diagnostics.fr',
      subject: `Votre devis ARIA Diagnostics ${content.quoteNumber}`,
      html,
      attachments: [{ filename: `${content.quoteNumber}.pdf`, content: pdfBase64 }],
    }),
  })

  const resendData = await resendResponse.json().catch(() => ({}))
  if (!resendResponse.ok) {
    await release()
    return Response.json(
      { error: String(resendData?.message || resendData?.error || 'Échec de l’envoi.') },
      { status: resendResponse.status },
    )
  }

  await supabase.rpc('finish_lead_client_documents', { p_lead_id: id, p_success: true, p_email_id: resendData.id || null })

  return Response.json({ ok: true, sent: true, emailId: resendData.id, quoteNumber: content.quoteNumber })
}
