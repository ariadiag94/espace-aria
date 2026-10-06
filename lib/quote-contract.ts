export type ContractBlock = {
  title: string
  paragraphs: string[]
}

export type ContractDocument = {
  title: string
  subtitle?: string
  blocks: ContractBlock[]
}

export type ContractLine = {
  label: string
  quantity: number
  unit_ttc: number
}

export const mediatorNotice =
  'Après réclamation écrite préalable restée sans solution satisfaisante, le consommateur peut recourir gratuitement au médiateur de la consommation : Centre de la Médiation de la Consommation de Conciliateurs de Justice (CM2C), 49 rue de Ponthieu, 75008 Paris — 01 89 47 00 14 — www.cm2c.net.'

export const generalTerms: ContractDocument = {
  title: 'Conditions générales de vente',
  subtitle: 'CGV applicables aux prestations ARIA Diagnostics',
  blocks: [
    {
      title: '1. Champ d’application et documents contractuels',
      paragraphs: [
        'Les présentes conditions générales de vente s’appliquent aux diagnostics immobiliers, mesurages, contrôles, repérages, examens, états et prestations accessoires confiés à ARIA Diagnostics, dans la limite de ses compétences, certifications, habilitations et garanties d’assurance.',
        'Le devis accepté, l’ordre de mission, les présentes CGV, les conditions générales d’intervention, les éventuelles conditions spécifiques et les informations écrites définissant le périmètre forment l’ensemble contractuel. Les stipulations particulières du devis ou de l’ordre de mission prévalent en cas de contradiction, sous réserve des règles impératives.',
      ],
    },
    {
      title: '2. Formation et périmètre de la commande',
      paragraphs: [
        'La commande est formée par l’acceptation du devis, la signature de l’ordre de mission, la validation électronique dans l’Espace ARIA ou tout écrit établissant sans ambiguïté l’accord du donneur d’ordre.',
        'ARIA Diagnostics intervient uniquement pour les missions expressément commandées et pour la finalité déclarée. Toute modification du bien, de la finalité, du nombre de lots, des dépendances ou du programme de travaux peut nécessiter un avenant ou une mission complémentaire.',
      ],
    },
    {
      title: '3. Déclarations et coopération du donneur d’ordre',
      paragraphs: [
        'Le donneur d’ordre communique loyalement toutes les informations utiles : identité du propriétaire, destination du bien, adresse complète, bâtiment, cage, étage, porte, lots, dépendances, occupation, accès, travaux, sinistres, traitements, anciens diagnostics, documents de copropriété et justificatifs techniques.',
        'Toute donnée erronée, incomplète ou tardive peut entraîner des réserves, une modification du prix, une contre-visite ou l’impossibilité de conclure sur une partie du périmètre.',
      ],
    },
    {
      title: '4. Nature et limites des prestations',
      paragraphs: [
        'Sauf disposition réglementaire ou normative contraire, les constatations portent sur l’état apparent, visible et accessible au jour de la visite. La prestation ne constitue ni une expertise structurelle, ni une maîtrise d’œuvre, ni une étude de conception, ni une garantie générale de conformité du bâtiment.',
        'Les recommandations et estimations du rapport sont informatives et ne remplacent pas un professionnel des travaux.',
      ],
    },
    {
      title: '5. Accès, sécurité et disponibilité des équipements',
      paragraphs: [
        'Le donneur d’ordre garantit l’accès effectif et sécurisé à tous les locaux, lots, dépendances et équipements compris dans la mission et met à disposition clés, badges, codes, autorisations, trappes, regards et accompagnements nécessaires.',
        'Les zones encombrées, condamnées, dangereuses, non ouvertes ou nécessitant un moyen spécial peuvent être exclues du contrôle et faire l’objet de réserves. Les installations devant être contrôlées en fonctionnement doivent être alimentées et accessibles, dans le respect des règles de sécurité.',
        'ARIA Diagnostics n’effectue ni démontage, ni dépose, ni déplacement lourd hors du mode opératoire de la mission. Le diagnostiqueur peut être accompagné d’un examinateur de son organisme de certification.',
      ],
    },
    {
      title: '6. Rendez-vous empêché et contre-visite',
      paragraphs: [
        'Lorsqu’un déplacement ne permet pas de réaliser ou d’achever la mission en raison d’une absence, d’un défaut de clé, d’un accès refusé, d’un local non ouvert ou d’un équipement inaccessible relevant du donneur d’ordre, le déplacement et le temps mobilisé peuvent être facturés, et la contre-visite fait l’objet d’un devis complémentaire soumis à l’accord préalable du donneur d’ordre.',
        'Le donneur d’ordre peut annuler ou reporter le rendez-vous sans frais en prévenant ARIA Diagnostics au plus tard la veille ouvrée de l’intervention.',
      ],
    },
    {
      title: '7. Laboratoires, prestataires et analyses',
      paragraphs: [
        'La commande autorise le recours, lorsque nécessaire, à un laboratoire accrédité ou à un prestataire compétent. Les analyses, prélèvements, moyens d’accès, interventions spécialisées et prestations extérieures non inclus au devis sont facturés en supplément, après accord exprès du donneur d’ordre sur leur prix.',
      ],
    },
    {
      title: '8. Mission incomplète, réserves et compléments',
      paragraphs: [
        'En cas d’analyse en attente, d’impossibilité d’accès, de défaut de sécurité, de limitation technique ou d’information indispensable manquante, ARIA Diagnostics peut émettre un pré-rapport, un document provisoire ou un rapport avec réserves. Les opérations réellement accomplies restent facturables.',
        'La levée des réserves peut nécessiter une visite, une analyse ou une mission additionnelle. Les rapports successifs doivent être conservés et lus ensemble sauf mention expresse d’annulation et remplacement.',
      ],
    },
    {
      title: '8 bis. Délai de remise des rapports',
      paragraphs: [
        'Sauf délai particulier prévu au devis, les rapports sont remis dans un délai maximal de 30 jours suivant la visite.',
        'Ce délai est suspendu tant que les éléments dépendant d’un tiers ne sont pas disponibles : résultats d’analyses de laboratoire, documents ou données transmis par le syndic, le gestionnaire ou l’exploitant (notamment pour un chauffage ou une production d’eau chaude collectifs). À défaut de réponse de ce tiers dans un délai raisonnable, et après information du donneur d’ordre, le DPE peut être établi avec les valeurs par défaut prévues par la méthode réglementaire.',
      ],
    },
    {
      title: '9. Utilisation et transmission des rapports',
      paragraphs: [
        'Le rapport est établi pour une mission, un bien, une date et une finalité déterminés. Toute réutilisation pour une autre finalité, notamment d’un diagnostic vente comme repérage avant travaux, est exclue sans confirmation écrite d’ARIA Diagnostics.',
        'Un extrait ne doit pas être diffusé isolément de ses réserves, annexes ou compléments.',
      ],
    },
    {
      title: '10. Rectification',
      paragraphs: [
        'Toute erreur matérielle manifeste, adresse erronée, incohérence ou omission doit être signalée sans délai. Une correction imputable à ARIA Diagnostics peut donner lieu à un document rectificatif. Une information nouvelle, une modification du bien ou un périmètre initial incomplet peut nécessiter une nouvelle intervention facturée.',
      ],
    },
    {
      title: '11. Prix, facturation et paiement',
      paragraphs: [
        'Le prix est celui du devis accepté ou du tarif applicable à la mission décrite. Il peut être ajusté lorsqu’une caractéristique réelle diffère sensiblement des informations communiquées : surface, nombre de lots ou bâtiments, dépendances, accès, complexité, analyses ou nature de la mission. Tout ajustement est notifié au donneur d’ordre et soumis à son accord avant l’intervention ; à défaut d’accord, chaque partie peut renoncer à la mission sans frais.',
        'Les factures sont payables à réception sauf stipulation écrite différente. Aucun escompte n’est accordé pour paiement anticipé.',
        'Pour les clients professionnels, tout retard de paiement entraîne de plein droit des pénalités au taux égal à trois fois le taux d’intérêt légal, ainsi qu’une indemnité forfaitaire de 40 euros pour frais de recouvrement (article L441-10 du Code de commerce).',
      ],
    },
    {
      title: '12. Mise à disposition numérique',
      paragraphs: [
        'Les devis, ordres de mission, demandes de pièces, rapports et factures peuvent être transmis par l’Espace ARIA ou par e-mail. Le donneur d’ordre est responsable de la confidentialité de ses accès et de l’adresse e-mail utilisée.',
        'Sous réserve des obligations légales, la remise de certains documents peut être conditionnée au règlement lorsqu’il est prévu.',
      ],
    },
    {
      title: '13. Données personnelles',
      paragraphs: [
        'Les données sont traitées par ARIA Diagnostics, responsable de traitement, pour la gestion de la commande, la planification, les diagnostics, la facturation, la gestion documentaire, les contrôles de certification et les transmissions réglementaires (ADEME notamment). Ces traitements reposent sur l’exécution du contrat et le respect des obligations légales.',
        'Les données sont conservées pendant la durée nécessaire à la mission puis pendant les durées de prescription et d’archivage légales (10 ans pour les pièces comptables). Les droits d’accès, rectification, effacement, limitation, portabilité et, selon les cas, opposition peuvent être exercés auprès de contact@aria-diagnostics.fr. Une réclamation peut être introduite auprès de la CNIL (www.cnil.fr).',
      ],
    },
    {
      title: '14. Rétractation du consommateur',
      paragraphs: [
        'Lorsque le contrat est conclu à distance ou hors établissement avec un consommateur et qu’aucune exception légale n’est applicable, celui-ci dispose du délai de rétractation de 14 jours. Le formulaire figure en annexe.',
        'Si le consommateur demande expressément le commencement de la prestation avant l’expiration du délai, il reconnaît qu’en cas d’exécution complète il perdra son droit de rétractation et qu’en cas d’exécution partielle un montant proportionné pourra être dû.',
      ],
    },
    {
      title: '15. Réclamations et médiation',
      paragraphs: [
        'Toute réclamation est adressée en priorité à ARIA Diagnostics, accompagnée des pièces utiles à son examen.',
        mediatorNotice,
      ],
    },
    {
      title: '16. Droit applicable',
      paragraphs: [
        'Le contrat est soumis au droit français. Aucune clause ne prive un consommateur ou un non-professionnel des droits impératifs qui lui sont reconnus. Si une clause est déclarée inapplicable, les autres dispositions demeurent applicables.',
        'Entre professionnels, tout litige relève de la compétence du tribunal de commerce de Créteil.',
      ],
    },
  ],
}

