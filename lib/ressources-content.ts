// Contenu de la rubrique « Ressources » destinée aux professionnels
// (agences, syndics, notaires). Information générale vérifiée sur les sources
// officielles au 30/09/2026 (service-public.gouv.fr, ANIL, Légifrance,
// ecologie.gouv.fr) — à relire à chaque évolution réglementaire.

export const RESSOURCES_UPDATED_AT = '30/09/2026'

export type DiagRow = { name: string; when: string; validity: string }

export const VENTE_DIAGS: DiagRow[] = [
  { name: 'Diagnostic de performance énergétique (DPE)', when: 'Tout logement mis en vente', validity: '10 ans (les DPE réalisés entre le 01/01/2018 et le 30/06/2021 ne sont plus valables depuis le 01/01/2025)' },
  { name: 'Audit énergétique', when: 'Maison individuelle ou immeuble en monopropriété classé E, F ou G (D à partir du 01/01/2034)', validity: '5 ans' },
  { name: 'Constat de risque d’exposition au plomb (CREP)', when: 'Permis de construire antérieur au 01/01/1949', validity: 'Illimitée si absence de plomb, sinon 1 an' },
  { name: 'État amiante', when: 'Permis de construire délivré avant le 01/07/1997', validity: 'Illimitée si absence d’amiante (repérage réalisé depuis le 01/04/2013), sinon nouveau contrôle à prévoir' },
  { name: 'État de l’installation intérieure d’électricité', when: 'Installation de plus de 15 ans', validity: '3 ans' },
  { name: 'État de l’installation intérieure de gaz', when: 'Installation de plus de 15 ans', validity: '3 ans' },
  { name: 'État relatif à la présence de termites', when: 'Bien situé dans une zone délimitée par arrêté préfectoral', validity: '6 mois' },
  { name: 'État des risques et pollutions (ERP)', when: 'Bien situé dans une zone à risques (naturels, miniers, technologiques, sismicité, radon)', validity: '6 mois' },
  { name: 'Assainissement non collectif', when: 'Logement non raccordé au tout-à-l’égout (contrôle réalisé par le service public, SPANC)', validity: '3 ans' },
  { name: 'Diagnostic bruit', when: 'Bien situé dans une zone d’exposition au bruit d’un aérodrome', validity: 'Selon le plan en vigueur' },
  { name: 'Information mérule', when: 'Zone délimitée par arrêté préfectoral : mention dans l’acte de vente', validity: '—' },
  { name: 'Mesurage loi Carrez', when: 'Lot de copropriété (appartement)', validity: 'Sans limite, tant que le lot n’est pas modifié' },
]

export const LOCATION_DIAGS: DiagRow[] = [
  { name: 'Diagnostic de performance énergétique (DPE)', when: 'Tout logement loué (sauf exceptions : monuments historiques, logement occupé moins de 4 mois par an)', validity: '10 ans' },
  { name: 'Constat de risque d’exposition au plomb (CREP)', when: 'Immeuble construit avant le 01/01/1949', validity: '6 ans si présence de plomb, illimitée sinon' },
  { name: 'État de l’installation intérieure d’électricité', when: 'Installation de plus de 15 ans', validity: '6 ans' },
  { name: 'État de l’installation intérieure de gaz', when: 'Installation de plus de 15 ans', validity: '6 ans' },
  { name: 'État des risques et pollutions (ERP)', when: 'Bien situé dans une zone à risques', validity: '6 mois' },
  { name: 'Diagnostic bruit', when: 'Zone d’exposition au bruit d’un aérodrome (depuis le 01/07/2020)', validity: 'Selon le plan en vigueur' },
  { name: 'Amiante parties privatives (DAPP)', when: 'Immeuble collectif dont le permis est antérieur au 01/07/1997 : tenu à disposition du locataire (non annexé au bail)', validity: 'Illimitée si absence d’amiante' },
  { name: 'Surface habitable (loi Boutin)', when: 'Location vide ou meublée à titre de résidence principale : mention obligatoire dans le bail', validity: 'Sans limite, tant que le logement n’est pas modifié' },
]

export type Fact = { title: string; body: string }

