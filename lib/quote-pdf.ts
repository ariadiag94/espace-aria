import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { ARIA_LOGO_JPEG_BASE64 } from '@/lib/aria-logo-generated'
import * as TPL from '@/lib/quote-template-assets'
import {
  ContractDocument,
  ContractLine,
  dpeConsentDocument,
  dpeFiscalDocument,
  generalTerms,
  hasDpe,
  interventionTerms,
  mediatorNotice,
  missionDocument,
  withdrawalDocument,
} from '@/lib/quote-contract'

type QuotePdfLine = ContractLine

type QuotePdfInput = {
  quoteNumber: string
  createdAt: string
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  propertyAddress: string
  propertyLabel?: string
  propertySize?: string | null
  notes?: string | null
  lines: QuotePdfLine[]
  diagnostics?: string[]
  origin?: string
  // Informations techniques déclarées, ajoutées à l'ordre de mission
  // (envoi automatique depuis /assistant, voir lib/lead-quote.ts).
  missionTechnicalInfo?: string[]
  // Champs facultatifs du modèle de devis ARIA (laissés vides si inconnus).
  dossierRef?: string | null
  ownerName?: string | null
  appointmentAt?: string | null
  dependencies?: string[]
  headerVariant?: 'C' | 'P' | 'Q' | 'T' | 'U'
}

const euro = (value: number) =>
  Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'

const dateFr = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const blue = rgb(0.024, 0.169, 0.349)
const midBlue = rgb(0.043, 0.424, 0.722)
const lightBlue = rgb(0.875, 0.957, 0.992)
const border = rgb(0.86, 0.9, 0.94)
const gray = rgb(0.38, 0.47, 0.56)
const white = rgb(1, 1, 1)

const pdfSafe = (value: string) =>
  String(value || '')
    .replaceAll('□', '[ ]')
    .replaceAll('•', '-')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll('\u00a0', ' ')
    .replaceAll('²', '2')

