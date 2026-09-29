import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { ARIA_LOGO_JPEG_BASE64 } from '@/lib/aria-logo-generated'
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

  const pale = rgb(0.957, 0.976, 0.992)
  const zebra = rgb(0.972, 0.979, 0.986)
  const textRight = (value: string, xRight: number, yy: number, size = 9, font: PDFFont = regular, color = blue) => {
    const safe = pdfSafe(value)
    firstPage.drawText(safe, { x: xRight - font.widthOfTextAtSize(safe, size), y: yy, size, font, color })
  }
  const label = (value: string, x: number, yy: number, color = midBlue) => text(value.toUpperCase(), x, yy, 6.8, bold, color)

  // En-tête : logo à gauche, titre et références à droite.
  if (ariaLogo) {
    firstPage.drawImage(ariaLogo, { x: left, y: 764, width: 130, height: 48 })
  } else {
    text('ARIA DIAGNOSTICS', left, 790, 18, bold, blue)
  }
  textRight('DEVIS', right, 790, 24, bold, blue)
  const meta: Array<[string, string]> = [
    ['N°', input.quoteNumber],
    ['Émis le', dateFr(input.createdAt)],
    ['Validité', '30 jours'],
  ]
  meta.forEach(([key, value], index) => {
    const yy = 770 - index * 12
    textRight(value, right, yy, 8.5, bold, blue)
    const valueW = bold.widthOfTextAtSize(pdfSafe(value), 8.5)
    textRight(key, right - valueW - 8, yy, 8, regular, gray)
  })
  firstPage.drawRectangle({ x: left, y: 735, width, height: 3, color: midBlue })

  // Émetteur / donneur d'ordre.
  y = 718
  const cardGap = 16
  const cardW = (width - cardGap) / 2
  label('Émetteur', left, y - 4)
  text('ARIA Diagnostics', left, y - 20, 11, bold)
  text('18 rue de Budapest · 94140 Alfortville', left, y - 34, 8, regular, gray)
  text('06 15 70 36 70 · contact@aria-diagnostics.fr', left, y - 46, 8, regular, gray)
  text('www.aria-diagnostics.fr', left, y - 58, 8, regular, gray)

  const rx = left + cardW + cardGap
  firstPage.drawRectangle({ x: rx, y: y - 72, width: cardW, height: 78, color: pale })
  firstPage.drawRectangle({ x: rx, y: y - 72, width: 3, height: 78, color: midBlue })
  label('Donneur d’ordre', rx + 14, y - 8)
  text(input.contactName || 'Contact non renseigné', rx + 14, y - 25, 11, bold)
  if (input.contactPhone) text(input.contactPhone, rx + 14, y - 40, 8, regular, gray)
  if (input.contactEmail) text(input.contactEmail, rx + 14, y - 52, 8, regular, gray)

  // Bien concerné.
  y -= 92
  firstPage.drawRectangle({ x: left, y: y - 46, width, height: 46, borderColor: border, borderWidth: 1, color: white })
  label('Bien concerné par la mission', left + 12, y - 13)
  text(input.propertyAddress, left + 12, y - 28, 10, bold)
  text(`${input.propertyLabel || 'Bien'}${input.propertySize ? ` · ${input.propertySize}` : ''}`, left + 12, y - 40, 8, regular, gray)

  // Tableau des prestations.
  y -= 64
  const colLabelW = 300
  const colQty = left + 330
  const colUnitRight = left + 430
  const colTotalRight = right - 10
  firstPage.drawRectangle({ x: left, y: y - 20, width, height: 20, color: blue })
  text('Désignation', left + 10, y - 13.5, 7.5, bold, white)
  text('Qté', colQty, y - 13.5, 7.5, bold, white)
  textRight('P.U. TTC', colUnitRight, y - 13.5, 7.5, bold, white)
  textRight('Total TTC', colTotalRight, y - 13.5, 7.5, bold, white)
  y -= 20

  const calculatedTotal = input.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0),
    0,
  )

  input.lines.forEach((line, index) => {
    const labelLines = wrapText(String(line.label || 'Prestation'), regular, 8, colLabelW)
    const rowH = Math.max(22, 10 + labelLines.length * 10.5)
    if (index % 2 === 1) firstPage.drawRectangle({ x: left, y: y - rowH, width, height: rowH, color: zebra })
    labelLines.forEach((l, i) => firstPage.drawText(l, { x: left + 10, y: y - 14 - i * 10.5, size: 8, font: regular, color: blue }))
    text(String(Number(line.quantity || 0).toLocaleString('fr-FR')), colQty + 4, y - 14, 8, regular, blue)
    textRight(euro(Number(line.unit_ttc || 0)), colUnitRight, y - 14, 8, regular, blue)
    textRight(euro(Number(line.quantity || 0) * Number(line.unit_ttc || 0)), colTotalRight, y - 14, 8, bold, blue)
    y -= rowH
  })
  firstPage.drawLine({ start: { x: left, y }, end: { x: right, y }, color: border, thickness: 1 })

  // Conditions (gauche) et totaux (droite).
  y -= 18
  const totalHt = Math.round((calculatedTotal / 1.2) * 100) / 100
  const vat = Math.round((calculatedTotal - totalHt) * 100) / 100
  const totalsW = 190
  const totalsX = right - totalsW

  text('Total HT', totalsX + 10, y - 10, 8, regular, gray)
  textRight(euro(totalHt), right - 10, y - 10, 8.5, bold)
  text('TVA 20 %', totalsX + 10, y - 26, 8, regular, gray)
  textRight(euro(vat), right - 10, y - 26, 8.5, bold)
  firstPage.drawRectangle({ x: totalsX, y: y - 62, width: totalsW, height: 26, color: blue })
  text('TOTAL TTC', totalsX + 10, y - 53, 9, bold, white)
  textRight(euro(calculatedTotal), right - 10, y - 53.5, 12, bold, white)

  const condW = width - totalsW - 24
  label('Conditions', left, y - 8)
  let cy = drawWrapped(firstPage, 'Paiement à réception. Validité du devis : 30 jours à compter de sa date d’émission.', left, y - 22, condW, regular, 7.4, gray, 9.5)
  cy = drawWrapped(firstPage, 'Le devis, l’ordre de mission, les CGV, les CGI et les annexes forment l’ensemble contractuel.', left, cy - 2, condW, regular, 7.4, gray, 9.5)
  if (input.notes) {
    cy = drawWrapped(firstPage, String(input.notes), left, cy - 2, condW, regular, 7.4, gray, 9.5)
  }

  // Bon pour accord.
  y = Math.min(y - 80, cy - 16)
  const signH = 104
  firstPage.drawRectangle({ x: left, y: y - signH, width, height: signH, borderColor: border, borderWidth: 1, color: white })
  firstPage.drawRectangle({ x: left, y: y - 22, width, height: 22, color: pale })
  text('BON POUR ACCORD', left + 12, y - 14.5, 8, bold, midBlue)
  text('Je reconnais avoir pris connaissance du devis et de ses annexes et en accepter les conditions.', left + 12, y - 38, 7.4, regular, gray)
  const fieldY = y - 72
  text('Date', left + 12, fieldY + 12, 7, regular, gray)
  firstPage.drawLine({ start: { x: left + 12, y: fieldY }, end: { x: left + 132, y: fieldY }, color: border, thickness: 1 })
  text('Nom / qualité', left + 150, fieldY + 12, 7, regular, gray)
  firstPage.drawLine({ start: { x: left + 150, y: fieldY }, end: { x: left + 300, y: fieldY }, color: border, thickness: 1 })
  text('Signature, précédée de « Bon pour accord »', left + 318, y - 38 - 12, 7, regular, gray)
  firstPage.drawRectangle({ x: left + 318, y: y - signH + 10, width: width - 330, height: 40, borderColor: border, borderWidth: 1 })

  // Mentions légales de l'émetteur, en bas de la première page.
  const legal = [
    'ARIA Diagnostics · SASU · SIRET 988 026 746 00012 · TVA FR34 988026746 · Certification Bureau Veritas',
    'RCP AXA France IARD, 313 Terrasses de l’Arche, 92727 Nanterre Cedex · contrat n°10988009704 · couverture géographique : France',
  ]
  legal.forEach((line, index) => {
    const safe = pdfSafe(line)
    const w = regular.widthOfTextAtSize(safe, 6.3)
    firstPage.drawText(safe, { x: left + (width - w) / 2, y: 60 - index * 8.5, size: 6.3, font: regular, color: gray })
  })

  const documents: ContractDocument[] = [
    missionDocument(input.quoteNumber, input.propertyAddress, input.contactName, input.lines, input.diagnostics || [], input.missionTechnicalInfo || []),
    generalTerms,
    interventionTerms(input.lines, input.diagnostics || []),
    withdrawalDocument,
  ]
  if (hasDpe(input.lines, input.diagnostics || [])) documents.push(dpeConsentDocument, dpeFiscalDocument)

  const addContractDocument = (document: ContractDocument) => {
    let page = pdf.addPage([595.28, 841.89])
    let currentY = 765
    const isCompactTerms = /conditions générales/i.test(document.title)
    const bodySize = isCompactTerms ? 7.35 : 8
    const bodyLineHeight = isCompactTerms ? 8.55 : 10.5
    const paragraphGap = isCompactTerms ? 2.5 : 6
    const blockGap = isCompactTerms ? 1.5 : 4
    const headingSize = isCompactTerms ? 9.2 : 10
    const headingLineHeight = isCompactTerms ? 10.8 : 13
    const headingGap = isCompactTerms ? 2.5 : 5
    const pageBottom = 62

    const drawHeader = () => {
      if (ariaLogo) {
        page.drawImage(ariaLogo, { x: left, y: 799, width: 76, height: 28 })
      } else {
        page.drawText('ARIA DIAGNOSTICS', { x: left, y: 807, size: 8, font: bold, color: blue })
      }
      const headerRef = pdfSafe(`Devis n° ${input.quoteNumber}`)
      page.drawText(headerRef, { x: right - regular.widthOfTextAtSize(headerRef, 7.5), y: 807, size: 7.5, font: regular, color: gray })
      page.drawRectangle({ x: left, y: 791, width, height: 1.5, color: midBlue })
    }

    const newPage = () => {
      page = pdf.addPage([595.28, 841.89])
      currentY = 765
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
      if (currentY < (isCompactTerms ? 82 : 105)) newPage()

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

  documents.forEach(addContractDocument)

  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    page.drawRectangle({ x: left, y: 38, width, height: 2, color: rgb(0.345, 0.765, 0.898) })
    page.drawText('ARIA Diagnostics · 18 rue de Budapest, 94140 Alfortville · contact@aria-diagnostics.fr', { x: left, y: 23, size: 6.3, font: regular, color: gray })
    const pageLabel = `Devis ${input.quoteNumber} · page ${index + 1}/${pages.length}`
    page.drawText(pdfSafe(pageLabel), { x: right - bold.widthOfTextAtSize(pageLabel, 6.3), y: 23, size: 6.3, font: bold, color: gray })
  })

  const finalPage = pages[pages.length - 1]
  const noticeLines = wrapText(mediatorNotice, regular, 6.2, width)
  noticeLines.slice(0, 3).forEach((line, index) => {
    finalPage.drawText(line, { x: left, y: 48 + (noticeLines.length - index) * 7.5, size: 6.2, font: regular, color: gray })
  })

  return pdf.save()
}
