import { createClient } from '@supabase/supabase-js'

// Le client (Mon espace) ajoute des options à un devis envoyé, juste avant de
// l'accepter. Contrôles : session obligatoire ; le devis doit être visible
// par ce compte (lecture sous RLS avec le jeton du client) et encore au
// statut « sent » ; seules des lignes option (quantité 0) de CE devis passent
// à la quantité 1. Les totaux sont recalculés côté serveur.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token) return Response.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 })
  if (!url || !anon || !service) return Response.json({ error: 'Configuration manquante.' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const lineIds: string[] = Array.isArray(body?.line_ids) ? body.line_ids.filter((x: unknown) => typeof x === 'string').slice(0, 20) : []

  const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: quote } = await asUser.from('quotes').select('id,status').eq('id', id).maybeSingle()
  if (!quote) return Response.json({ error: 'Devis introuvable.' }, { status: 404 })
  if (quote.status !== 'sent') return Response.json({ error: 'Ce devis n’est plus modifiable.' }, { status: 409 })

  const admin = createClient(url, service, { auth: { persistSession: false } })
  if (lineIds.length) {
    const { error } = await admin.from('quote_lines').update({ quantity: 1 }).eq('quote_id', id).eq('quantity', 0).gt('unit_ttc', 0).in('id', lineIds)
    if (error) return Response.json({ error: 'Impossible d’ajouter les options.' }, { status: 500 })
    const { data: lines } = await admin.from('quote_lines').select('id,quantity,unit_ttc').eq('quote_id', id)
    for (const l of lines || []) await admin.from('quote_lines').update({ total_ttc: Number(l.quantity) * Number(l.unit_ttc) }).eq('id', l.id)
    const ttc = Math.round((lines || []).reduce((s, l) => s + Number(l.quantity) * Number(l.unit_ttc), 0) * 100) / 100
    const ht = Math.round((ttc / 1.2) * 100) / 100
    await admin.from('quotes').update({ total_ttc: ttc, total_ht: ht, total_vat: Math.round((ttc - ht) * 100) / 100 }).eq('id', id)
    return Response.json({ total_ttc: ttc })
  }
  return Response.json({ total_ttc: null })
}