const wrapText = (value: string, font: PDFFont, size: number, maxWidth: number) => {
  const source = pdfSafe(value)
  if (!source.trim()) return ['']
  const words = source.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

const drawWrapped = (
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color = gray,
  lineHeight = size * 1.35,
) => {
  const lines = wrapText(value, font, size, maxWidth)
  lines.forEach((line, index) => {
    if (line) page.drawText(line, { x, y: y - index * lineHeight, size, font, color })
  })
  return y - lines.length * lineHeight
}

const normalizeKey = (value: string) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const loadAriaLogo = async (pdf: PDFDocument): Promise<PDFImage | null> => {
  if (!ARIA_LOGO_JPEG_BASE64) return null
  try {
    return await pdf.embedJpg(`data:image/jpeg;base64,${ARIA_LOGO_JPEG_BASE64}`)
  } catch (error) {
    console.error('ARIA logo embedding failed', error)
    return null
  }
}

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ariaLogo = await loadAriaLogo(pdf)
  const left = 42
  const right = 553
  const width = right - left

  const firstPage = pdf.addPage([595.28, 841.89])
  let y = 800

  const text = (
    value: string,
    x: number,
    yy: number,
    size = 9,
    font: PDFFont = regular,
    color = blue,
  ) => {
    firstPage.drawText(pdfSafe(value), { x, y: yy, size, font, color })
  }

  const box = (x: number, yy: number, w: number, h: number) => {
    firstPage.drawRectangle({
      x,
      y: yy,
      width: w,
      height: h,
      borderColor: border,
      borderWidth: 1,
      color: white,
    })
  }

  // ---- Première page : reprise du modèle de devis Word d'ARIA Diagnostics ----
  const sky = rgb(0.137, 0.647, 0.875)
  const ink = rgb(0.15, 0.2, 0.27)
  const soft = rgb(0.45, 0.5, 0.56)
  const rule = rgb(0.8, 0.83, 0.86)
  const textRight = (value: string, xRight: number, yy: number, size = 9, font: PDFFont = regular, color = ink) => {
    const safe = pdfSafe(value)
    firstPage.drawText(safe, { x: xRight - font.widthOfTextAtSize(safe, size), y: yy, size, font, color })
  }
  const textCenter = (value: string, xMid: number, yy: number, size = 9, font: PDFFont = regular, color = ink) => {
    const safe = pdfSafe(value)
    firstPage.drawText(safe, { x: xMid - font.widthOfTextAtSize(safe, size) / 2, y: yy, size, font, color })
  }
  const embedPng = async (b64: string) => {
    try { return await pdf.embedPng(`data:image/png;base64,${b64}`) } catch { return null }
  }
  const icons = {
    document: await embedPng(TPL.ICON_DOCUMENT_PNG),
    folder: await embedPng(TPL.ICON_FOLDER_PNG),
    docStar: await embedPng(TPL.ICON_DOCSTAR_PNG),
    send: await embedPng(TPL.ICON_SEND_PNG),
    briefcase: await embedPng(TPL.ICON_BRIEFCASE_PNG),
    hourglass: await embedPng(TPL.ICON_HOURGLASS_PNG),
    pin: await embedPng(TPL.ICON_PIN_PNG),
    person: await embedPng(TPL.ICON_PERSON_PNG),
    calendar: await embedPng(TPL.ICON_CALENDAR_PNG),
    checklist: await embedPng(TPL.ICON_CHECKLIST_PNG),
    info: await embedPng(TPL.ICON_INFO_PNG),
    microscope: await embedPng(TPL.ICON_MICROSCOPE_PNG),
    sign: await embedPng(TPL.ICON_SIGN_PNG),
  }
  const iconBox = (icon: PDFImage | null, x: number, top: number, size = 26) => {
    const yy = 841.89 - top - size
    firstPage.drawRectangle({ x, y: yy, width: size, height: size, color: sky })
    if (icon) {
      const scale = Math.min((size - 8) / icon.width, (size - 8) / icon.height)
      const w = icon.width * scale
      const h = icon.height * scale
      firstPage.drawImage(icon, { x: x + (size - w) / 2, y: yy + (size - h) / 2, width: w, height: h })
    }
  }
  // top = distance depuis le haut de la page (repère du modèle Word).
  const Y = (top: number) => 841.89 - top
  const field = (x: number, top: number, labelText: string, lines: Array<{ text: string; bold?: boolean }>, maxW = 175) => {
    firstPage.drawLine({ start: { x, y: Y(top - 4) }, end: { x: x + maxW, y: Y(top - 4) }, color: rule, thickness: 0.7 })
    firstPage.drawText(pdfSafe(labelText), { x, y: Y(top + 7), size: 7.5, font: regular, color: soft })
    let yy = Y(top + 18)
    for (const line of lines) {
      if (!line.text) continue
      const font = line.bold ? bold : regular
      const size = line.bold ? 8.6 : 7.6
      for (const wrapped of wrapText(line.text, font, size, maxW)) {
        firstPage.drawText(wrapped, { x, y: yy, size, font, color: ink })
        yy -= size + 2.4
      }
    }
    return 841.89 - yy
  }

  // En-tête de la première page. Variante choisie via headerVariant
  // (aperçu) ; 'C' = bloc marine compact.
  const navyC = rgb(0.024, 0.169, 0.349)
  const variant = input.headerVariant || 'C'
  const drawLogo = async (width: number, top: number) => {
    try {
      const logo = await pdf.embedJpg(`data:image/jpeg;base64,${TPL.HEADER_LOGO_JPEG}`)
      firstPage.drawImage(logo, { x: 36, y: Y(top) - width * logo.height / logo.width, width, height: width * logo.height / logo.width })
    } catch {
      if (ariaLogo) firstPage.drawImage(ariaLogo, { x: 40, y: Y(top + 40), width, height: width * 0.37 })
    }
  }
  if (variant === 'P') {
    await drawLogo(100, 14)
    textRight(`DEVIS N° ${input.quoteNumber}`, 559, Y(34), 13, bold, navyC)
    textRight(`Émis le ${dateFr(input.createdAt)}  ·  Valable 30 jours  ·  Devis gratuit et sans engagement`, 559, Y(47), 7.6, regular, soft)
    firstPage.drawText('06 15 70 36 70  ·  contact@aria-diagnostics.fr', { x: 40, y: Y(64), size: 7.4, font: regular, color: soft })
    firstPage.drawRectangle({ x: 36, y: Y(74), width: 523.28, height: 2, color: navyC })
    firstPage.drawRectangle({ x: 36, y: Y(77), width: 120, height: 2, color: sky })
  } else if (variant === 'T') {
    await drawLogo(100, 14)
    firstPage.drawText('06 15 70 36 70  ·  contact@aria-diagnostics.fr', { x: 40, y: Y(64), size: 7.4, font: regular, color: soft })
    const paleC = rgb(0.91, 0.96, 0.99)
    const lightC = rgb(0.78, 0.86, 0.95)
    const cells: Array<[string, string]> = [['DEVIS N°', input.quoteNumber], ['ÉMIS LE', dateFr(input.createdAt)], ['VALIDITÉ', '30 jours']]
    cells.forEach(([k, v], i) => {
      const x = 559 - 3 * 96 + i * 96 + 4
      const w = 90, h = 40, r = 6, t = 18
      firstPage.drawSvgPath(`M ${x + r} ${t} L ${x + w - r} ${t} Q ${x + w} ${t} ${x + w} ${t + r} L ${x + w} ${t + h - r} Q ${x + w} ${t + h} ${x + w - r} ${t + h} L ${x + r} ${t + h} Q ${x} ${t + h} ${x} ${t + h - r} L ${x} ${t + r} Q ${x} ${t} ${x + r} ${t} Z`, { x: 0, y: 841.89, color: i === 0 ? navyC : paleC })
      textCenter(k, x + w / 2, Y(32), 6.5, bold, i === 0 ? lightC : soft)
      textCenter(v, x + w / 2, Y(46), 10, bold, i === 0 ? white : navyC)
    })
    textRight('Devis gratuit et sans engagement', 559, Y(68), 6.8, regular, soft)
    firstPage.drawLine({ start: { x: 36, y: Y(76) }, end: { x: 559, y: Y(76) }, color: rule, thickness: 0.8 })
  } else if (variant === 'U') {
    await drawLogo(100, 14)
    firstPage.drawText('06 15 70 36 70  ·  contact@aria-diagnostics.fr', { x: 40, y: Y(64), size: 7.4, font: regular, color: soft })
    const bx = 559 - 180
    firstPage.drawRectangle({ x: bx, y: Y(66), width: 3, height: 50, color: sky })
    firstPage.drawText('DEVIS', { x: bx + 12, y: Y(30), size: 9, font: bold, color: sky })
    firstPage.drawText(pdfSafe(`N° ${input.quoteNumber}`), { x: bx + 12, y: Y(45), size: 13, font: bold, color: navyC })
    firstPage.drawText(pdfSafe(`Émis le ${dateFr(input.createdAt)}  ·  Valable 30 jours`), { x: bx + 12, y: Y(59), size: 7.5, font: regular, color: soft })
    firstPage.drawRectangle({ x: 0, y: Y(78), width: 595.28, height: 4, color: navyC })
  } else if (variant === 'Q') {
    await drawLogo(100, 12)
    firstPage.drawSvgPath('M 400 0 L 595.28 0 L 595.28 30 L 386 30 Z', { x: 0, y: 841.89, color: navyC })
    firstPage.drawSvgPath('M 386 30 L 392 30 L 406 0 L 400 0 Z', { x: 0, y: 841.89, color: sky })
    textRight(`DEVIS  N° ${input.quoteNumber}`, 559, Y(20), 10.5, bold, white)
    textRight(`Émis le ${dateFr(input.createdAt)}  ·  Valable 30 jours`, 559, Y(46), 8, regular, soft)
    textRight('Devis gratuit et sans engagement', 559, Y(58), 7, regular, soft)
    firstPage.drawText('06 15 70 36 70  ·  contact@aria-diagnostics.fr', { x: 40, y: Y(62), size: 7.4, font: regular, color: soft })
    firstPage.drawRectangle({ x: 0, y: Y(72), width: 595.28, height: 1.5, color: sky })
  } else {
    try {
      const logo = await pdf.embedJpg(`data:image/jpeg;base64,${TPL.HEADER_LOGO_JPEG}`)
      firstPage.drawImage(logo, { x: 36, y: Y(58), width: 105, height: 105 * logo.height / logo.width })
    } catch {
      if (ariaLogo) firstPage.drawImage(ariaLogo, { x: 40, y: Y(56), width: 110, height: 41 })
    }
    firstPage.drawSvgPath('M 360 0 L 595.28 0 L 595.28 76 L 326 76 Z', { x: 0, y: 841.89, color: navyC })
    firstPage.drawSvgPath('M 326 76 L 334 76 L 368 0 L 360 0 Z', { x: 0, y: 841.89, color: sky })
    firstPage.drawRectangle({ x: 0, y: Y(78), width: 595.28, height: 1.5, color: sky })
    textRight(`DEVIS  N° ${input.quoteNumber}`, 559, Y(34), 14, bold, white)
    textRight(`Émis le ${dateFr(input.createdAt)}  ·  Valable 30 jours`, 559, Y(48), 7.8, regular, rgb(0.78, 0.86, 0.95))
    textRight('Devis gratuit et sans engagement', 559, Y(60), 6.8, regular, rgb(0.62, 0.76, 0.9))
    firstPage.drawText('06 15 70 36 70  ·  contact@aria-diagnostics.fr', { x: 40, y: Y(69), size: 7.4, font: regular, color: soft })
  }

  const c1 = 32, c2 = 248, c3 = 455
  const t1 = 66, t2 = 282, t3 = 489

  // Ligne 1 : émetteur, donneur d'ordre, dossier.
  iconBox(icons.send, c1, 96)
  field(t1, 100, 'Devis édité par', [
    { text: 'ARIA DIAGNOSTICS', bold: true },
    { text: '18 rue de Budapest' },
    { text: '94140 ALFORTVILLE' },
    { text: '06 15 70 36 70' },
    { text: 'contact@aria-diagnostics.fr' },
    { text: 'SIRET : 988 026 746 00012 - NAF : 7120B' },
  ], 170)
  iconBox(icons.briefcase, c2, 96)
  field(t2, 100, 'À l’attention du donneur d’ordre', [
    { text: input.contactName || '', bold: true },
    { text: input.contactPhone || '' },
    { text: input.contactEmail || '' },
  ], 165)
  iconBox(icons.folder, c3, 96)
  field(t3, 100, 'Votre Dossier', [{ text: input.dossierRef || '', bold: true }], 80)

  // Ligne 2 : bien, propriétaire, RDV.
  iconBox(icons.pin, c1, 182)
  const bienBottom = field(t1, 186, 'Bien objet de l’intervention', [
    { text: input.propertyAddress, bold: true },
    { text: `${input.propertyLabel || 'Bien'}${input.propertySize ? ` - ${input.propertySize}` : ''}` },
  ], 170)
  iconBox(icons.person, c2, 182)
  field(t2, 186, 'Propriétaire identifié', [{ text: input.ownerName || '', bold: true }], 165)
  iconBox(icons.calendar, c3, 182)
  field(t3, 186, 'RDV prévu le', [{ text: input.appointmentAt ? dateFr(input.appointmentAt) : '', bold: true }], 80)

  // Prestations à réaliser.
  const prestations = (input.diagnostics && input.diagnostics.length ? input.diagnostics : input.lines.map((l) => l.label)).join(', ')
  iconBox(icons.checklist, c2, 224)
  const prestaBottom = field(t2, 228, 'Prestations à réaliser', [{ text: prestations, bold: true }], 280)

  // Dépendances.
  let top = Math.max(bienBottom, prestaBottom, 284) + 14
  const deps = (input.dependencies || []).map((d) => normalizeKey(d))
  let dx = 66
  firstPage.drawText('Autres dépendances :', { x: dx, y: Y(top), size: 7.8, font: regular, color: soft })
  dx += regular.widthOfTextAtSize('Autres dépendances :', 7.8) + 8
  for (const dep of ['Ascenseur', 'Cave', 'Garage', 'Parking', 'Terrain', 'Autre']) {
    const checked = deps.includes(normalizeKey(dep))
    firstPage.drawRectangle({ x: dx, y: Y(top) - 1, width: 8, height: 8, borderColor: ink, borderWidth: 0.8 })
    if (checked) {
      firstPage.drawLine({ start: { x: dx + 1.5, y: Y(top) + 0.5 }, end: { x: dx + 6.5, y: Y(top) + 5.5 }, color: ink, thickness: 1 })
      firstPage.drawLine({ start: { x: dx + 1.5, y: Y(top) + 5.5 }, end: { x: dx + 6.5, y: Y(top) + 0.5 }, color: ink, thickness: 1 })
    }
    firstPage.drawText(dep, { x: dx + 11, y: Y(top), size: 7.8, font: regular, color: ink })
    dx += 11 + regular.widthOfTextAtSize(dep, 7.8) + 12
  }

  // Tableau des prestations.
  top += 12
  const tcols = [32, 92, 300, 350, 382, 414, 466, 514, 565]
  const heads = ['Référence', 'Désignation', 'P Unit € HT', 'Taux TVA', 'Quant.', 'Montant € HT', 'Montant TVA', 'Montant € TTC']
  const headH = 22
  firstPage.drawRectangle({ x: tcols[0], y: Y(top + headH), width: tcols[8] - tcols[0], height: headH, color: sky })
  heads.forEach((h, i) => {
    const mid = (tcols[i] + tcols[i + 1]) / 2
    const parts = wrapText(h, bold, 6.8, tcols[i + 1] - tcols[i] - 4)
    parts.forEach((part, k) => textCenter(part, mid, Y(top + (parts.length > 1 ? 10 : 14) + k * 8), 6.8, bold, white))
  })
  top += headH

  const calculatedTotal = input.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0),
    0,
  )
  const round2 = (v: number) => Math.round(v * 100) / 100
  const num = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  for (const line of input.lines) {
    const qty = Number(line.quantity || 0)
    const unitTtc = Number(line.unit_ttc || 0)
    const unitHt = round2(unitTtc / 1.2)
    const lineTtc = round2(qty * unitTtc)
    const lineHt = round2(lineTtc / 1.2)
    const lineTva = round2(lineTtc - lineHt)
    const labelLines = wrapText(String(line.label || 'Prestation'), regular, 7.6, tcols[2] - tcols[1] - 10)
    const ref = /pack/i.test(line.label) ? ['Pack', 'diagnostics'] : ['Prestation']
    const rowH = Math.max(24, 8 + Math.max(labelLines.length, ref.length) * 9.5)
    firstPage.drawRectangle({ x: tcols[0], y: Y(top + rowH), width: tcols[8] - tcols[0], height: rowH, borderColor: rule, borderWidth: 0.7 })
    for (let i = 1; i < 8; i++) {
      firstPage.drawLine({ start: { x: tcols[i], y: Y(top) }, end: { x: tcols[i], y: Y(top + rowH) }, color: rule, thickness: 0.7 })
    }
    const firstBase = top + rowH / 2 + 3 - ((Math.max(labelLines.length, 1) - 1) * 9.5) / 2
    ref.forEach((r, k) => textCenter(r, (tcols[0] + tcols[1]) / 2, Y(top + rowH / 2 + 3 - ((ref.length - 1) * 9.5) / 2 + k * 9.5), 7.6, bold, ink))
    labelLines.forEach((l, k) => firstPage.drawText(l, { x: tcols[1] + 5, y: Y(firstBase + k * 9.5), size: 7.6, font: regular, color: ink }))
    const mid = Y(top + rowH / 2 + 3)
    textRight(num(unitHt), tcols[3] - 5, mid, 7.6)
    textCenter('20', (tcols[3] + tcols[4]) / 2, mid, 7.6)
    textCenter(String(qty.toLocaleString('fr-FR')), (tcols[4] + tcols[5]) / 2, mid, 7.6)
    textRight(num(lineHt), tcols[6] - 5, mid, 7.6)
    textRight(num(lineTva), tcols[7] - 5, mid, 7.6)
    textRight(num(lineTtc), tcols[8] - 5, mid, 7.6)
    top += rowH
  }

  // Mentions (gauche) et totaux (droite).
  top += 18
  const totalHt = round2(calculatedTotal / 1.2)
  const vat = round2(calculatedTotal - totalHt)
  const tx = 418, tmid = 482, tend = 565, th = 17
  const totals: Array<[string, string, boolean]> = [
    ['Total HT', euro(totalHt), false],
    ['Détail TVA', `TVA 20% : ${euro(vat)}`, false],
    ['Total TVA', euro(vat), false],
    ['Total TTC', euro(calculatedTotal), true],
  ]
  totals.forEach(([k, v, strong], i) => {
    const yy = Y(top + (i + 1) * th)
    firstPage.drawRectangle({ x: tx, y: yy, width: tmid - tx, height: th, color: sky, borderColor: white, borderWidth: 0.7 })
    firstPage.drawRectangle({ x: tmid, y: yy, width: tend - tmid, height: th, color: strong ? rgb(0.93, 0.94, 0.95) : white, borderColor: rule, borderWidth: 0.7 })
    textRight(k, tmid - 6, yy + 5.5, 8.4, bold, white)
    textRight(v, tend - 5, yy + 5.5, 8.2, strong ? bold : regular, ink)
  })

  iconBox(icons.info, c1, top + 2)
  let ly = top + 9
  const para = (value: string, x: number, w: number, font: PDFFont = regular, size = 7.4) => {
    for (const l of wrapText(value, font, size, w)) {
      firstPage.drawText(l, { x, y: Y(ly), size, font, color: ink })
      ly += size + 2.3
    }
  }
  para('Pour les professionnels :', 66, 330, bold)
  para('Pénalités de retard : trois fois le taux d’intérêt légal. Une indemnité forfaitaire de 40 € pour frais de recouvrement est due en cas de retard de paiement (article L441-10 du Code de commerce). Aucun escompte pour paiement anticipé.', 66, 330)
  ly += 3
  para('Pour les particuliers :', 66, 350, bold)
  para('Médiateur de la consommation : CM2C, 49 rue de Ponthieu, 75008 Paris - www.cm2c.net (après réclamation écrite préalable auprès d’ARIA Diagnostics).', 66, 330)
  ly += 3
  para('Paiement à réception. Le devis, l’ordre de mission, les CGV, les CGI et les annexes forment l’ensemble contractuel.', 66, 330)
  if (input.notes) {
    ly += 3
    para(`Précisions : ${String(input.notes)}`, 66, 330)
  }

  top = Math.max(ly, top + 4 * th) + 16
  const hasAmiante = /amiante|dapp/i.test([...input.lines.map((l) => l.label), ...(input.diagnostics || [])].join(' '))
  if (hasAmiante) {
    iconBox(icons.microscope, c1, top)
    ly = top + 8
    para('Ce tarif est hors coût éventuel de prélèvement et d’analyse de matériaux ou produits susceptibles de contenir de l’amiante, facturés après accord exprès du donneur d’ordre.', 66, 305)
  }

  // Bon pour accord.
  iconBox(icons.sign, 395, top)
  firstPage.drawText('BON POUR ACCORD', { x: 428, y: Y(top + 9), size: 8.6, font: bold, color: ink })
  firstPage.drawText('Date + signature + mention « Bon pour accord »', { x: 428, y: Y(top + 19), size: 6.8, font: regular, color: soft })
  firstPage.drawRectangle({ x: 395, y: Y(top + 80), width: 170, height: 52, borderColor: rule, borderWidth: 0.8 })

  const documents: ContractDocument[] = [
    missionDocument(input.quoteNumber, input.propertyAddress, input.contactName, input.lines, input.diagnostics || [], input.missionTechnicalInfo || []),
    generalTerms,
    interventionTerms(input.lines, input.diagnostics || []),
    withdrawalDocument,
  ]
  if (hasDpe(input.lines, input.diagnostics || [])) documents.push(dpeConsentDocument, dpeFiscalDocument)

  const headerLogo = await pdf.embedJpg(`data:image/jpeg;base64,${TPL.HEADER_LOGO_JPEG}`).catch(() => null)
  // Version fine du bandeau « bloc marine » pour les pages suivantes.
  const drawSlimHeader = (page: PDFPage) => {
    const H = 841.89
    if (headerLogo) page.drawImage(headerLogo, { x: 36, y: H - 46, width: 90, height: 90 * headerLogo.height / headerLogo.width })
    else if (ariaLogo) page.drawImage(ariaLogo, { x: left, y: H - 44, width: 76, height: 28 })
    page.drawSvgPath('M 380 0 L 595.28 0 L 595.28 54 L 356 54 Z', { x: 0, y: H, color: rgb(0.024, 0.169, 0.349) })
    page.drawSvgPath('M 356 54 L 364 54 L 388 0 L 380 0 Z', { x: 0, y: H, color: rgb(0.137, 0.647, 0.875) })
    page.drawRectangle({ x: 0, y: H - 56, width: 595.28, height: 1.5, color: rgb(0.137, 0.647, 0.875) })
    const ref = pdfSafe(`Devis N° ${input.quoteNumber}`)
    page.drawText(ref, { x: 559 - bold.widthOfTextAtSize(ref, 9), y: H - 30, size: 9, font: bold, color: white })
    const sub = pdfSafe(`du ${dateFr(input.createdAt)}`)
    page.drawText(sub, { x: 559 - regular.widthOfTextAtSize(sub, 7), y: H - 41, size: 7, font: regular, color: rgb(0.78, 0.86, 0.95) })
  }

  const addContractDocument = (document: ContractDocument) => {
    let page = pdf.addPage([595.28, 841.89])
    let currentY = 758
    const isCompactTerms = /conditions générales/i.test(document.title)
    const bodySize = isCompactTerms ? 7.35 : 8
    const bodyLineHeight = isCompactTerms ? 8.55 : 10.5
    const paragraphGap = isCompactTerms ? 2.5 : 6
    const blockGap = isCompactTerms ? 1.5 : 4
    const headingSize = isCompactTerms ? 9.2 : 10
    const headingLineHeight = isCompactTerms ? 10.8 : 13
    const headingGap = isCompactTerms ? 2.5 : 5
    const pageBottom = 78

    const drawHeader = () => {
      drawSlimHeader(page)
    }

    const newPage = () => {
      page = pdf.addPage([595.28, 841.89])
      currentY = 758
      drawHeader()
    }

    drawHeader()
    currentY = drawWrapped(page, document.title, left, currentY, width, bold, 19, blue, 22)
    currentY -= 2

    if (document.subtitle) {
      currentY = drawWrapped(page, document.subtitle, left, currentY, width, regular, 8.5, gray, 11)
    }
    page.drawLine({ start: { x: left, y: currentY + 2 }, end: { x: left + 60, y: currentY + 2 }, color: midBlue, thickness: 2 })
    currentY -= isCompactTerms ? 12 : 18

    for (const block of document.blocks) {
      if (currentY < (isCompactTerms ? 98 : 120)) newPage()

      page.drawRectangle({ x: left, y: currentY - 4, width: 3, height: 14, color: midBlue })
      currentY = drawWrapped(page, block.title, left + 9, currentY, width - 9, bold, headingSize, blue, headingLineHeight)
      currentY -= headingGap

      for (const paragraph of block.paragraphs) {
        const isBullet = /^[•□]\s/.test(paragraph) && !paragraph.startsWith('□')
        const isCheckbox = paragraph.startsWith('□')
        const hasBlanks = /_{5,}/.test(paragraph)
        const indent = isBullet || isCheckbox ? 14 : 0
        const body = isBullet ? paragraph.replace(/^•\s*/, '') : isCheckbox ? paragraph.replace(/^□\s*/, '') : paragraph
        const estimatedLines = wrapText(body, regular, bodySize, width - indent).length
        if (currentY - estimatedLines * bodyLineHeight - (hasBlanks ? 8 : 0) < pageBottom) newPage()

        if (hasBlanks && estimatedLines === 1) {
          // Champs à remplir : les « ____ » deviennent de vraies lignes.
          currentY -= 6
          let x = left + indent
          const parts = pdfSafe(body).split(/(_{5,})/)
          parts.forEach((part, index) => {
            if (/^_{5,}$/.test(part)) {
              const isLast = parts.slice(index + 1).every((rest) => !rest.trim())
              const lineW = isLast ? right - x : Math.min(part.length * 3.2, right - x)
              page.drawLine({ start: { x, y: currentY - 2 }, end: { x: x + lineW, y: currentY - 2 }, color: border, thickness: 1 })
              x += lineW + 6
            } else if (part.trim()) {
              page.drawText(part.trim(), { x, y: currentY, size: bodySize, font: regular, color: gray })
              x += regular.widthOfTextAtSize(part.trim(), bodySize) + 6
            }
          })
          currentY -= bodyLineHeight + paragraphGap + 4
          continue
        }

        if (isBullet) {
          page.drawRectangle({ x: left + 3, y: currentY + bodySize * 0.28, width: 3, height: 3, color: midBlue })
        } else if (isCheckbox) {
          page.drawRectangle({ x: left + 1, y: currentY - 1, width: 8, height: 8, borderColor: blue, borderWidth: 0.8 })
        }
        currentY = drawWrapped(page, body, left + indent, currentY, width - indent, regular, bodySize, gray, bodyLineHeight)
        currentY -= paragraphGap
      }
      currentY -= blockGap
    }
  }

  // CGV + CGI : texte compact sur deux colonnes, les deux documents à la
  // suite (sans saut de page), pour limiter le nombre de pages du devis.
  const addTermsColumns = (termDocs: ContractDocument[]) => {
    const gap = 16
    const colW = (width - gap) / 2
    const bodySize = 6.1
    const lineH = 6.75
    const headSize = 7
    const headLineH = 8
    const bottom = 56
    let page = pdf.addPage([595.28, 841.89])
    let col = 0
    let top = 766
    let y = top

    const drawHeader = () => {
      drawSlimHeader(page)
    }
    const colX = () => left + col * (colW + gap)
    const ensure = (needed: number) => {
      if (y - needed >= bottom) return
      if (col === 0) {
        col = 1
        y = top
      } else {
        page = pdf.addPage([595.28, 841.89])
        drawHeader()
        col = 0
        top = 766
        y = top
      }
    }
    const drawLines = (lines: string[], x: number, font: PDFFont, size: number, lh: number, color = gray) => {
      for (const l of lines) {
        ensure(lh)
        page.drawText(l, { x, y, size, font, color })
        y -= lh
      }
    }

    drawHeader()
    termDocs.forEach((doc, docIndex) => {
      // Titre du document sur toute la largeur quand il ouvre une colonne
      // gauche vide, sinon en tête de colonne.
      const titleLines = wrapText(doc.title.toUpperCase(), bold, 9.5, colW)
      if (docIndex > 0) y -= 8
      ensure(titleLines.length * 11 + 30)
      page.drawRectangle({ x: colX(), y: y - titleLines.length * 11 - 3, width: colW, height: titleLines.length * 11 + 9, color: rgb(0.137, 0.647, 0.875) })
      titleLines.forEach((l, i) => page.drawText(l, { x: colX() + 6, y: y - 5 - i * 11, size: 9.5, font: bold, color: white }))
      y -= titleLines.length * 11 + 12
      y -= 1

      for (const block of doc.blocks) {
        const headLines = wrapText(block.title, bold, headSize, colW)
        ensure(headLines.length * headLineH + 2 * lineH)
        y -= 2
        headLines.forEach((l) => {
          page.drawText(l, { x: colX(), y, size: headSize, font: bold, color: blue })
          y -= headLineH
        })
        for (const paragraph of block.paragraphs) {
          const isBullet = /^•\s/.test(paragraph)
          const body = isBullet ? paragraph.replace(/^•\s*/, '') : paragraph
          const indent = isBullet ? 7 : 0
          const lines = wrapText(body, regular, bodySize, colW - indent)
          lines.forEach((l, i) => {
            ensure(lineH)
            if (isBullet && i === 0) page.drawRectangle({ x: colX() + 1, y: y + 1.8, width: 2.2, height: 2.2, color: midBlue })
            page.drawText(l, { x: colX() + indent, y, size: bodySize, font: regular, color: gray })
            y -= lineH
          })
          y -= 1.2
        }
        y -= 1.5
      }
    })
  }

  addContractDocument(documents[0])
  addTermsColumns([documents[1], documents[2]])
  documents.slice(3).forEach(addContractDocument)

  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 46, color: rgb(0.024, 0.169, 0.349) })
    page.drawRectangle({ x: 0, y: 46, width: 595.28, height: 2, color: rgb(0.137, 0.647, 0.875) })
    page.drawText('ARIA DIAGNOSTICS   www.aria-diagnostics.fr', { x: 32, y: 32, size: 8.5, font: bold, color: white })
    const legalLines = [
      'SIRET : 988 026 746 00012 - Code APE : 7120B - Capital social : 1 000 € - N° TVA : FR34988026746',
      'Assurance RCP : AXA France IARD, 313 Terrasses de l’Arche, 92727 Nanterre - contrat n° 10988009704 - couverture : France',
    ]
    legalLines.forEach((line, k) => page.drawText(pdfSafe(line), { x: 32, y: 21 - k * 8, size: 5.9, font: regular, color: white }))
    const pageLabel = `PAGE ${index + 1}/${pages.length}`
    page.drawText(pageLabel, { x: 563 - bold.widthOfTextAtSize(pageLabel, 8), y: 30, size: 8, font: bold, color: white })
    const ref = pdfSafe(`Devis N° ${input.quoteNumber} du ${dateFr(input.createdAt)}`)
    page.drawText(ref, { x: 563 - regular.widthOfTextAtSize(ref, 6), y: 19, size: 6, font: regular, color: white })
  })

  const finalPage = pages[pages.length - 1]
  const noticeLines = wrapText(mediatorNotice, regular, 6.2, width)
  noticeLines.slice(0, 3).forEach((line, index) => {
    finalPage.drawText(line, { x: left, y: 52 + (Math.min(noticeLines.length, 3) - index) * 7.5, size: 6.2, font: regular, color: gray })
  })

  return pdf.save()
}
