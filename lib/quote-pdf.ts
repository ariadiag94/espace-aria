import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type QuotePdfLine = {
  label: string
  quantity: number
  unit_ttc: number
}

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
}

const euro = (value: number) =>
  Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const dateFr = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const blue = rgb(0.024, 0.169, 0.349)
const midBlue = rgb(0.043, 0.424, 0.722)
const lightBlue = rgb(0.875, 0.957, 0.992)
const border = rgb(0.86, 0.9, 0.94)
const gray = rgb(0.38, 0.47, 0.56)
const white = rgb(1, 1, 1)

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const left = 42
  const right = 553
  const width = right - left
  let y = 800

  const text = (value: string, x: number, yy: number, size = 9, font = regular, color = blue) => {
    page.drawText(String(value || ''), { x, y: yy, size, font, color })
  }

  const box = (x: number, yy: number, w: number, h: number) => {
    page.drawRectangle({ x, y: yy, width: w, height: h, borderColor: border, borderWidth: 1, color: white })
  }

  text('ARIA DIAGNOSTICS', left, y, 18, bold, blue)
  text('18 rue de Budapest · 94140 Alfortville', left, y - 17, 8, regular, gray)
  text('06 15 70 36 70 · contact@aria-diagnostics.fr', left, y - 29, 8, regular, gray)

  text('DEVIS', right - 85, y, 15, regular, blue)
  text(input.quoteNumber, right - 120, y - 18, 9, bold, blue)
  text(`Émis le ${dateFr(input.createdAt)}`, right - 120, y - 31, 8, regular, gray)
  text('Validité : 30 jours', right - 120, y - 43, 8, regular, gray)

  page.drawRectangle({ x: left, y: y - 56, width, height: 2.5, color: midBlue })
  y -= 82

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
  text(`${input.propertyLabel || 'Bien'}${input.propertySize ? ` · ${input.propertySize}` : ''}`, left + 10, y - 46, 8, regular, gray)

  y -= 76
  const cols = [left, left + 290, left + 345, left + 430, right]
  page.drawRectangle({ x: left, y: y - 18, width, height: 18, color: lightBlue })
  text('Prestation', cols[0] + 6, y - 12, 7.5, bold)
  text('Qté', cols[1] + 6, y - 12, 7.5, bold)
  text('Prix unitaire TTC', cols[2] + 6, y - 12, 7.5, bold)
  text('Total TTC', cols[3] + 6, y - 12, 7.5, bold)
  y -= 18

  const calculatedTotal = input.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_ttc || 0), 0)

  for (const line of input.lines) {
    const rowH = 18
    page.drawLine({ start: { x: left, y: y - rowH }, end: { x: right, y: y - rowH }, color: border, thickness: 0.7 })
    text(line.label || 'Prestation', cols[0] + 6, y - 12, 7.5, regular, blue)
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
  text('Les prestations seront réalisées selon le périmètre indiqué ci-dessus.', left + 10, y - 44, 7, regular, gray)
  if (input.notes) text(`Précisions : ${String(input.notes).slice(0, 90)}`, left + 10, y - 61, 7, regular, gray)

  box(right - 176, y - 76, 176, 76)
  text('Total HT', right - 164, y - 18, 8, regular, gray)
  text(euro(totalHt), right - 78, y - 18, 8, bold)
  text('TVA 20 %', right - 164, y - 35, 8, regular, gray)
  text(euro(vat), right - 78, y - 35, 8, bold)
  page.drawLine({ start: { x: right - 164, y: y - 47 }, end: { x: right - 12, y: y - 47 }, color: blue, thickness: 1 })
  text('Total TTC', right - 164, y - 63, 8, bold)
  text(euro(calculatedTotal), right - 78, y - 63, 8, bold)

  y -= 96
  box(left, y - 106, width, 106)
  text('Bon pour accord', left + 10, y - 16, 8.5, bold, midBlue)
  text('Je reconnais avoir pris connaissance du présent devis et en accepter les conditions.', left + 10, y - 31, 7, regular, gray)
  text('Date', left + 10, y - 52, 7, regular, gray)
  page.drawLine({ start: { x: left + 10, y: y - 68 }, end: { x: left + 180, y: y - 68 }, color: border, thickness: 1 })
  text('Nom / qualité', left + 205, y - 52, 7, regular, gray)
  page.drawLine({ start: { x: left + 205, y: y - 68 }, end: { x: left + 375, y: y - 68 }, color: border, thickness: 1 })
  text('Signature précédée de la mention « Bon pour accord »', left + 10, y - 87, 7, regular, gray)
  page.drawRectangle({ x: left + 285, y: y - 98, width: 210, height: 28, borderColor: border, borderWidth: 1 })

  page.drawRectangle({ x: left, y: 38, width, height: 2, color: rgb(0.345, 0.765, 0.898) })
  text('ARIA Diagnostics · 18 rue de Budapest, 94140 Alfortville · 06 15 70 36 70 · contact@aria-diagnostics.fr', left, 23, 6.5, regular, gray)
  text(`Devis ${input.quoteNumber}`, right - 85, 23, 6.5, regular, gray)

  return pdf.save()
}
