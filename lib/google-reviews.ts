// Avis Google d'ARIA : lien vers la fiche et note moyenne (si la clé
// GOOGLE_PLACES_API_KEY est configurée). Sans clé ou en cas d'erreur, seul le
// lien est affiché — jamais de note inventée.
export const ARIA_GOOGLE_PLACE_ID = 'ChIJNaCHLkJz5kcR37FYeVZTLy0'
export const GOOGLE_REVIEWS_URL = `https://search.google.com/local/reviews?placeid=${ARIA_GOOGLE_PLACE_ID}`

export async function getGoogleReviewSummary(): Promise<{ rating: number; total: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${ARIA_GOOGLE_PLACE_ID}&fields=rating,user_ratings_total&key=${apiKey}`
    const response = await fetch(url, { next: { revalidate: 86400 } })
    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== 'OK' || typeof data.result?.rating !== 'number') return null
    return { rating: data.result.rating, total: Number(data.result.user_ratings_total) || 0 }
  } catch {
    return null
  }
}

export async function reviewsEmailBlock(): Promise<string> {
  const summary = await getGoogleReviewSummary()
  const stars = summary ? '★'.repeat(Math.round(summary.rating)) + '☆'.repeat(5 - Math.round(summary.rating)) : '★★★★★'
  const headline = summary
    ? `${summary.rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5 – ${summary.total} avis clients sur Google`
    : 'Nos clients nous recommandent'
  return `
      <div style="margin-top:24px;padding:14px 16px;border:1px solid #cfe7f6;border-radius:12px;background:#EAF5FC">
        <div style="color:#f5a623;font-size:18px;letter-spacing:2px">${stars}</div>
        <div style="font-weight:700;color:#062b59;margin-top:2px">${headline}</div>
        <a href="${GOOGLE_REVIEWS_URL}" style="display:inline-block;margin-top:6px;color:#0b65b5;font-weight:700;text-decoration:none">Découvrir les avis de nos clients →</a>
      </div>`
}