// Conservé pour référence ; intégré aux CGV (articles 3, 5 et 8).
export const commonIntervention: ContractBlock[] = [
  {
    title: 'A. Dispositions communes à toutes les missions',
    paragraphs: [
      '• Le bien doit être identifiable sans ambiguïté : adresse, bâtiment, cage, étage, porte, lot principal et dépendances.',
      '• Le donneur d’ordre rend accessibles tous les volumes entrant dans le périmètre : logement, cave, garage, parking, combles, vide sanitaire, chaufferie, locaux techniques, terrasses et annexes concernés.',
      '• Les objets, meubles ou stockages empêchant l’accès doivent être déplacés avant la visite lorsque ce déplacement peut être réalisé sans danger et sans intervention technique.',
      '• Les trappes, placards techniques, coffrets, regards et locaux fermés doivent être accessibles avec les clés ou moyens d’ouverture appropriés.',
      '• ARIA Diagnostics n’est pas tenu d’effectuer un démontage, une dépose, une remise en état ou un déplacement lourd qui n’entre pas dans le mode opératoire de la mission.',
      '• Les limites, impossibilités et zones non visitées sont consignées dans le rapport et peuvent nécessiter une contre-visite.',
      '• Le diagnostiqueur peut être accompagné par un examinateur de l’organisme de certification lorsque les règles de certification l’exigent.',
      '• Le donneur d’ordre autorise les opérations de contrôle réglementaires nécessaires à la mission, dans les limites des textes applicables et de l’ordre de mission.',
    ],
  },
]

