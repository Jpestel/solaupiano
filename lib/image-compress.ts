// Compression d'image côté navigateur pour la Galerie.
// Objectif : produire un JPEG < ~500 Ko en conservant la meilleure qualité possible
// (on réduit d'abord la qualité, puis les dimensions seulement si nécessaire).

export interface CompressResult {
  blob: Blob
  width: number
  height: number
  name: string
}

const TARGET_BYTES = 480 * 1024 // marge sous 500 Ko
const MAX_DIM_START = 2560 // bord le plus long (px) — large, qualité préservée
const MIN_DIM = 1024
const MIN_QUALITY = 0.5

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap gère l'orientation EXIF si demandé
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      /* fallback ci-dessous */
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function drawScaled(src: ImageBitmap | HTMLImageElement, maxDim: number) {
  const sw = (src as ImageBitmap).width || (src as HTMLImageElement).naturalWidth
  const sh = (src as ImageBitmap).height || (src as HTMLImageElement).naturalHeight
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h)
  return { canvas, w, h }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob a échoué'))), 'image/jpeg', quality)
  })
}

const baseName = (n: string) => n.replace(/\.[^.]+$/, '') || 'photo'

/**
 * Compresse une image en JPEG < ~500 Ko.
 * Si le fichier est déjà petit et déjà un JPEG, on le renvoie tel quel (zéro perte).
 */
export async function compressImage(file: File): Promise<CompressResult> {
  // Déjà sous la cible et déjà JPEG → on n'y touche pas (qualité d'origine)
  if (file.size <= TARGET_BYTES && /image\/jpe?g/i.test(file.type)) {
    return { blob: file, width: 0, height: 0, name: file.name }
  }

  const src = await decode(file)

  let maxDim = MAX_DIM_START
  let best: { blob: Blob; w: number; h: number } | null = null

  while (maxDim >= MIN_DIM) {
    const { canvas, w, h } = drawScaled(src, maxDim)
    let quality = 0.92
    while (quality >= MIN_QUALITY) {
      const blob = await toBlob(canvas, quality)
      if (!best || blob.size < best.blob.size) best = { blob, w, h }
      if (blob.size <= TARGET_BYTES) {
        if ('close' in src) (src as ImageBitmap).close()
        return { blob, width: w, height: h, name: `${baseName(file.name)}.jpg` }
      }
      quality -= 0.08
    }
    maxDim = Math.round(maxDim * 0.8) // réduit les dimensions et on retente
  }

  if ('close' in src) (src as ImageBitmap).close()
  // On n'a pas pu descendre sous la cible : on renvoie la plus petite obtenue
  const fallback = best || { blob: file, w: 0, h: 0 }
  return { blob: fallback.blob, width: fallback.w, height: fallback.h, name: `${baseName(file.name)}.jpg` }
}
