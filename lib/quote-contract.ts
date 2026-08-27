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
        'Les recommandations et estimations éventuellement portées au rapport sont informatives et ne remplacent pas l’intervention d’un professionnel compétent pour concevoir, chiffrer ou réaliser des travaux.',
      ],
    },
    {
      title: '5. Accès, sécurité et disponibilité des équipements',
      paragraphs: [
        'Le donneur d’ordre garantit l’accès effectif et sécurisé à tous les locaux, lots, dépendances et équipements compris dans la mission et met à disposition clés, badges, codes, autorisations, trappes, regards et accompagnements nécessaires.',
        'Les zones encombrées, condamnées, dangereuses, non ouvertes ou nécessitant un moyen spécial peuvent être exclues du contrôle et faire l’objet de réserves. Les installations devant être contrôlées en fonctionnement doivent être alimentées et accessibles, dans le respect des règles de sécurité.',
      ],
    },
    {
      title: '6. Rendez-vous empêché et contre-visite',
      paragraphs: [
        'Lorsqu’un déplacement ne permet pas de réaliser ou d’achever la mission en raison d’une absence, d’un défaut de clé, d’un accès refusé, d’un local non ouvert ou d’un équipement inaccessible relevant du donneur d’ordre, le déplacement, le temps mobilisé et la contre-visite peuvent faire l’objet d’une facturation distincte conformément au devis ou au tarif applicable.',
      ],
    },
    {
      title: '7. Laboratoires, prestataires et analyses',
      paragraphs: [
        'La commande autorise le recours, lorsque nécessaire, à un laboratoire accrédité ou à un prestataire compétent. Les analyses, prélèvements, moyens d’accès, interventions spécialisées et prestations extérieures non inclus au devis sont facturés en supplément après information du donneur d’ordre.',
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
      title: '9. Utilisation et transmission des rapports',
      paragraphs: [
        'Le rapport est établi pour une mission, un bien, une date et une finalité déterminés. Toute réutilisation pour une autre finalité, notamment d’un diagnostic vente comme repérage avant travaux, est exclue sans confirmation écrite d’ARIA Diagnostics.',
        'Le donneur d’ordre ne doit pas diffuser isolément un extrait lorsque les réserves, annexes ou compléments sont nécessaires à la compréhension du dossier.',
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
        'Le prix est celui du devis accepté ou du tarif applicable à la mission décrite. Il peut être ajusté lorsqu’une caractéristique réelle diffère sensiblement des informations communiquées : surface, nombre de lots ou bâtiments, dépendances, accès, complexité, analyses ou nature de la mission.',
        'Les factures sont payables à réception sauf stipulation écrite différente. Pour les clients professionnels, tout retard entraîne les pénalités indiquées sur le devis ou la facture et, lorsque les conditions légales sont réunies, l’indemnité forfaitaire de 40 euros pour frais de recouvrement.',
      ],
    },
    {
      title: '12. Mise à disposition numérique',
      paragraphs: [
        'Les devis, ordres de mission, demandes de pièces, rapports et factures peuvent être transmis par l’Espace ARIA ou par e-mail. Le donneur d’ordre est responsable de la confidentialité de ses accès et de l’adresse e-mail utilisée.',
        'Sous réserve des obligations légales, la mise à disposition de certains documents peut être conditionnée à l’accomplissement des formalités convenues, notamment le règlement lorsqu’il est prévu.',
      ],
    },
    {
      title: '13. Données personnelles',
      paragraphs: [
        'Les données sont traitées pour la gestion de la commande, la planification, les diagnostics, la facturation, la gestion documentaire, les contrôles de certification et les transmissions réglementaires. Les droits d’accès, rectification, effacement, limitation et, selon les cas, opposition peuvent être exercés auprès de contact@aria-diagnostics.fr.',
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
      ],
    },
  ],
}