const diagnosticBlocks: Array<{ keywords: string[]; block: ContractBlock }> = [
  {
    keywords: ['amiante', 'dapp', 'dta', 'raat', 'démolition', 'demolition'],
    block: {
      title: 'Amiante (vente, DAPP, DTA, avant travaux ou démolition)',
      paragraphs: [
        '• Transmettre les anciens repérages, DAPP, DTA, plans et informations sur travaux ; pour l’avant travaux ou démolition, un programme précis (plans, zones, phasage) : le repérage est limité à ce périmètre.',
        '• Les matériaux non concluables visuellement peuvent nécessiter des prélèvements et analyses, facturés après accord ; leur refus ou un accès impossible peut conduire à une réserve ou un pré-rapport. Les remises en état après sondage ne sont pas comprises.',
      ],
    },
  },
  {
    keywords: ['plomb', 'crep'],
    block: {
      title: 'Plomb (CREP ou avant travaux)',
      paragraphs: [
        '• Le CREP porte sur les revêtements de son périmètre réglementaire ; les zones inaccessibles ou masquées sont signalées. Transmettre les informations sur travaux et anciens constats ; en avant travaux, le périmètre suit les travaux communiqués.',
      ],
    },
  },
  {
    keywords: ['termite', 'parasitaire'],
    block: {
      title: 'Termites et état parasitaire',
      paragraphs: [
        '• Signaler anciens états, traitements, sinistres et suspicions. Sondages dans les limites du référentiel, sans démontage destructif ; zones encombrées, doublées ou non visibles = limites de constat.',
      ],
    },
  },
  {
    keywords: ['gaz'],
    block: {
      title: 'Gaz',
      paragraphs: [
        '• Compteur, appareils, robinets et conduites accessibles ; installation alimentée si nécessaire, à défaut certains contrôles sont limités ou impossibles. En cas de danger grave immédiat, la procédure de sécurité du référentiel est appliquée.',
      ],
    },
  },
  {
    keywords: ['électricité', 'electricite', 'électrique', 'electrique'],
    block: {
      title: 'Électricité',
      paragraphs: [
        '• Tableau, dispositifs de coupure et dépendances accessibles ; installation alimentée, une coupure temporaire pouvant être nécessaire. Signaler les équipements ne devant pas être interrompus.',
      ],
    },
  },
  {
    keywords: ['dpe', 'énergétique', 'energetique'],
    block: {
      title: 'DPE et performance énergétique',
      paragraphs: [
        '• Fournir l’identifiant fiscal, les anciens DPE, plans et justificatifs (isolation, menuiseries, chauffage, ECS, ventilation). En copropriété ou équipement collectif, les données du syndic ou de l’exploitant peuvent être nécessaires ; à défaut, les valeurs conventionnelles de la méthode s’appliquent.',
      ],
    },
  },
  {
    keywords: ['carrez', 'boutin', 'mesurage', 'surface'],
    block: {
      title: 'Mesurage Loi Carrez ou Boutin',
      paragraphs: [
        '• Communiquer règlement de copropriété, état descriptif de division et plans ; déclarer les lots et annexes. Le mesurage n’est pas une vérification juridique de la propriété ou de la destination des lots.',
      ],
    },
  },
  {
    keywords: ['erp', 'risques et pollutions'],
    block: {
      title: 'État des risques et pollutions',
      paragraphs: [
        '• Établi selon les données réglementaires à sa date et pour l’adresse communiquée, que le donneur d’ordre vérifie.',
      ],
    },
  },
  {
    keywords: ['assainissement'],
    block: {
      title: 'Assainissement',
      paragraphs: [
        '• Contrôle des parties privatives visibles et accessibles. Déclarer toute installation non collective, servitude, pompe ou relevage. Pas d’inspection interne des canalisations sauf mission spécifique ; les points non contrôlés peuvent justifier une contre-visite.',
      ],
    },
  },
]

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// DPE d'un local tertiaire (locaux professionnels) : méthode sur relevés de
// consommations (factures), pas la méthode 3CL du logement. Détecté par le
// libellé des packs locaux pro (lib/internal-pricing.ts).
const tertiaryDpeBlock: ContractBlock = {
  title: 'DPE tertiaire (locaux professionnels) – méthode sur factures',
  paragraphs: [
    '• Le DPE d’un local à usage professionnel est établi à partir des consommations réelles d’énergie : fournir les factures ou relevés de consommation des 3 dernières années pour toutes les énergies du local (électricité, gaz, fioul, réseau de chaleur ou de froid…).',
    '• Communiquer également la surface, l’activité exercée, les horaires d’occupation, les plans et le descriptif des équipements (chauffage, refroidissement, ECS, ventilation, éclairage). En copropriété ou avec un équipement collectif, la quote-part des consommations communes doit être obtenue auprès du syndic, du gestionnaire ou de l’exploitant.',
    '• À défaut de factures exploitables, le DPE ne peut pas comporter d’étiquette de consommation (DPE dit « vierge »), conformément à la réglementation applicable aux bâtiments tertiaires.',
  ],
}

