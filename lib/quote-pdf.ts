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
  isTertiaryMission,
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
  lotFloor?: string | null
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

  // ---- Première page : style « classique expert » ARIA (marine + bleu ciel) ----
  const sky = rgb(0.137, 0.647, 0.875)
  const navyC = rgb(0.024, 0.169, 0.349)
  const ink = rgb(0.15, 0.2, 0.27)
  const soft = rgb(0.45, 0.5, 0.56)
  const rule = rgb(0.84, 0.87, 0.9)
  const M = 40
  const Y = (top: number) => 841.89 - top
  const T = (value: string, x: number, top: number, size: number, font: PDFFont = regular, color = ink) =>
    firstPage.drawText(pdfSafe(value), { x, y: Y(top), size, font, color })
  const TR = (value: string, xRight: number, top: number, size: number, font: PDFFont = regular, color = ink) => {
    const safe = pdfSafe(value)
    firstPage.drawText(safe, { x: xRight - font.widthOfTextAtSize(safe, size), y: Y(top), size, font, color })
  }
  const wrapDraw = (value: string, x: number, top: number, maxW: number, size: number, font: PDFFont = regular, color = ink, lh = size + 2.6) => {
    let t = top
    for (const l of wrapText(value, font, size, maxW)) {
      firstPage.drawText(l, { x, y: Y(t), size, font, color })
      t += lh
    }
    return t
  }
  const label = (value: string, x: number, top: number) => T(value.toUpperCase(), x, top, 7, bold, sky)

  // En-tête : logo + coordonnées à gauche, références du devis à droite.
  try {
    const logo = await pdf.embedJpg(`data:image/jpeg;base64,${TPL.HEADER_LOGO_JPEG}`)
    firstPage.drawImage(logo, { x: M, y: Y(18) - 100 * logo.height / logo.width, width: 100, height: 100 * logo.height / logo.width })
  } catch {
    if (ariaLogo) firstPage.drawImage(ariaLogo, { x: M, y: Y(58), width: 100, height: 37 })
  }
  T('18 rue de Budapest · 94140 Alfortville', M + 4, 67, 7.4, regular, soft)
  T('06 15 70 36 70 · contact@aria-diagnostics.fr', M + 4, 77, 7.4, regular, soft)
  const bx = 595.28 - M - 180
  firstPage.drawRectangle({ x: bx, y: Y(68), width: 4, height: 50, color: sky })
  T('DEVIS', bx + 12, 32, 9, bold, sky)
  T(`N° ${input.quoteNumber}`, bx + 12, 48, 13, bold, navyC)
  T(`Émis le ${dateFr(input.createdAt)}  ·  Valable 30 jours`, bx + 12, 62, 7.5, regular, soft)
  firstPage.drawRectangle({ x: 0, y: Y(88), width: 595.28, height: 4, color: navyC })
  firstPage.drawRectangle({ x: 0, y: Y(90.5), width: 595.28, height: 2.5, color: sky })

  // Donneur d'ordre / bien concerné.
  const colR = 595.28 / 2 + 10
  const colW = 595.28 / 2 - M - 14
  label('Donneur d’ordre', M, 114)
  let lt = wrapDraw(input.contactName || 'Non renseigné', M, 128, colW, 9.5, bold, navyC, 12.5)
  if (input.contactPhone) { T(input.contactPhone, M, lt, 8); lt += 11 }
  if (input.contactEmail) { T(input.contactEmail, M, lt, 8); lt += 11 }
  if (input.ownerName && input.ownerName !== input.contactName) { T(`Propriétaire : ${input.ownerName}`, M, lt, 8); lt += 11 }

  label('Bien concerné', colR, 114)
  let rt = wrapDraw(input.propertyAddress, colR, 128, colW, 9.5, bold, navyC, 12.5)
  T(`${input.propertyLabel || 'Bien'}${input.propertySize ? ` · ${input.propertySize}` : ''}`, colR, rt, 8); rt += 11
  if (input.dependencies && input.dependencies.length) {
    const deps = input.dependencies.map((dep) => dep.charAt(0).toUpperCase() + dep.slice(1)).join(', ')
    T(`Dépendances : ${deps}`, colR, rt, 8); rt += 11
  }
  if (input.dossierRef) { T(`Dossier ${input.dossierRef}`, colR, rt, 8); rt += 11 }
  if (input.appointmentAt) { T(`Rendez-vous prévu le ${dateFr(input.appointmentAt)}`, colR, rt, 8); rt += 11 }

  let top = Math.max(lt, rt) + 8
  firstPage.drawLine({ start: { x: M, y: Y(top) }, end: { x: 595.28 - M, y: Y(top) }, color: rule, thickness: 0.8 })

  // Prestations à réaliser.
  const prestations = input.diagnostics && input.diagnostics.length ? input.diagnostics : input.lines.map((l) => l.label)
  top += 20
  label('Prestations à réaliser', M, top)
  top = wrapDraw(prestations.join('  ·  '), M, top + 14, 595.28 - 2 * M, 8.6, bold, navyC, 11.5) + 12

  // Tableau.
  const xQty = 360, xUnit = 425, xTva = 470, xEnd = 595.28 - M
  firstPage.drawRectangle({ x: M, y: Y(top + 21), width: 595.28 - 2 * M, height: 22, color: navyC })
  firstPage.drawRectangle({ x: M, y: Y(top + 23), width: 595.28 - 2 * M, height: 2, color: sky })
  T('Désignation', M + 8, top + 13.5, 7.5, bold, white)
  TR('Qté', xQty, top + 13.5, 7.5, bold, white)
  TR('P.U. HT', xUnit, top + 13.5, 7.5, bold, white)
  TR('TVA', xTva, top + 13.5, 7.5, bold, white)
  TR('Total TTC', xEnd - 8, top + 13.5, 7.5, bold, white)
  top += 23

  const calculatedTotal = input.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0),
    0,
  )
  const round2 = (v: number) => Math.round(v * 100) / 100
  for (const line of input.lines) {
    const qty = Number(line.quantity || 0)
    const unitTtc = Number(line.unit_ttc || 0)
    const isOption = qty === 0 && unitTtc > 0
    const labelLines = wrapText(`${isOption ? 'Option (non incluse) – ' : ''}${String(line.label || 'Prestation')}`, regular, 8.4, xQty - M - 50)
    const rowH = Math.max(26, 12 + labelLines.length * 11)
    labelLines.forEach((l, k) => firstPage.drawText(l, { x: M + 8, y: Y(top + 16 + k * 11), size: 8.4, font: regular, color: isOption ? soft : ink }))
    if (isOption) {
      // Ligne « option » (quantité 0) : prix affiché, non compris dans le total.
      firstPage.drawRectangle({ x: xQty - 34, y: Y(top + 17), width: 7, height: 7, borderColor: soft, borderWidth: 0.8 })
      TR('Option', xQty, top + 16, 8.4, regular, soft)
      TR(euro(round2(unitTtc / 1.2)), xUnit, top + 16, 8.4, regular, soft)
      TR('20 %', xTva, top + 16, 8.4, regular, soft)
      TR(`+ ${euro(unitTtc)}`, xEnd - 8, top + 16, 8.4, bold, soft)
    } else {
    TR(String(qty.toLocaleString('fr-FR')), xQty, top + 16, 8.4)
    TR(euro(round2(unitTtc / 1.2)), xUnit, top + 16, 8.4)
    TR('20 %', xTva, top + 16, 8.4)
    TR(euro(round2(qty * unitTtc)), xEnd - 8, top + 16, 8.4, bold)
    }
    top += rowH
    firstPage.drawLine({ start: { x: M, y: Y(top) }, end: { x: xEnd, y: Y(top) }, color: rule, thickness: 0.8 })
  }

  // Mentions (gauche) et totaux (droite).
  top += 16
  const totalHt = round2(calculatedTotal / 1.2)
  const vat = round2(calculatedTotal - totalHt)
  TR('Total HT', xTva, top + 10, 8, regular, soft); TR(euro(totalHt), xEnd, top + 10, 8.5)
  TR('TVA 20 %', xTva, top + 24, 8, regular, soft); TR(euro(vat), xEnd, top + 24, 8.5)
  firstPage.drawLine({ start: { x: 380, y: Y(top + 32) }, end: { x: xEnd, y: Y(top + 32) }, color: sky, thickness: 2 })
  TR('TOTAL TTC', xTva, top + 50, 10, bold, navyC)
  TR(euro(calculatedTotal), xEnd, top + 50, 14, bold, sky)

  const mentionW = 300
  let mt = top + 6
  const mention = (value: string, font: PDFFont = regular) => { mt = wrapDraw(value, M, mt, mentionW, 6.9, font, soft, 9) + 2 }
  mention('Paiement à réception. Validité 30 jours. Le devis, l’ordre de mission, les CGV, les CGI et les annexes forment l’ensemble contractuel.')
  mention('Professionnels : pénalités de retard à trois fois le taux d’intérêt légal et indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 C. com.). Aucun escompte pour paiement anticipé.')
  mention('Particuliers : médiateur de la consommation CM2C, 49 rue de Ponthieu, 75008 Paris - www.cm2c.net, après réclamation écrite préalable.')
  if (/amiante|dapp/i.test([...input.lines.map((l) => l.label), ...(input.diagnostics || [])].join(' '))) {
    mention('Prélèvements et analyses amiante éventuels : 48 € TTC par prélèvement, facturés après accord exprès du donneur d’ordre.')
  }
  if (input.lines.some((l) => Number(l.quantity || 0) === 0 && Number(l.unit_ttc || 0) > 0)) {
    mention('Options : non comprises dans le total. Cochez la case de l’option souhaitée avant de signer, ou ajoutez-la depuis votre espace client : elle sera ajoutée au montant.', bold)
  }
  mention('Devis gratuit et sans engagement jusqu’à son acceptation.')
  if (input.notes) mention(`Précisions : ${String(input.notes)}`)

  // Bon pour accord.
  const signTop = Math.max(mt, top + 60) + 14
  const signW = 200
  const sx = xEnd - signW
  firstPage.drawRectangle({ x: sx, y: Y(signTop + 86), width: signW, height: 86, borderColor: rule, borderWidth: 0.8, color: white })
  firstPage.drawRectangle({ x: sx, y: Y(signTop + 86), width: 3, height: 86, color: sky })
  T('BON POUR ACCORD', sx + 12, signTop + 15, 8, bold, navyC)
  T('Date, signature et mention « Bon pour accord »', sx + 12, signTop + 26, 6.8, regular, soft)

  const documents: ContractDocument[] = [
    missionDocument(input.quoteNumber, input.propertyAddress, input.contactName, input.lines, input.diagnostics || [], input.missionTechnicalInfo || []),
    generalTerms,
    interventionTerms(input.lines, input.diagnostics || []),
    withdrawalDocument,
  ]
  if (hasDpe(input.lines, input.diagnostics || [])) {
    documents.push(dpeConsentDocument)
    if (!isTertiaryMission(input.lines, input.diagnostics || [])) documents.push(dpeFiscalDocument)
  }

  const headerLogo = await pdf.embedJpg(`data:image/jpeg;base64,${TPL.HEADER_LOGO_JPEG}`).catch(() => null)
  // Version fine du bandeau « bloc marine » pour les pages suivantes.
  const drawSlimHeader = (page: PDFPage) => {
    const H = 841.89
    if (headerLogo) page.drawImage(headerLogo, { x: 40, y: H - 44, width: 80, height: 80 * headerLogo.height / headerLogo.width })
    else if (ariaLogo) page.drawImage(ariaLogo, { x: 40, y: H - 44, width: 76, height: 28 })
    const ref = pdfSafe(`Devis N° ${input.quoteNumber}`)
    page.drawRectangle({ x: 555.28 - 130, y: H - 44, width: 3, height: 26, color: rgb(0.137, 0.647, 0.875) })
    page.drawText(ref, { x: 555.28 - 120, y: H - 29, size: 9, font: bold, color: rgb(0.024, 0.169, 0.349) })
    page.drawText(pdfSafe(`du ${dateFr(input.createdAt)}`), { x: 555.28 - 120, y: H - 40, size: 7, font: regular, color: rgb(0.45, 0.5, 0.56) })
    page.drawRectangle({ x: 0, y: H - 54, width: 595.28, height: 3, color: rgb(0.024, 0.169, 0.349) })
    page.drawRectangle({ x: 0, y: H - 56, width: 595.28, height: 2, color: rgb(0.137, 0.647, 0.875) })
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

      page.drawRectangle({ x: left, y: currentY - 4, width: 3, height: 14, color: rgb(0.137, 0.647, 0.875) })
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
      page.drawRectangle({ x: colX(), y: y - titleLines.length * 11 - 3, width: colW, height: titleLines.length * 11 + 9, color: rgb(0.024, 0.169, 0.349) })
      page.drawRectangle({ x: colX(), y: y - titleLines.length * 11 - 5, width: colW, height: 2, color: rgb(0.137, 0.647, 0.875) })
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

  // Ordre de mission en grille (reprise du modèle ARIA) : cases cochées
  // automatiquement selon les diagnostics commandés.
  const addMissionPage = () => {
    const page = pdf.addPage([595.28, 841.89])
    drawSlimHeader(page)
    const H = 841.89
    const sky = rgb(0.137, 0.647, 0.875)
    const navyM = rgb(0.024, 0.169, 0.349)
    const ink = rgb(0.15, 0.2, 0.27)
    const soft = rgb(0.45, 0.5, 0.56)
    const rule = rgb(0.84, 0.87, 0.9)
    const pale = rgb(0.94, 0.97, 0.99)
    const M = 40
    const W = 595.28 - 2 * M
    const Tm = (value: string, x: number, top: number, size: number, font: PDFFont = regular, color = ink) =>
      page.drawText(pdfSafe(value), { x, y: H - top, size, font, color })
    const wrapM = (value: string, x: number, top: number, maxW: number, size: number, font: PDFFont = regular, color = ink, lh = size + 2.4) => {
      let t = top
      for (const l of wrapText(value, font, size, maxW)) { page.drawText(l, { x, y: H - t, size, font, color }); t += lh }
      return t
    }
    const checkbox = (x: number, top: number, checked: boolean) => {
      page.drawRectangle({ x, y: H - top - 1, width: 7.5, height: 7.5, borderColor: navyM, borderWidth: 0.7, color: checked ? sky : undefined })
      if (checked) {
        page.drawLine({ start: { x: x + 1.5, y: H - top + 2.8 }, end: { x: x + 3.2, y: H - top + 1 }, color: white, thickness: 1.2 })
        page.drawLine({ start: { x: x + 3.2, y: H - top + 1 }, end: { x: x + 6.2, y: H - top + 5.2 }, color: white, thickness: 1.2 })
      }
    }
    const section = (roman: string, title: string, x: number, top: number, w: number) => {
      page.drawRectangle({ x, y: H - top - 16, width: w, height: 16, color: pale })
      if (roman) {
        page.drawRectangle({ x, y: H - top - 16, width: 20, height: 16, color: navyM })
        const rw = bold.widthOfTextAtSize(roman, 8)
        page.drawText(roman, { x: x + 10 - rw / 2, y: H - top - 11.5, size: 8, font: bold, color: white })
      }
      page.drawText(pdfSafe(title.toUpperCase()), { x: x + (roman ? 28 : 8), y: H - top - 11.5, size: 7.8, font: bold, color: navyM })
      page.drawRectangle({ x, y: H - top - 17.5, width: w, height: 1.5, color: sky })
      return top + 28
    }
    const row = (x: number, top: number, key: string, value: string, w: number, keyW = 78) => {
      Tm(key, x, top, 7.3, regular, soft)
      const end = value ? wrapM(value, x + keyW, top, w - keyW, 7.8, regular, ink, 9.6) : top + 9.6
      page.drawLine({ start: { x: x + keyW, y: H - end + 6.5 }, end: { x: x + w, y: H - end + 6.5 }, color: rule, thickness: 0.5 })
      return end + 3
    }

    let top = 76
    Tm('Ordre de mission', M, top, 19, bold, navyM)
    Tm('Tient lieu de bon de commande en cas d’acceptation du devis', M, top + 14, 8, regular, soft)
    page.drawRectangle({ x: M, y: H - top - 22, width: 60, height: 2, color: sky })
    top += 34

    // I. Objet de la mission
    top = section('I', 'Objet de la mission', M, top, W)
    const ordered = normalizeKey([...(input.diagnostics || []), ...input.lines.map((l) => l.label)].join(' | '))
    const has = (re: RegExp) => re.test(ordered)
    const groups: Array<[string, Array<[string, boolean]>]> = [
      ['Diagnostics transactionnels', [
        ['Constat amiante avant-vente', has(/amiante/) && !has(/dapp|parties privatives|travaux|demolition|dossier technique|\bdta\b/)],
        ['Amiante parties privatives (DAPP)', has(/dapp|parties privatives/)],
        ['Plomb (CREP)', has(/plomb|crep/) && !has(/plomb[^|]*travaux/)],
        ['Termites', has(/termite/)],
        ['État de l’installation gaz', has(/gaz/)],
        ['État de l’installation électrique', has(/electri/)],
        ['État des risques et pollutions', has(/\berp\b|risques/)],
      ]],
      ['Surfaces et énergie', [
        ['Mesurage Loi Carrez', has(/carrez/)],
        ['Surface habitable (Boutin)', has(/boutin|surface habitable|metrage|mesurage/) && !has(/carrez/)],
        ['Diagnostic de performance énergétique', has(/\bdpe\b|performance energetique/)],
        ['Audit énergétique', has(/audit/)],
        ['Thermographie infrarouge', has(/thermographie/)],
      ]],
      ['Amiante et plomb', [
        ['Dossier technique amiante (DTA)', has(/dossier technique amiante|\bdta\b/)],
        ['Repérage amiante avant travaux', has(/amiante[^|]*travaux|travaux[^|]*amiante|raat/)],
        ['Repérage amiante avant démolition', has(/demolition/)],
        ['Examen visuel après travaux', has(/examen visuel/)],
        ['Plomb avant travaux', has(/plomb[^|]*travaux/)],
      ]],
      ['Autres missions', [
        ['Assainissement', has(/assainissement/)],
        ['Accessibilité handicapés', has(/accessibilite/)],
        ['Autre (préciser) :', false],
      ]],
    ]
    const gW = W / 4
    let maxTop = top
    groups.forEach(([title, items], gi) => {
      const x = M + gi * gW
      Tm(title.toUpperCase(), x, top, 6.4, bold, sky)
      let t = top + 12
      for (const [lab, checked] of items) {
        checkbox(x, t, checked)
        t = wrapM(lab, x + 11, t, gW - 16, 7.1, checked ? bold : regular, checked ? navyM : ink, 8.4) + 3
      }
      maxTop = Math.max(maxTop, t)
    })
    top = maxTop + 6

    // II. Donneur d'ordre / III. Propriétaire
    const half = (W - 14) / 2
    const x2 = M + half + 14
    let tl = section('II', 'Donneur d’ordre', M, top, half)
    let tr = section('III', 'Propriétaire', x2, top, half)
    tl = row(M, tl, 'Nom / société', input.contactName || '', half)
    tl = row(M, tl, 'Téléphone', input.contactPhone || '', half)
    tl = row(M, tl, 'E-mail', input.contactEmail || '', half)
    tr = row(x2, tr, 'Nom / société', input.ownerName || '', half)
    tr = row(x2, tr, 'Adresse', input.ownerName ? '' : '', half)
    tr = row(x2, tr, 'Téléphone / e-mail', '', half)
    top = Math.max(tl, tr) + 6

    // IV. Détails de la mission / V. Environnement
    tl = section('IV', 'Détails de la mission', M, top, half)
    tr = section('V', 'Environnement', x2, top, half)
    tl = row(M, tl, 'Adresse du bien', input.propertyAddress, half)
    tl = row(M, tl, 'Type de bien', input.propertyLabel || '', half)
    tl = row(M, tl, 'Surface', input.propertySize || '', half)
    tl = row(M, tl, 'Date de visite', input.appointmentAt ? dateFr(input.appointmentAt) : '', half)
    tl = row(M, tl, 'Remise des clés', '', half)
    tl = row(M, tl, 'Lot(s) / étage', input.lotFloor || '', half)
    const deps = (input.dependencies || []).map((d) => normalizeKey(d))
    Tm('Dépendances :', x2, tr, 7.3, regular, soft)
    let dx = x2 + 54
    for (const dep of ['Cave', 'Garage', 'Parking', 'Terrain', 'Autre']) {
      const w = 10 + regular.widthOfTextAtSize(dep, 7.1) + 6
      if (dx + w > x2 + half) { tr += 11; dx = x2 + 54 }
      checkbox(dx, tr, deps.includes(normalizeKey(dep)))
      Tm(dep, dx + 10, tr, 7.1)
      dx += w
    }
    tr += 14
    const tech = (input.missionTechnicalInfo || []).filter((info) => !/^(type de bien|objet|surface déclarée|dépendances)/i.test(info))
    Tm('Informations déclarées :', x2, tr, 7.3, regular, soft)
    tr += 10
    if (tech.length) {
      for (const info of tech) tr = wrapM(`• ${info}`, x2 + 4, tr, half - 8, 7, regular, ink, 8.6) + 1
    } else {
      for (let k = 0; k < 3; k++) { page.drawLine({ start: { x: x2, y: H - tr - 2 }, end: { x: x2 + half, y: H - tr - 2 }, color: rule, thickness: 0.5 }); tr += 12 }
    }
    top = Math.max(tl, tr) + 6

    // VI. Occupant / VII. Périmètre
    tl = section('VI', 'Occupant / exploitant', M, top, half)
    tr = section('VII', 'Périmètre d’intervention', x2, top, half)
    tl = row(M, tl, 'Nom', '', half)
    tl = row(M, tl, 'Téléphone', '', half)
    tr = wrapM('Toutes parties accessibles, sans démontage ni destruction, selon les référentiels applicables et les conditions générales d’intervention.', x2, tr, half, 7.3, regular, ink, 9) + 2
    top = Math.max(tl, tr) + 8

    // Attestation sur l'honneur + acceptation.
    top = section('', 'Attestation sur l’honneur (art. R271-3 du CCH)', M, top, W)
    top = wrapM('ARIA Diagnostics atteste sur l’honneur être en situation régulière au regard de l’article L271-6 du CCH (certifications en cours de validité, assurance RCP, absence de lien portant atteinte à son impartialité et à son indépendance à l’égard du propriétaire, de son mandataire ou d’une entreprise de travaux) et disposer des moyens en matériel et en personnel nécessaires à la mission.', M, top, W, 7, regular, ink, 8.8) + 8

    const boxH = 70
    page.drawRectangle({ x: M, y: H - top - boxH, width: W, height: boxH, borderColor: rule, borderWidth: 0.8 })
    page.drawRectangle({ x: M, y: H - top - boxH, width: 3, height: boxH, color: sky })
    Tm('ACCEPTATION DU DONNEUR D’ORDRE', M + 12, top + 14, 8, bold, navyM)
    wrapM('Je reconnais avoir pris connaissance du devis, du présent ordre de mission, des CGV, des CGI et des annexes, et confie la mission à ARIA Diagnostics.', M + 12, top + 26, W / 2 - 10, 6.9, regular, soft, 8.6)
    Tm('Nom / qualité :', M + 12, top + 58, 7.2, regular, soft)
    page.drawLine({ start: { x: M + 70, y: H - top - 60 }, end: { x: M + W / 2 - 10, y: H - top - 60 }, color: rule, thickness: 0.6 })
    Tm('Date, signature et « Bon pour accord » :', M + W / 2 + 10, top + 14, 7.2, regular, soft)
  }
  addMissionPage()
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