export const DPE_FACTS: Fact[] = [
  { title: 'Interdiction de louer les passoires énergétiques', body: 'Depuis le 1er janvier 2025, un logement classé G ne peut plus être proposé à la location (nouveau bail, renouvellement ou reconduction). Ce sera le cas des logements classés F à partir de 2028, puis des logements classés E à partir de 2034.' },
  { title: 'Gel des loyers F et G', body: 'Le loyer d’un logement classé F ou G ne peut pas être augmenté (révision, relocation ou renouvellement).' },
  { title: 'Petites surfaces (moins de 40 m²)', body: 'Depuis le 1er juillet 2024, les seuils des étiquettes sont adaptés aux logements de moins de 40 m². Un DPE réalisé avant cette date peut être recalculé gratuitement avec le simulateur de l’ADEME, à partir du numéro de DPE à 13 caractères.' },
  { title: 'Nouveau coefficient de l’électricité (2026)', body: 'Depuis le 1er janvier 2026, le coefficient de conversion de l’électricité passe de 2,3 à 1,9, ce qui peut améliorer l’étiquette des logements chauffés à l’électricité. Les DPE antérieurs restent valables et peuvent être mis à jour.' },
  { title: 'DPE anciens', body: 'Les DPE réalisés entre le 1er janvier 2018 et le 30 juin 2021 ne sont plus valables depuis le 1er janvier 2025. Les DPE antérieurs à 2018 ne le sont plus depuis le 1er janvier 2023.' },
  { title: 'Annonces immobilières', body: 'Les annonces doivent afficher les classes énergie et climat, une estimation des dépenses annuelles d’énergie et, pour un logement F ou G, la mention « logement à consommation énergétique excessive ».' },
  { title: 'Un DPE opposable', body: 'Depuis le 1er juillet 2021, le DPE est opposable : un acquéreur ou un locataire peut s’en prévaloir. D’où l’importance de transmettre au diagnostiqueur tous les justificatifs de travaux (isolation, fenêtres, chauffage).' },
]

export type LawRef = { label: string; detail: string; url: string }

export const LAW_REFS: LawRef[] = [
  { label: 'Code de la construction et de l’habitation, art. L271-4 à L271-6', detail: 'Dossier de diagnostic technique (DDT) annexé à la promesse ou à l’acte de vente ; exigences de certification, d’assurance et d’indépendance du diagnostiqueur.', url: 'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006176358/2021-02-02/' },
  { label: 'Code de la construction et de l’habitation, art. R271-1 à D271-5', detail: 'Conditions d’établissement du DDT et durées de validité des documents.', url: 'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000019984886' },
  { label: 'Code de la construction et de l’habitation, art. L126-23 à L126-35', detail: 'Informations et diagnostics obligatoires, dont le DPE et l’audit énergétique.', url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000041565269/' },
  { label: 'Loi n° 89-462 du 6 juillet 1989 (art. 3-1 et 3-3)', detail: 'Location : surface habitable dans le bail (loi Boutin) et dossier de diagnostic technique annexé au bail.', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310' },
  { label: 'Loi n° 65-557 du 10 juillet 1965 (art. 46)', detail: 'Copropriété : mention de la superficie privative dans la vente d’un lot (loi Carrez).', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000880200' },
  { label: 'Arrêté du 25 mars 2024', detail: 'Seuils des étiquettes DPE pour les logements de moins de 40 m².', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049446315' },
]

export const OFFICIAL_LINKS: LawRef[] = [
  { label: 'Diagnostics à fournir en cas de vente', detail: 'Service-public.gouv.fr', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F10798' },
  { label: 'Diagnostics à fournir au locataire', detail: 'Service-public.gouv.fr', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F33463' },
  { label: 'Le DPE : règles, validité, location', detail: 'Service-public.gouv.fr', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F16096' },
  { label: 'Audit énergétique en cas de vente', detail: 'Service-public.gouv.fr', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F37110' },
  { label: 'Diagnostics obligatoires en location', detail: 'ANIL', url: 'https://www.anil.org/votre-besoin/gerer-un-bien/bailleur/diagnostics/' },
  { label: 'Observatoire DPE (vérifier un DPE, simulateur petites surfaces)', detail: 'ADEME', url: 'https://observatoire-dpe-audit.ademe.fr/' },
]

export const PREPARATION_CHECKLIST: string[] = [
  'Clés, badges et codes pour le logement et toutes les dépendances (cave, garage, parking, combles).',
  'Compteurs et tableaux accessibles, électricité et gaz en service le jour de la visite.',
  'Identifiant fiscal du logement (espace particulier impots.gouv.fr → Biens immobiliers) : obligatoire pour le DPE.',
  'Anciens diagnostics, surtout amiante, plomb et DPE.',
  'Factures et justificatifs de travaux : isolation, fenêtres, chaudière ou pompe à chaleur, ventilation.',
  'En copropriété : règlement de copropriété, état descriptif de division (numéros de lots), coordonnées du syndic.',
  'Chauffage ou eau chaude collectifs : caractéristiques de l’installation et relevés de charges, à demander au syndic.',
  'Présence d’une personne sur place, ou accès organisé pour toutes les pièces.',
]