const commonIntervention: ContractBlock[] = [
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
      title: 'Amiante — vente, DAPP, DTA, avant travaux ou démolition',
      paragraphs: [
        '• Les anciens repérages, DAPP, DTA, diagnostics vente, plans et informations sur travaux doivent être transmis lorsqu’ils existent.',
        '• Le périmètre doit être clairement défini. Pour une mission avant travaux ou démolition, le programme et les zones impactées doivent être communiqués avec suffisamment de précision.',
        '• Les matériaux ou produits ne pouvant être conclus visuellement peuvent nécessiter des prélèvements et analyses. Les frais correspondants sont facturés selon le devis ou le tarif annoncé.',
        '• Le refus d’un prélèvement nécessaire, l’impossibilité d’accéder à une zone ou l’absence de moyen d’accès sécurisé peut empêcher de conclure et conduire à un pré-rapport ou à une réserve.',
        '• Les réparations esthétiques ou remises en état consécutives aux sondages ou prélèvements ne sont pas comprises sauf accord exprès.',
      ],
    },
  },
  {
    keywords: ['plomb', 'crep'],
    block: {
      title: 'Plomb — CREP ou avant travaux',
      paragraphs: [
        '• Le CREP concerne les revêtements entrant dans son périmètre réglementaire. Les zones inaccessibles ou masquées sont signalées.',
        '• Les informations sur travaux, peintures, revêtements et anciens constats doivent être transmises lorsqu’elles sont disponibles.',
        '• Pour les missions avant travaux, le périmètre est défini par la nature et l’étendue des travaux communiqués.',
      ],
    },
  },
  {
    keywords: ['termite', 'parasitaire'],
    block: {
      title: 'Termites et état parasitaire',
      paragraphs: [
        '• Les anciens états termites, traitements, sinistres, travaux bois et suspicions d’infestation doivent être signalés.',
        '• Les sondages mécaniques sont réalisés dans les limites du référentiel applicable, sans démontage destructif sauf mission spécifique.',
        '• Les zones encombrées, doublées, coffrées, non accessibles ou non visibles constituent des limites de constat.',
      ],
    },
  },
  {
    keywords: ['gaz'],
    block: {
      title: 'Gaz',
      paragraphs: [
        '• Le compteur, les appareils, robinets, conduites apparentes et locaux concernés doivent être accessibles.',
        '• Lorsque cela est nécessaire au diagnostic, l’installation doit être alimentée. Une installation coupée, déposée ou non mise en service peut conduire à des limitations ou à l’impossibilité de réaliser certains contrôles.',
        '• En cas de danger grave immédiat répondant aux critères réglementaires, le diagnostiqueur applique la procédure de sécurité prévue par le référentiel applicable.',
      ],
    },
  },
  {
    keywords: ['électricité', 'electricite', 'électrique', 'electrique'],
    block: {
      title: 'Électricité',
      paragraphs: [
        '• Le tableau, les dispositifs de coupure, les locaux et dépendances relevant du diagnostic doivent être accessibles.',
        '• Lorsque cela est nécessaire, l’installation doit être alimentée. Une coupure temporaire peut être nécessaire pour certains contrôles.',
        '• Le donneur d’ordre ou l’occupant doit signaler les équipements qui ne doivent pas être interrompus et prendre les dispositions nécessaires pour éviter toute conséquence d’une coupure.',
      ],
    },
  },
  {
    keywords: ['dpe', 'énergétique', 'energetique'],
    block: {
      title: 'DPE et performance énergétique',
      paragraphs: [
        '• Le donneur d’ordre fournit l’identifiant fiscal du logement lorsqu’il est requis, les anciens DPE, plans, justificatifs de travaux et documents techniques disponibles.',
        '• Pour l’enveloppe : transmettre les preuves concernant l’isolation, les parois, la toiture, le plancher, les menuiseries et les protections solaires.',
        '• Pour les systèmes : transmettre les informations disponibles sur le chauffage, l’ECS, la ventilation, la climatisation, la régulation, la production collective, les réseaux et le comptage.',
        '• Pour une copropriété ou un équipement collectif, les données du syndic, de l’exploitant ou de la chaufferie peuvent être nécessaires. Leur absence peut imposer l’utilisation des valeurs conventionnelles prévues par la méthode.',
        '• Le consentement relatif à certaines coordonnées du commanditaire est distinct d’un éventuel accord pour une visite de contrôle de certification.',
      ],
    },
  },
  {
    keywords: ['carrez', 'boutin', 'mesurage', 'surface'],
    block: {
      title: 'Mesurage Loi Carrez ou Boutin',
      paragraphs: [
        '• Le règlement de copropriété, l’état descriptif de division et les plans doivent être communiqués lorsqu’ils existent afin d’identifier les lots et leur consistance juridique.',
        '• Le donneur d’ordre déclare les lots, caves, greniers, parkings, réserves ou annexes concernés.',
        '• Le mesurage porte sur les surfaces entrant dans le champ de la loi applicable ; il ne constitue pas une vérification juridique de la propriété ou de la destination des lots.',
      ],
    },
  },
  {
    keywords: ['erp', 'risques et pollutions'],
    block: {
      title: 'État des risques et pollutions',
      paragraphs: [
        '• L’état est établi à partir des données réglementaires disponibles à la date de sa génération et pour l’adresse communiquée.',
        '• Le donneur d’ordre doit vérifier que l’adresse, la parcelle ou la localisation renseignée correspond exactement au bien objet de la transaction.',
      ],
    },
  },
  {
    keywords: ['assainissement'],
    block: {
      title: 'Assainissement',
      paragraphs: [
        '• ARIA Diagnostics intervient uniquement dans le cadre de la mission commandée et sur les parties privatives visibles et accessibles.',
        '• Le propriétaire doit déclarer toute installation non collective totale ou partielle, ancienne installation, servitude active ou passive, pompe, relevage ou dispositif particulier.',
        '• Les servitudes doivent être justifiées par les documents disponibles. Leur absence ou leur non-déclaration peut limiter la portée du rapport.',
        '• Le contrôle ne vaut pas inspection interne de l’état des canalisations, regards ou ouvrages publics sauf mission spécifique.',
        '• Les points d’eau, regards, évacuations et volumes nécessaires au contrôle doivent être accessibles. Les points non contrôlés sont identifiés et peuvent justifier une contre-visite.',
        '• Les conclusions sont limitées aux points effectivement identifiés, testés et décrits. Toute information complémentaire susceptible de modifier le résultat doit être communiquée sans délai.',
      ],
    },
  },
  {
    keywords: ['avant travaux', 'démolition', 'demolition', 'raat'],
    block: {
      title: 'Avant travaux ou démolition',
      paragraphs: [
        '• Le donneur d’ordre doit fournir un programme de travaux suffisamment précis, les plans, les zones d’intervention, la nature des démolitions, le phasage et les accès.',
        '• Le repérage est limité au périmètre défini. Toute modification du programme de travaux peut rendre nécessaire une extension de mission.',
        '• Les sondages destructifs, moyens d’accès, sécurisation, consignations, démontages ou analyses nécessaires sont définis selon la mission et peuvent faire l’objet d’une facturation distincte.',
      ],
    },
  },
]

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

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
    .map(({ block }) => block)

  return {
    title: 'Conditions générales d’intervention',
    subtitle: 'CGI communes et conditions propres aux diagnostics commandés',
    blocks: [...commonIntervention, ...selected],
  }
}

