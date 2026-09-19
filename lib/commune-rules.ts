// Relevé des arrêtés préfectoraux "termites" pour les 47 communes du
// Val-de-Marne, utilisé par /assistant (lib/property-alerts.ts) pour
// déterminer l'obligation du diagnostic termites en cas de vente.
//
// Source : recherche par département (94) sur https://termite.com.fr/rechercher,
// complétée par la lecture du texte de certains arrêtés (Recueils des Actes
// Administratifs de la Préfecture du Val-de-Marne, sites municipaux) pour
// distinguer une couverture "entière" d'une "zone délimitée". Quand ce texte
// n'a pas été trouvé, la couverture est classée "partielle" par prudence ;
// "inconnu" signale un cas où même cette classification par défaut n'a pas pu
// être établie avec confiance (ex. Cachan : le site indique "aucun arrêté"
// mais une source tierce évoque un ancien arrêté partiel non confirmé ici).
//
// Ce fichier est la seule source de vérité pour ces données : ne pas
// dupliquer la liste des communes ou les libellés de couverture ailleurs.
export const COMMUNE_RULES_SOURCE = 'termite.com.fr'
export const COMMUNE_RULES_SURVEY_DATE = '19/09/2026'

export type CommuneCoverage = 'entiere' | 'partielle' | 'aucun' | 'inconnu'

export type CommuneRule = {
  slug: string
  name: string
  coverage: CommuneCoverage
  arreteRefs: string[]
}

