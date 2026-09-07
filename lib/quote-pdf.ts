import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib'
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

const loadAriaLogo = async (pdf: PDFDocument, origin?: string): Promise<PDFImage | null> => {
  if (!origin) return null
  try {
    const response = await fetch(`${origin.replace(/\/$/, '')}/logo-aria.svg`, { cache: 'no-store' })
    if (!response.ok) return null
    const svg = await response.text()
    const match = svg.match(/data:image\/jpeg;base64,([^"']+)/i)
    if (!match?.[1]) return null
    return await pdf.embedJpg(Buffer.from(match[1], 'base64'))
  } catch {
    return null
  }
}

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ariaLogo = await loadAriaLogo(pdf, input.origin)
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

  if (ariaLogo) {
    firstPage.drawImage(ariaLogo, { x: left, y: 764, width: 140, height: 52 })
  } else {
    text('ARIA DIAGNOSTICS', left, y, 18, bold, blue)
  }
  text('18 rue de Budapest · 94140 Alfortville', left, 750, 8, regular, gray)
  text('06 15 70 36 70 · contact@aria-diagnostics.fr', left, 738, 8, regular, gray)

  text('DEVIS', right - 85, y, 15, regular, blue)
  text(input.quoteNumber, right - 120, y - 18, 9, bold, blue)
  text(`Émis le ${dateFr(input.createdAt)}`, right - 120, y - 31, 8, regular, gray)
  text('Validité : 30 jours', right - 120, y - 43, 8, regular, gray)

  firstPage.drawRectangle({ x: left, y: 726, width, height: 2.5, color: midBlue })
  y = 704

  const cardGap = 12
  const cardW = (width - cardGap) / 2
  box(left, y - 86, cardW, 86)
  box(left + cardW + cardGap, y - 86, cardW, 86)

  text('ARIA Diagnostics', left + 10, y - 15, 10, bold)
  text('18 rue de Budapest · 94140 Alfortville', left + 10, y - 29, 7.5, regular, gray)
  text('06 15 70 36 70 · contact@aria-diagnostics.fr', left + 10, y - 41, 7.5, regular, gray)
  text('www.aria-diagnostics.fr', left + 10, y - 53, 7.5, regular, gray)
  text('SASU · SIRET 988 026 746 00012 · TVA FR34 988026746', left + 10, y - 68, 6.5, regular, gray)
  text('RCP AXA n°10988009704 · Certification Bureau Veritas', left + 10, y - 78, 6.5, regular, gray)

  const rx = left + cardW + cardGap + 10
  text("À l’attention du donneur d’ordre", rx, y - 15, 8.5, bold, midBlue)
  text(input.contactName || 'Contact non renseigné', rx, y - 32, 9.5, bold)
  if (input.contactPhone) text(input.contactPhone, rx, y - 47, 8, regular, gray)
  if (input.contactEmail) text(input.contactEmail, rx, y - 60, 8, regular, gray)

  y -= 102
  box(left, y - 58, width, 58)
  text('Bien concerné par la mission', left + 10, y - 15, 8.5, bold, midBlue)
  text(input.propertyAddress, left + 10, y - 32, 9.5, bold)
  text(
    `${input.propertyLabel || 'Bien'}${input.propertySize ? ` · ${input.propertySize}` : ''}`,
    left + 10,
    y - 46,
    8,
    regular,
    gray,
  )

  y -= 76
  const cols = [left, left + 290, left + 345, left + 430, right]
  firstPage.drawRectangle({ x: left, y: y - 18, width, height: 18, color: lightBlue })
  text('Prestation', cols[0] + 6, y - 12, 7.5, bold)
  text('Qté', cols[1] + 6, y - 12, 7.5, bold)
  text('Prix unitaire TTC', cols[2] + 6, y - 12, 7.5, bold)
  text('Total TTC', cols[3] + 6, y - 12, 7.5, bold)
  y -= 18

  const calculatedTotal = input.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0),
    0,
  )

  for (const line of input.lines) {
    const rowH = 18
    firstPage.drawLine({
      start: { x: left, y: y - rowH },
      end: { x: right, y: y - rowH },
      color: border,
      thickness: 0.7,
    })
    text(String(line.label || 'Prestation').slice(0, 65), cols[0] + 6, y - 12, 7.5, regular, blue)
    text(String(Number(line.quantity || 0).toLocaleString('fr-FR')), cols[1] + 6, y - 12, 7.5, regular, blue)
    text(euro(Number(line.unit_ttc || 0)), cols[2] + 6, y - 12, 7.5, regular, blue)
    text(euro(Number(line.quantity || 0) * Number(line.unit_ttc || 0)), cols[3] + 6, y - 12, 7.5, bold, blue)
    y -= rowH
  }

  y -= 16
  const totalHt = Math.round((calculatedTotal / 1.2) * 100) / 100
  const vat = Math.round((calculatedTotal - totalHt) * 100) / 100

  box(left, y - 76, 318, 76)
  text('Conditions', left + 10, y - 15, 8.5, bold, midBlue)
  text('Paiement à réception. Validité du devis : 30 jours à compter de sa date d’émission.', left + 10, y - 31, 7, regular, gray)
  text('Le devis, l’ordre de mission, les CGV, les CGI et les annexes forment l’ensemble contractuel.', left + 10, y - 44, 7, regular, gray)
  if (input.notes) {
    drawWrapped(firstPage, `Précisions : ${String(input.notes)}`, left + 10, y - 58, 298, regular, 6.6, gray, 7.5)
  }

  box(right - 176, y - 76, 176, 76)
  text('Total HT', right - 164, y - 18, 8, regular, gray)
  text(euro(totalHt), right - 78, y - 18, 8, bold)
  text('TVA 20 %', right - 164, y - 35, 8, regular, gray)
  text(euro(vat), right - 78, y - 35, 8, bold)
  firstPage.drawLine({ start: { x: right - 164, y: y - 47 }, end: { x: right - 12, y: y - 47 }, color: blue, thickness: 1 })
  text('Total TTC', right - 164, y - 63, 8, bold)
  text(euro(calculatedTotal), right - 78, y - 63, 8, bold)

  y -= 96
  box(left, y - 106, width, 106)
  text('Bon pour accord', left + 10, y - 16, 8.5, bold, midBlue)
  text('Je reconnais avoir pris connaissance du devis et de ses annexes et en accepter les conditions.', left + 10, y - 31, 7, regular, gray)
  text('Date', left + 10, y - 52, 7, regular, gray)
  firstPage.drawLine({ start: { x: left + 10, y: y - 68 }, end: { x: left + 180, y: y - 68 }, color: border, thickness: 1 })
  text('Nom / qualité', left + 205, y - 52, 7, regular, gray)
  firstPage.drawLine({ start: { x: left + 205, y: y - 68 }, end: { x: left + 375, y: y - 68 }, color: border, thickness: 1 })
  text('Signature précédée de la mention « Bon pour accord »', left + 10, y - 87, 7, regular, gray)
  firstPage.drawRectangle({ x: left + 285, y: y - 98, width: 210, height: 28, borderColor: border, borderWidth: 1 })

  const documents: ContractDocument[] = [
    missionDocument(input.quoteNumber, input.propertyAddress, input.contactName, input.lines, input.diagnostics || []),
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
      page.drawText(pdfSafe(input.quoteNumber), { x: right - 110, y: 807, size: 7, font: regular, color: gray })
      page.drawRectangle({ x: left, y: 791, width, height: 1.5, color: midBlue })
    }

    const newPage = () => {
      page = pdf.addPage([595.28, 841.89])
      currentY = 765
      drawHeader()
    }

    drawHeader()
    currentY = drawWrapped(page, document.title, left, currentY, width, bold, 17, blue, 20)
    currentY -= 3

    if (document.subtitle) {
      currentY = drawWrapped(page, document.subtitle, left, currentY, width, regular, 8.5, gray, 11)
      currentY -= isCompactTerms ? 5 : 10
    }

    for (const block of document.blocks) {
      if (currentY < (isCompactTerms ? 82 : 105)) newPage()

      page.drawRectangle({ x: left, y: currentY - 4, width: 3, height: 14, color: midBlue })
      currentY = drawWrapped(page, block.title, left + 9, currentY, width - 9, bold, headingSize, blue, headingLineHeight)
      currentY -= headingGap

      for (const paragraph of block.paragraphs) {
        const estimatedLines = wrapText(paragraph, regular, bodySize, width).length
        if (currentY - estimatedLines * bodyLineHeight < pageBottom) newPage()
        currentY = drawWrapped(page, paragraph, left, currentY, width, regular, bodySize, gray, bodyLineHeight)
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
