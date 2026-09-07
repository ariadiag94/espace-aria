import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const sourcePath = join(root, 'public', 'logo-aria.svg')
const targetPath = join(root, 'lib', 'aria-logo-generated.ts')

const svg = await readFile(sourcePath, 'utf8')
const match = svg.match(/data:image\/jpeg;base64,([^"']+)/i)

if (!match?.[1]) {
  throw new Error('Impossible d’extraire le logo ARIA depuis public/logo-aria.svg')
}

const content = `// Fichier généré automatiquement depuis public/logo-aria.svg.\n// Ne pas modifier manuellement.\nexport const ARIA_LOGO_JPEG_BASE64 = ${JSON.stringify(match[1])}\n`

await writeFile(targetPath, content, 'utf8')
console.log('Logo ARIA intégré au bundle serveur PDF.')
