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

// Construit un Blob PDF à partir d'une liste d'images (fichiers).
export async function imagesToPdfBlob(files: File[], mode: 'image' | 'a4' = 'image'): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const imgs: PdfImage[] = []
  for (const f of files) imgs.push(await fileToPdfImage(f))
  if (imgs.length === 0) throw new Error('Aucune image.')

  const ori = (w: number, h: number) => (w > h ? 'l' : 'p') as 'l' | 'p'
  const doc = new jsPDF({
    unit: 'pt',
    format: mode === 'a4' ? 'a4' : [imgs[0].w, imgs[0].h],
    orientation: ori(imgs[0].w, imgs[0].h),
  })
  imgs.forEach((it, i) => {
    if (i > 0) doc.addPage(mode === 'a4' ? 'a4' : [it.w, it.h], ori(it.w, it.h))
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
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
