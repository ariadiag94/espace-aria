const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const PROPERTY_TYPE_LABEL: Record<string, string> = { apartment: 'Appartement', house: 'Maison' }
const PURPOSE_LABEL: Record<string, string> = { sale: 'Vente', rental: 'Location', alaCarte: 'Diagnostics à la carte' }
const DEPENDENCY_LABEL: Record<string, string> = { cave: 'Cave', garage: 'Garage', parking: 'Parking', autre: 'Autre' }
const PRICE_STATUS_LABEL: Record<string, string> = {
  estimated: 'Estimé',
  quote_on_request: 'Devis personnalisé (hors grille de packs)',
  no_match: 'Devis personnalisé (aucune correspondance de prix)',
}

// diagnostics_summary a deux formes possibles selon le parcours (voir
// app/assistant/page.tsx) : mandatory/toConfirm/options pour vente/location,
// checkedItems pour "à la carte". On extrait juste les champs qu'on
// reconnaît, sans supposer une forme précise (ce payload vient du client).
const summaryLines = (summary: unknown): string[] => {
  const lines: string[] = []
  if (!summary || typeof summary !== 'object') return lines
  const s = summary as Record<string, unknown>

  const labelJoin = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => (item && typeof item === 'object' ? String((item as Record<string, unknown>).label || '') : String(item || '')))
          .filter(Boolean)
          .join(', ')
      : ''

  if (typeof s.sizeLabel === 'string' && s.sizeLabel) lines.push(`Taille : ${s.sizeLabel}`)
  if (typeof s.communeSlug === 'string' && s.communeSlug) lines.push(`Commune : ${s.communeSlug}`)
  const mandatory = labelJoin(s.mandatory)
  if (mandatory) lines.push(`Diagnostics obligatoires : ${mandatory}`)
  const toConfirm = labelJoin(s.toConfirm)
  if (toConfirm) lines.push(`À confirmer : ${toConfirm}`)
  const options = labelJoin(s.options)
  if (options) lines.push(`Options : ${options}`)
  if (Array.isArray(s.checkedItems) && s.checkedItems.length) {
    lines.push(`Diagnostics sélectionnés : ${s.checkedItems.map(String).join(', ')}`)
  }
  if (s.assainissement === true) lines.push('Assainissement : oui')
  if (typeof s.hasGas === 'boolean') lines.push(`Installation gaz : ${s.hasGas ? 'oui' : 'non'}`)
  if (typeof s.priceStatus === 'string' && PRICE_STATUS_LABEL[s.priceStatus]) {
    lines.push(`Statut du prix : ${PRICE_STATUS_LABEL[s.priceStatus]}`)
  }
  return lines
}

// Endpoint public (pas d'authentification staff, distinct de
// app/api/devis/[id]/send/route.ts) : notifie l'équipe d'un nouveau lead créé
// depuis /assistant. Appelé après l'écriture dans public.leads (voir
// LeadCaptureForm) ; son échec ne doit jamais empêcher la confirmation déjà
// affichée au client, le lead étant de toute façon déjà en base.
export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return Response.json({ error: 'Le service d’envoi ARIA n’est pas encore configuré.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const contactName = String(body?.contact_name || '').trim()
  const contactPhone = String(body?.contact_phone || '').trim()
  const contactEmail = String(body?.contact_email || '').trim()

  if (!contactName || !contactPhone || !contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return Response.json({ error: 'Coordonnées invalides ou incomplètes.' }, { status: 400 })
  }

  const propertyAddress = body?.property_address ? String(body.property_address).trim() : ''
  const floor = body?.floor ? String(body.floor).trim() : ''
  const dependencies = Array.isArray(body?.dependencies)
    ? body.dependencies.map((id: unknown) => DEPENDENCY_LABEL[String(id)] || String(id)).filter(Boolean)
    : []
  const propertyType = String(body?.property_type || '')
  const purpose = String(body?.purpose || '')
  const estimatedPrice = typeof body?.estimated_price === 'number' ? body.estimated_price : null
  const priceText = estimatedPrice !== null
    ? estimatedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) + ' TTC'
    : 'Devis personnalisé (à établir)'

  const summary = summaryLines(body?.diagnostics_summary)

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#24374c;line-height:1.5;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #0b6cb8;padding-bottom:14px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:700;color:#062b59">ARIA Diagnostics</div>
        <div style="font-size:13px;color:#66788c">Nouvelle demande depuis /assistant</div>
      </div>
      <p><strong>${escapeHtml(contactName)}</strong></p>
      <ul style="padding-left:18px;margin:0 0 18px">
        <li>Téléphone : ${escapeHtml(contactPhone)}</li>
        <li>Email : ${escapeHtml(contactEmail)}</li>
        ${propertyAddress ? `<li>Adresse du bien : ${escapeHtml(propertyAddress)}</li>` : ''}
        ${floor ? `<li>Étage : ${escapeHtml(floor)}</li>` : ''}
        ${dependencies.length ? `<li>Dépendances : ${escapeHtml(dependencies.join(', '))}</li>` : ''}
        <li>Type de bien : ${escapeHtml(PROPERTY_TYPE_LABEL[propertyType] || propertyType)}</li>
        <li>Objet : ${escapeHtml(PURPOSE_LABEL[purpose] || purpose)}</li>
        <li>Estimation : ${escapeHtml(priceText)}</li>
      </ul>
      ${summary.length ? `<ul style="padding-left:18px;margin:0 0 18px;color:#44586c">${summary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
      <p style="margin-top:24px;color:#66788c;font-size:12px">Lead créé automatiquement depuis le parcours public /assistant.</p>
    </div>`

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARIA Diagnostics <contact@aria-diagnostics.fr>',
      // Destinataire distinct de l'expéditeur (voir diagnostic du
      // 2026-09-20) : envoyer à contact@aria-diagnostics.fr depuis
      // contact@aria-diagnostics.fr est un schéma "self-send" que Gmail
      // (qui héberge cette boîte) filtre silencieusement malgré un statut
      // "Delivered" côté Resend — jamais mis en spam, jamais en boîte
      // de réception non plus.
      to: 'ermansola@gmail.com',
      reply_to: contactEmail,
      subject: `Nouvelle demande /assistant — ${contactName}`,
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