const isTertiary = (labels: string) => labels.includes('locaux professionnels')

// Identifiant fiscal du logement : DPE logement uniquement (pas en tertiaire).
export const isTertiaryMission = (lines: ContractLine[], diagnostics: string[] = []) =>
  isTertiary(normalize([...lines.map((line) => line.label), ...diagnostics].join(' ')))

export const hasDpe = (lines: ContractLine[], diagnostics: string[] = []) => {
  const labels = normalize([...lines.map((line) => line.label), ...diagnostics].join(' '))
  return labels.includes('dpe') || labels.includes('energetique')
}

export const interventionTerms = (
  lines: ContractLine[],
  diagnostics: string[] = [],
): ContractDocument => {
  const labels = normalize([...lines.map((line) => line.label), ...diagnostics].join(' '))
  const selected = diagnosticBlocks
    .filter(({ keywords }) => keywords.some((keyword) => labels.includes(normalize(keyword))))
    .map(({ block }) => (isTertiary(labels) && block.title === 'DPE et performance énergétique' ? tertiaryDpeBlock : block))

  return {
    title: 'Conditions générales d’intervention',
    subtitle: 'CGI communes et conditions propres aux diagnostics commandés',
    // Les dispositions communes (accès, identification du bien, limites)
    // figurent dans les CGV (articles 3, 5 et 8) : non répétées ici.
    blocks: selected,
  }
}

