// Suggestions d'adresses (autocomplétion) via le service public de géocodage
// de la Géoplateforme (IGN, ex-API Adresse / Base Adresse Nationale).
// Appel côté serveur : pas de dépendance au CORS du service, réponse
// simplifiée pour le formulaire /assistant.
const ENDPOINT = 'https://data.geopf.fr/geocodage/search'

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  const city = (url.searchParams.get('city') || '').trim()
  if (q.length < 3) return Response.json({ results: [] })

  const params = new URLSearchParams({ q: city ? `${q} ${city}` : q, limit: '8', autocomplete: '1', index: 'address' })
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) return Response.json({ results: [] })
    const data = await res.json()
    const features: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }> = Array.isArray(data?.features) ? data.features : []
    const results = features
      .map((f) => ({ ...(f.properties || {}), _coords: f.geometry?.coordinates || [] }) as Record<string, unknown>)
      .filter((p) => !city || norm(String(p.city || '')) === norm(city))
      .map((p) => ({
        lon: Array.isArray(p._coords) ? Number((p._coords as number[])[0]) : null,
        lat: Array.isArray(p._coords) ? Number((p._coords as number[])[1]) : null,
        label: String(p.label || ''),
        street: String(p.street || p.name || ''),
        postcode: String(p.postcode || ''),
        city: String(p.city || ''),
        type: String(p.type || ''),
      }))
      .filter((r) => r.label)
      .slice(0, 6)
    return Response.json({ results })
  } catch {
    return Response.json({ results: [] })
  }
}
