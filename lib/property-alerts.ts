// Règle déjà codée dans app/dossiers/nouveau/page.tsx (constructionYearAlerts),
// reprise ici à l'identique (même texte, même seuils, même logique) pour
// app/assistant/page.tsx, sans modifier cette page existante. Si les seuils
// changent un jour, il faudra les répercuter aux deux endroits.
export const constructionYearAlerts = (year: number): string[] => {
  if (!Number.isInteger(year)) return []
  const alerts: string[] = []
  if (year < 1949) alerts.push('Bien antérieur à 1949 — le diagnostic plomb (CREP) est obligatoire pour ce type de bien en cas de vente ou location')
  else if (year < 1997) alerts.push('Bien antérieur à 1997 — un diagnostic amiante est obligatoire en cas de vente, ou en cas de travaux')
  if (new Date().getFullYear() - year >= 15) {
    alerts.push('Installation électrique potentiellement âgée de plus de 15 ans — le diagnostic électricité est obligatoire en cas de vente ou location si l’installation a plus de 15 ans (à vérifier sur place, une rénovation récente peut changer la donne)')
    alerts.push('Installation gaz potentiellement âgée de plus de 15 ans — le diagnostic gaz est obligatoire en cas de vente ou location si l’installation a plus de 15 ans (à vérifier sur place, une rénovation récente peut changer la donne)')
  }
  return alerts
}