export const withdrawalDocument: ContractDocument = {
  title: 'Formulaire de rétractation',
  subtitle: 'À utiliser uniquement si le contrat a été conclu à distance ou hors établissement par un consommateur',
  blocks: [
    {
      title: 'Exercice du droit de rétractation',
      paragraphs: [
        'À l’attention d’ARIA Diagnostics — 18 rue de Budapest, 94140 Alfortville — contact@aria-diagnostics.fr.',
        'Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services désignée dans le devis joint.',
        'Numéro du devis : ____________________________________',
        'Commandé le : ________________________________________',
        'Nom du consommateur : ________________________________',
        'Adresse du consommateur : ______________________________',
        'Date : ____________________    Signature : ______________________________',
      ],
    },
    {
      title: 'Demande d’exécution anticipée',
      paragraphs: [
        '□ Je demande expressément que la prestation commence avant l’expiration du délai de rétractation de 14 jours.',
        '□ Je reconnais qu’après exécution complète du contrat je ne pourrai plus exercer mon droit de rétractation et qu’en cas d’exécution partielle un montant proportionné pourra être dû.',
        'Date : ____________________    Signature : ______________________________',
      ],
    },
  ],
}

export const dpeConsentDocument: ContractDocument = {
  title: 'Formulaire de consentement au traitement des données personnelles',
  subtitle:
    'À l’attention du client commanditaire du diagnostic de performance énergétique (DPE) (1), avant sa réalisation',
  blocks: [
    {
      title: 'Information relative aux contrôles du diagnostiqueur',
      paragraphs: [
        'En application de la réglementation (2), le diagnostiqueur réalisant le DPE pour votre compte est soumis à des contrôles ayant pour objet de vérifier sa capacité à réaliser un diagnostic dans le respect des exigences réglementaires. Ces contrôles participent à l’amélioration de la qualité de la réalisation des DPE.',
        'Afin de pouvoir organiser les modalités pratiques de ces contrôles, l’organisme (3) chargé de contrôler votre diagnostiqueur peut être amené à vous contacter. Pour cela, et sous réserve de votre consentement, vos données personnelles (nom, prénom, adresse mail et/ou numéro de téléphone) sont collectées et traitées par l’Ademe lors de la transmission du rapport DPE et transmises à l’organisme de contrôle.',
        'Ces données seront stockées pour une durée de 1 an, et vous disposez d’un droit d’accès, de rectification, de portabilité, d’effacement ou de limitation du traitement de ces données. Plus d’informations sont disponibles dans la notice relative au traitement de ces données accessible à https://observatoire-dpe-audit.ademe.fr/ressources dans l’onglet « Traitement de vos données ».',
        'Il est à noter que le consentement au traitement de vos données n’équivaut pas au consentement pour réaliser le contrôle dans le bien concerné ; votre accord pour l’organisation de ce contrôle vous sera demandé séparément.',
      ],
    },
    {
      title: 'Choix du client commanditaire',
      paragraphs: [
        '□ Oui, je consens à ce que mes données personnelles (inscrites ci-dessous) soient traitées par l’Ademe et l’organisme de certification dans le cadre des missions de contrôle des compétences des diagnostiqueurs.',
        '[Si oui] À REMPLIR :',
        'NOM : ______________________________    PRÉNOM : ______________________________',
        'ADRESSE MAIL : _______________________    N° TÉLÉPHONE : _______________________',
        '□ Non, je refuse que mes données soient collectées.',
        'Fait le ____________________ , à ______________________________',
        'Signature : _____________________________________________________________',
      ],
    },
    {
      title: 'Références et information RGPD',
      paragraphs: [
        '(1) Si ce client est mandaté par un tiers, ce sont les données de ce tiers qui sont traitées, dès lors que le mandat l’autorise.',
        '(2) Arrêté du 20 juillet 2023 définissant les critères de certification des diagnostiqueurs intervenant dans le domaine du diagnostic de performance énergétique, de leurs organismes de formation et les exigences applicables aux organismes de certification et modifiant l’arrêté du 24 décembre 2021 définissant les critères de certification des opérateurs de diagnostic technique et des organismes de formation et d’accréditation des organismes de certification, notamment le paragraphe 2.5.3 de son annexe 1.',
        '(3) Il s’agit d’un organisme de certification, dont le nom est mentionné en première page du DPE.',
        'Nota : par ailleurs, pour les propriétaires du bien au moment de la réalisation du DPE, dans le cadre du Règlement général sur la protection des données (RGPD), l’Ademe vous informe que vos données personnelles (Nom-Prénom-Adresse) sont stockées dans la base de données de l’observatoire DPE à des fins de contrôles ou en cas de contestations ou de procédures judiciaires. Ces données sont stockées jusqu’à la date de fin de validité du DPE. Vous disposez d’un droit d’accès, de rectification, de portabilité, d’effacement ou une limitation du traitement de ces données. Si vous souhaitez faire valoir votre droit, veuillez nous contacter à l’adresse mail indiquée à la page « Contacts » de l’Observatoire DPE (https://observatoire-dpe.ademe.fr/).',
      ],
    },
  ],
}

