import { createClient } from '@supabase/supabase-js'
import { generateQuotePdf } from '@/lib/quote-pdf'

export async function GET(
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

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
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
    .select('id,quote_number,created_at,dossier_id,property_type,property_size,notes')
    .eq('id', id)
    .single()

  if (quoteError || !quote) {
    return Response.json({ error: quoteError?.message || 'Devis introuvable.' }, { status: 404 })
  }

  const [{ data: dossier, error: dossierError }, { data: lines, error: linesError }] =
    await Promise.all([
      supabase
        .from('dossiers')
        .select('id,dossier_name,property_address,contact_name,contact_email,contact_phone,diagnostics')
        .eq('id', quote.dossier_id)
        .single(),
      supabase
        .from('quote_lines')
        .select('label,quantity,unit_ttc,sort_order')
        .eq('quote_id', quote.id)
        .order('sort_order', { ascending: true }),
    ])

  if (dossierError || !dossier) {
    return Response.json({ error: dossierError?.message || 'Dossier introuvable.' }, { status: 404 })
  }

  if (linesError) {
    return Response.json({ error: linesError.message }, { status: 500 })
  }

  try {
    const diagnostics = Array.isArray(dossier.diagnostics)
      ? dossier.diagnostics.map(String).filter(Boolean)
      : String(dossier.diagnostics || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)

    const pdfBytes = await generateQuotePdf({
      quoteNumber: quote.quote_number,
      createdAt: quote.created_at,
      contactName: dossier.contact_name,
      contactEmail: dossier.contact_email,
      contactPhone: dossier.contact_phone,
      propertyAddress: dossier.property_address || dossier.dossier_name || 'Adresse du bien non renseignée',
      propertyLabel:
        quote.property_type === 'house'
          ? 'Maison'
          : quote.property_type === 'apartment'
            ? 'Appartement'
            : 'Bien',
      propertySize: quote.property_size,
      notes: quote.notes,
      diagnostics,
      lines: (lines || []).map((line) => ({
        label: String(line.label || 'Prestation'),
        quantity: Number(line.quantity || 0),
        unit_ttc: Number(line.unit_ttc || 0),
      })),
    })

    const pdfBody = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(pdfBody).set(pdfBytes)

    return new Response(pdfBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('quote pdf preview error', error)
    return Response.json({ error: 'Impossible de générer le PDF du devis.' }, { status: 500 })
  }
}
