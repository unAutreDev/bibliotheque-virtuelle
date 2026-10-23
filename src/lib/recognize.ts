import type { Block, Line } from 'tesseract.js'
import { cleanIsbn } from './bookSearch'

/**
 * Lit un code-barres EAN-13 de livre (ISBN 978/979) sur une photo, typiquement la 4e de couverture.
 * La bibliothèque (WebAssembly) n'est chargée qu'au premier usage.
 */
export async function readIsbn(photo: Blob): Promise<string | undefined> {
  const [{ readBarcodes, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
  const results = await readBarcodes(photo, { formats: ['EAN13', 'UPCA'], tryHarder: true, tryRotate: true, maxNumberOfSymbols: 3 })
  for (const result of results) {
    const isbn = cleanIsbn(result.text)
    if (isbn && /^97[89]/.test(isbn)) return isbn
  }
  return undefined
}

const lineHeight = (line: Line) => line.bbox.y1 - line.bbox.y0

/** Garde les lignes lisibles les plus hautes (le titre), dans l'ordre de lecture. */
function pickTitle(blocks: Block[]): { title?: string; fullText: string } {
  const lines = blocks
    .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
    .map((line) => ({ line, text: cleanLine(line) }))
    .filter(({ text }) => (text.match(/\p{L}/gu)?.length ?? 0) >= 3)
  const fullText = lines.map(({ text }) => text).join('\n')
  if (lines.length === 0) return { fullText }

  // Le titre : la ligne la plus haute, plus ses voisines directes de taille comparable
  // (titre sur deux lignes). Une ligne éloignée, comme l'auteur en bas, n'en fait pas partie.
  const ordered = [...lines].sort((a, b) => a.line.bbox.y0 - b.line.bbox.y0)
  const start = ordered.reduce((best, item, index) => (lineHeight(item.line) > lineHeight(ordered[best].line) ? index : best), 0)
  const tallest = lineHeight(ordered[start].line)
  const belongs = (index: number, neighbour: number) => {
    const [a, b] = [ordered[Math.min(index, neighbour)].line, ordered[Math.max(index, neighbour)].line]
    return lineHeight(ordered[index].line) >= tallest * 0.45 && b.bbox.y0 - a.bbox.y1 <= tallest * 1.2
  }
  let [from, to] = [start, start]
  while (to - from < 2 && from > 0 && belongs(from - 1, from)) from--
  while (to - from < 2 && to < ordered.length - 1 && belongs(to + 1, to)) to++
  const title = ordered
    .slice(from, to + 1)
    .map(({ text }) => text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { title: title || undefined, fullText }
}

function cleanLine(line: Line): string {
  return line.words
    .filter((word) => word.confidence >= 55)
    .map((word) => word.text.replace(/[^\p{L}\p{N}'’\-:!?&]/gu, ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Lit le texte d'une photo de couverture. Le titre est en général le texte le plus grand :
 * on garde les lignes lisibles les plus hautes. Le texte complet sert à repérer le tome.
 */
export async function readCoverText(
  photo: Blob | string,
  onProgress?: (progress: number) => void,
): Promise<{ title?: string; fullText: string }> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const base = new URL('ocr/', document.baseURI).href
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: base + 'worker.min.js',
    corePath: base,
    langPath: base,
    logger: (message) => message.status === 'recognizing text' && onProgress?.(message.progress),
  })
  try {
    // Mise en page automatique d'abord : sur de vraies photos, le mode « texte épars » coupe
    // les mots du titre en lettres isolées. Il ne sert que de second essai.
    let result: { title?: string; fullText: string } = { fullText: '' }
    for (const mode of [PSM.AUTO, PSM.SPARSE_TEXT]) {
      await worker.setParameters({ tessedit_pageseg_mode: mode })
      const { data } = await worker.recognize(photo, {}, { blocks: true })
      result = pickTitle(data.blocks ?? [])
      if (result.title) break
    }
    return result
  } finally {
    await worker.terminate()
  }
}