export const dpeFiscalDocument: ContractDocument = {
  title: 'DPE - identifiant fiscal du logement',
  subtitle: 'Informations à transmettre à ARIA Diagnostics lorsque la mission comprend un DPE',
  blocks: [
    {
      title: 'Comment retrouver l’identifiant fiscal',
      paragraphs: [
        '1. Connectez-vous à votre espace particulier sur impots.gouv.fr.',
        '2. Ouvrez la rubrique « Biens immobiliers ».',
        '3. Sélectionnez le logement concerné puis ouvrez sa fiche détaillée.',
        '4. Relevez l’identifiant fiscal du local et transmettez-le à ARIA Diagnostics.',
        'Identifiant fiscal : ________________________________________________',
        'En présence de plusieurs lots à la même adresse, vérifiez qu’il s’agit du logement diagnostiqué.',
      ],
    },
  ],
}

export const missionDocument = (
  quoteNumber: string,
  propertyAddress: string,
  contactName: string | null | undefined,
  lines: ContractLine[],
  diagnostics: string[] = [],
  technicalInfo: string[] = [],
): ContractDocument => ({
  title: 'Ordre de mission',
  subtitle: 'Définition contractuelle du périmètre d’intervention',
  blocks: [
    {
      title: 'Références',
      paragraphs: [
        `Devis : ${quoteNumber}`,
        `Donneur d’ordre : ${contactName || 'Non renseigné'}`,
        `Bien concerné : ${propertyAddress}`,
      ],
    },
    {
      title: 'Diagnostics commandés',
      paragraphs:
        diagnostics.length > 0
          ? diagnostics.map((diagnostic) => `• ${diagnostic}`)
          : ['• Détail des diagnostics à compléter avant acceptation du devis.'],
    },
    // Bloc facultatif (envoi automatique depuis /assistant) : informations
    // techniques déclarées, pour préparer l'intervention.
    ...(technicalInfo.length
      ? [{ title: 'Informations techniques du bien', paragraphs: technicalInfo.map((info) => `• ${info}`) }]
      : []),
    {
      title: 'Tarification',
      paragraphs: lines.map(
        (line) =>
          Number(line.quantity || 0) === 0 && Number(line.unit_ttc || 0) > 0
            ? `• Option non incluse, au choix du client : ${line.label} — ${Number(line.unit_ttc).toLocaleString('fr-FR')} € TTC`
            : `• ${line.label} — quantité ${Number(line.quantity || 0).toLocaleString('fr-FR')}`,
      ),
    },
    {
      title: 'Attestation sur l’honneur (article R271-3 du CCH)',
      paragraphs: [
        'ARIA Diagnostics atteste sur l’honneur être en situation régulière au regard de l’article L271-6 du Code de la construction et de l’habitation : certifications en cours de validité pour les diagnostics réalisés, assurance de responsabilité civile professionnelle, et absence de tout lien de nature à porter atteinte à son impartialité et à son indépendance à l’égard du propriétaire, de son mandataire ou d’une entreprise pouvant réaliser des travaux sur les ouvrages concernés.',
        'ARIA Diagnostics atteste également disposer des moyens en matériel et en personnel nécessaires à l’établissement des diagnostics commandés.',
      ],
    },
    {
      title: 'Mission confiée à ARIA Diagnostics',
      paragraphs: [
        'Le donneur d’ordre confie à ARIA Diagnostics les prestations listées ci-dessus, selon leur périmètre réglementaire ou contractuel, les CGV, les CGI et les informations communiquées avant la visite.',
        'Le donneur d’ordre certifie l’exactitude des renseignements fournis, déclare les lots et dépendances concernés et s’engage à permettre un accès complet et sécurisé le jour de l’intervention.',
        'Les documents techniques, anciens diagnostics, plans, justificatifs, identifiants, coordonnées du syndic et informations collectives nécessaires sont transmis avant l’intervention.',
      ],
    },
    {
      title: 'Acceptation',
      paragraphs: [
        'Je reconnais avoir pris connaissance du devis, du présent ordre de mission, des CGV, des CGI et des annexes applicables.',
        'Nom / qualité : ________________________________________',
        'Date : ____________________    Signature, précédée de « Bon pour accord » : ______________________________',
      ],
    },
  ],
})
