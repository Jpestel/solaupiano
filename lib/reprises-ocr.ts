'use client'

import { extraireInfos, type Detection, type LigneOcr } from './reprises-detection'

const LARGEUR_MAX = 1600

/** Dessine la partition (photo redressée selon son orientation, ou 1re page d'un PDF) dans un canvas de taille raisonnable. */
async function versCanvas(file: File): Promise<HTMLCanvasElement> {
  let source: CanvasImageSource, w: number, h: number
  if (file.type === 'application/pdf') {
    const { pdfjs } = await import('react-pdf')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: LARGEUR_MAX / base.width })
    const c = document.createElement('canvas')
    c.width = Math.round(vp.width); c.height = Math.round(vp.height)
    await page.render({ canvasContext: c.getContext('2d')!, viewport: vp, canvas: c }).promise
    return c
  }
  let bmp: ImageBitmap | HTMLImageElement
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Repli : décodage par une balise image (certains navigateurs refusent createImageBitmap avec options).
    const url = URL.createObjectURL(file)
    try {
      bmp = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible par le navigateur (format non pris en charge ?)')); i.src = url })
    } finally { URL.revokeObjectURL(url) }
  }
  source = bmp
  w = 'naturalWidth' in bmp ? bmp.naturalWidth : bmp.width
  h = 'naturalHeight' in bmp ? bmp.naturalHeight : bmp.height
  const k = Math.min(1, LARGEUR_MAX / w)
  const c = document.createElement('canvas')
  c.width = Math.round(w * k); c.height = Math.round(h * k)
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height)
  if ('close' in bmp) bmp.close()
  return c
}

/** Extrait une bande horizontale de l'image (plus fiable que l'option « rectangle » de l'outil de lecture). */
function decouper(src: HTMLCanvasElement, top: number, height: number, echelle: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(src.width * echelle)); c.height = Math.max(1, Math.round(height * echelle))
  c.getContext('2d')!.drawImage(src, 0, top, src.width, height, 0, 0, c.width, c.height)
  return c
}

const lignesDe = (data: { blocks?: { paragraphs: { lines: { text: string; bbox: { y0: number; y1: number }; confidence: number }[] }[] }[] | null }): LigneOcr[] => {
  const out: LigneOcr[] = []
  for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) out.push({ text: l.text, y0: l.bbox.y0, y1: l.bbox.y1, confidence: l.confidence })
  return out
}

/**
 * Lit le titre (et si possible l'interprète et le compositeur) d'une partition.
 * Tout se passe dans le navigateur : l'image n'est envoyée nulle part. Seuls les
 * fichiers du moteur de lecture sont téléchargés (une fois, puis gardés en cache).
 * On ne lit que le haut de la page (titre, interprète) et le bas (« Written by »),
 * ce qui est bien plus rapide que la page entière.
 */
export async function detecterInfos(file: File, onEtat?: (t: string) => void): Promise<Detection | null> {
  onEtat?.('Préparation de l’image…')
  const canvas = await versCanvas(file)
  onEtat?.('Chargement du moteur de lecture…')
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng+fra')
  try {
    onEtat?.('Lecture du titre…')
    const H = canvas.height
    const hautH = Math.round(H * 0.3)
    // Deux lectures de la bande du haut : à taille normale (petits caractères : interprète, année)
    // et réduite de moitié (très grands titres, que le moteur ne lit pas à taille normale).
    const lignesHaut: LigneOcr[] = []
    for (const k of [1, 0.5]) {
      const bande = decouper(canvas, 0, hautH, k)
      const r = await worker.recognize(bande, {}, { blocks: true })
      for (const l of lignesDe(r.data)) lignesHaut.push({ ...l, y0: l.y0 / k, y1: l.y1 / k })
    }
    const yBas = Math.round(H * 0.88)
    const bas = await worker.recognize(decouper(canvas, yBas, H - yBas, 1), {}, { blocks: true })
    return extraireInfos(lignesHaut, lignesDe(bas.data))
  } finally {
    await worker.terminate()
  }
}
