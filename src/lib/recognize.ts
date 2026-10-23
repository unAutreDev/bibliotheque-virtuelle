import type { Line } from 'tesseract.js'
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

function cleanLine(line: Line): string {
  return line.words
    .filter((word) => word.confidence >= 55)
    .map((word) => word.text.replace(/[^\p{L}\p{N}'’\-:!?&]/gu, ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Lit le titre sur une photo de couverture. Sur une couverture, le titre est en général
 * le texte le plus grand : on garde les lignes lisibles les plus hautes.
 */
export async function readCoverTitle(photo: Blob | string, onProgress?: (progress: number) => void): Promise<string | undefined> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const base = new URL('ocr/', document.baseURI).href
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: base + 'worker.min.js',
    corePath: base,
    langPath: base,
    logger: (message) => message.status === 'recognizing text' && onProgress?.(message.progress),
  })
  try {
    // Texte épars : les couvertures mélangent titre, auteur et éditeur un peu partout.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    const { data } = await worker.recognize(photo, {}, { blocks: true })
    const lines = (data.blocks ?? [])
      .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
      .map((line) => ({ line, text: cleanLine(line) }))
      .filter(({ text }) => (text.match(/\p{L}/gu)?.length ?? 0) >= 3)
    if (lines.length === 0) return undefined

    const tallest = Math.max(...lines.map(({ line }) => lineHeight(line)))
    const title = lines
      .filter(({ line }) => lineHeight(line) >= tallest * 0.45)
      .sort((a, b) => a.line.bbox.y0 - b.line.bbox.y0)
      .slice(0, 3)
      .map(({ text }) => text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return title || undefined
  } finally {
    await worker.terminate()
  }
}