export const COMMUNE_RULES: CommuneRule[] = [
  { slug: 'ablon-sur-seine', name: 'Ablon-sur-Seine', coverage: 'aucun', arreteRefs: [] },
  { slug: 'alfortville', name: 'Alfortville', coverage: 'aucun', arreteRefs: [] },
  { slug: 'arcueil', name: 'Arcueil', coverage: 'aucun', arreteRefs: [] },
  { slug: 'boissy-saint-leger', name: 'Boissy-Saint-Léger', coverage: 'aucun', arreteRefs: [] },
  { slug: 'bonneuil-sur-marne', name: 'Bonneuil-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  { slug: 'bry-sur-marne', name: 'Bry-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  // termite.com.fr indique "aucun arrêté" pour Cachan, mais la référence
  // ci-dessous vient d'un récapitulatif national officiel des arrêtés
  // "termites" (source : juri-logement.org, relevé le 19/09/2026), qui cite
  // un arrêté du 16/10/2000 n°2000/3785 pour Cachan "aux adresses indiquées"
  // (zone délimitée). Classé "partielle" sur cette base (2026-09-19).
  { slug: 'cachan', name: 'Cachan', coverage: 'partielle', arreteRefs: ['16/10/2000 - n°2000/3785 (zone délimitée, aux adresses indiquées)'] },
  { slug: 'champigny-sur-marne', name: 'Champigny-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  { slug: 'charenton-le-pont', name: 'Charenton-le-Pont', coverage: 'aucun', arreteRefs: [] },
  { slug: 'chennevieres-sur-marne', name: 'Chennevières-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  { slug: 'chevilly-larue', name: 'Chevilly-Larue', coverage: 'aucun', arreteRefs: [] },
  { slug: 'choisy-le-roi', name: 'Choisy-le-Roi', coverage: 'partielle', arreteRefs: ['07/04/2015 - n°2015/885'] },
  { slug: 'creteil', name: 'Créteil', coverage: 'partielle', arreteRefs: ['16/10/2000 - n°2000/3786', '28/10/2011 - n°2011/3627'] },
  { slug: 'fontenay-sous-bois', name: 'Fontenay-sous-Bois', coverage: 'partielle', arreteRefs: ['06/07/2015 - n°2015/1918', '03/03/2021 - n°2021/00723'] },
  { slug: 'fresnes', name: 'Fresnes', coverage: 'aucun', arreteRefs: [] },
  { slug: 'gentilly', name: 'Gentilly', coverage: 'entiere', arreteRefs: ['18/11/2013 - n°2013/3382'] },
  { slug: 'ivry-sur-seine', name: 'Ivry-sur-Seine', coverage: 'entiere', arreteRefs: ['16/10/2000 - n°2000/3787'] },
  { slug: 'joinville-le-pont', name: 'Joinville-le-Pont', coverage: 'aucun', arreteRefs: [] },
  { slug: 'lhay-les-roses', name: 'L’Haÿ-les-Roses', coverage: 'aucun', arreteRefs: [] },
  { slug: 'la-queue-en-brie', name: 'La Queue-en-Brie', coverage: 'aucun', arreteRefs: [] },
  { slug: 'le-kremlin-bicetre', name: 'Le Kremlin-Bicêtre', coverage: 'aucun', arreteRefs: [] },
  { slug: 'le-perreux-sur-marne', name: 'Le Perreux-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  { slug: 'le-plessis-trevise', name: 'Le Plessis-Trévise', coverage: 'aucun', arreteRefs: [] },
  { slug: 'limeil-brevannes', name: 'Limeil-Brévannes', coverage: 'aucun', arreteRefs: [] },
  { slug: 'maisons-alfort', name: 'Maisons-Alfort', coverage: 'partielle', arreteRefs: ['16/10/2000 - n°2000/3788', '09/07/2001 - n°2001/2476 (modificatif)'] },
  { slug: 'mandres-les-roses', name: 'Mandres-les-Roses', coverage: 'aucun', arreteRefs: [] },
  { slug: 'marolles-en-brie', name: 'Marolles-en-Brie', coverage: 'aucun', arreteRefs: [] },
  { slug: 'nogent-sur-marne', name: 'Nogent-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  { slug: 'noiseau', name: 'Noiseau', coverage: 'aucun', arreteRefs: [] },
  { slug: 'orly', name: 'Orly', coverage: 'partielle', arreteRefs: ['13/10/2022 (numéro non identifié)'] },
  { slug: 'ormesson-sur-marne', name: 'Ormesson-sur-Marne', coverage: 'aucun', arreteRefs: [] },
  // Paris n'est pas l'une des 47 communes du Val-de-Marne, mais est ajouté à
  // la demande de l'utilisateur (2026-09-19). Vérifié sur termite.com.fr
  // (recherche département 75 : les 20 arrondissements partagent un même
  // arrêté du 21/03/2003) et sur le texte officiel de cet arrêté
  // (juri-logement.org) : "zone de surveillance... sur l'ensemble du
  // département de Paris" — couverture confirmée "entière".
  { slug: 'paris', name: 'Paris', coverage: 'entiere', arreteRefs: ['21/03/2003 - Arrêté préfectoral (numéro non identifié) - ensemble du département de Paris'] },
  { slug: 'perigny', name: 'Périgny', coverage: 'aucun', arreteRefs: [] },
  { slug: 'rungis', name: 'Rungis', coverage: 'aucun', arreteRefs: [] },
  { slug: 'saint-mande', name: 'Saint-Mandé', coverage: 'aucun', arreteRefs: [] },
  { slug: 'saint-maur-des-fosses', name: 'Saint-Maur-des-Fossés', coverage: 'partielle', arreteRefs: ['30/06/2014 - n°2014/6057', '20/10/2014 (numéro non identifié)'] },
  { slug: 'saint-maurice', name: 'Saint-Maurice', coverage: 'aucun', arreteRefs: [] },
  { slug: 'santeny', name: 'Santeny', coverage: 'aucun', arreteRefs: [] },
  { slug: 'sucy-en-brie', name: 'Sucy-en-Brie', coverage: 'aucun', arreteRefs: [] },
  { slug: 'thiais', name: 'Thiais', coverage: 'aucun', arreteRefs: [] },
  { slug: 'valenton', name: 'Valenton', coverage: 'aucun', arreteRefs: [] },
  { slug: 'villecresnes', name: 'Villecresnes', coverage: 'aucun', arreteRefs: [] },
  { slug: 'villejuif', name: 'Villejuif', coverage: 'entiere', arreteRefs: ['04/09/2013 - n°2013/2592'] },
  { slug: 'villeneuve-le-roi', name: 'Villeneuve-le-Roi', coverage: 'aucun', arreteRefs: [] },
  { slug: 'villeneuve-saint-georges', name: 'Villeneuve-Saint-Georges', coverage: 'aucun', arreteRefs: [] },
  { slug: 'villiers-sur-marne', name: 'Villiers-sur-Marne', coverage: 'partielle', arreteRefs: ['13/11/2000 - n°2000/4151'] },
  { slug: 'vincennes', name: 'Vincennes', coverage: 'aucun', arreteRefs: [] },
  { slug: 'vitry-sur-seine', name: 'Vitry-sur-Seine', coverage: 'partielle', arreteRefs: ['17/03/2009 - n°2009/961'] },
]

// Valeur de sélection réservée à "Autre commune" (hors Val-de-Marne ou non
// listée) : traitée comme couverture "inconnu" par lib/property-alerts.ts.
export const OTHER_COMMUNE_SLUG = 'autre'

export const getCommuneRule = (slug: string | null): CommuneRule | null =>
  slug ? COMMUNE_RULES.find((c) => c.slug === slug) ?? null : null

export const getCommuneCoverage = (slug: string | null): CommuneCoverage =>
  slug && slug !== OTHER_COMMUNE_SLUG ? getCommuneRule(slug)?.coverage ?? 'inconnu' : 'inconnu'
