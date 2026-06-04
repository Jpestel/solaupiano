// Conversion d'images en PDF, 100% côté navigateur. Partagé par l'outil
// autonome et l'upload de ressources d'un morceau.

const MAX_DIM = 2400

export interface PdfImage { dataUrl: string; w: number; h: number }

function isTiff(file: File) {
  return /tiff?$/i.test(file.name) || file.type === 'image/tiff'
}

function drawToJpeg(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, srcW: number, srcH: number): PdfImage {
  let w = srcW, h = srcH
  const m = Math.max(w, h)
  if (m > MAX_DIM) { const r = MAX_DIM / m; w = Math.round(w * r); h = Math.round(h * r) }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  draw(ctx, w, h)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), w, h }
}

export async function fileToPdfImage(file: File): Promise<PdfImage> {
  if (isTiff(file)) {
    const UTIF = (await import('utif')).default
    const buf = await file.arrayBuffer()
    const ifds = UTIF.decode(buf)
    UTIF.decodeImage(buf, ifds[0])
    const rgba = UTIF.toRGBA8(ifds[0])
    const w = ifds[0].width as number
    const h = ifds[0].height as number
    const tmp = document.createElement('canvas')
    tmp.width = w; tmp.height = h
    tmp.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0)
    return drawToJpeg((ctx, cw, ch) => ctx.drawImage(tmp, 0, 0, cw, ch), w, h)
  }
  const bitmap = await createImageBitmap(file)
  const img = drawToJpeg((ctx, cw, ch) => ctx.drawImage(bitmap, 0, 0, cw, ch), bitmap.width, bitmap.height)
  bitmap.close()
  return img
}

// Dimensions A4 en points (1 pt = 1/72 inch)
const A4_W = 595.28
const A4_H = 841.89

// Taille de page (pt) qui conserve le ratio de l'image en la bornant à l'A4.
function pageDims(w: number, h: number): [number, number] {
  const landscape = w > h
  const boundW = landscape ? A4_H : A4_W
  const boundH = landscape ? A4_W : A4_H
  const r = Math.min(boundW / w, boundH / h)
  return [Math.round(w * r), Math.round(h * r)]
}

// À partir d'images déjà décodées ({ dataUrl, w, h }).
//  - mode 'image' : chaque page épouse le ratio de l'image, dimensionnée à l'A4 (taille « document » normale)
//  - mode 'a4'    : page A4 fixe, image centrée avec marges
export async function imagesToPdfBlobFromDecoded(imgs: PdfImage[], mode: 'image' | 'a4' = 'image'): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  if (imgs.length === 0) throw new Error('Aucune image.')

  const first = mode === 'a4' ? ([A4_W, A4_H] as [number, number]) : pageDims(imgs[0].w, imgs[0].h)
  const doc = new jsPDF({ unit: 'pt', format: first, orientation: 'p' })

  imgs.forEach((it, i) => {
    const [pw, ph] = mode === 'a4' ? [A4_W, A4_H] : pageDims(it.w, it.h)
    if (i > 0) doc.addPage([pw, ph], 'p')
    if (mode === 'image') {
      doc.addImage(it.dataUrl, 'JPEG', 0, 0, pw, ph)
    } else {
      const margin = 24
      const ratio = Math.min((pw - 2 * margin) / it.w, (ph - 2 * margin) / it.h)
      const w = it.w * ratio, h = it.h * ratio
      doc.addImage(it.dataUrl, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h)
    }
  })
  return doc.output('blob')
}

// Construit un Blob PDF à partir de fichiers (décodage inclus).
export async function imagesToPdfBlob(files: File[], mode: 'image' | 'a4' = 'image'): Promise<Blob> {
  const imgs: PdfImage[] = []
  for (const f of files) imgs.push(await fileToPdfImage(f))
  return imagesToPdfBlobFromDecoded(imgs, mode)
}