export const withdrawalDocument: ContractDocument = {
  title: 'Formulaire de rétractation',
  subtitle: 'À utiliser uniquement si le contrat a été conclu à distance ou hors établissement par un consommateur',
  blocks: [
    {
      title: 'Exercice du droit de rétractation',
      paragraphs: [
        'À l’attention de ARIA Diagnostics — 18 rue de Budapest, 94140 Alfortville — contact@aria-diagnostics.fr.',
        'Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services désignée dans le devis joint.',
        'Numéro du devis : ____________________________________',
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

export const dpeDocument: ContractDocument = {
  title: 'DPE — consentement et identifiant fiscal',
  subtitle: 'Document à compléter lorsque la mission comprend un diagnostic de performance énergétique',
  blocks: [
    {
      title: 'Consentement relatif aux coordonnées',
      paragraphs: [
        '□ OUI, je consens au traitement et à la transmission réglementaire de mes coordonnées dans le cadre du DPE.',
        '□ NON, je refuse que mes coordonnées soient collectées à cette fin.',
        'Nom : ________________________________________________',
        'E-mail : ______________________________________________',
        'Téléphone : ____________________________________________',
        'Date : ____________________    Signature : ______________________________',
      ],
    },
    {
      title: 'Identifiant fiscal du logement',
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
    {
      title: 'Tarification',
      paragraphs: lines.map(
        (line) =>
          `• ${line.label} — quantité ${Number(line.quantity || 0).toLocaleString('fr-FR')}`,
      ),
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
        'Date : ____________________    Signature précédée de « Bon pour accord » :',
        '',
        '______________________________________________________________________',
      ],
    },
  ],
})
