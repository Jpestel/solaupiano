'use client'

import { useState, useRef } from 'react'

interface Item {
  id: string
  name: string
  dataUrl: string // JPEG dataURL (aperçu + source PDF)
  w: number
  h: number
}

const MAX_DIM = 2400 // bornage pour limiter le poids du PDF
const uid = () => Math.random().toString(36).slice(2)

function isTiff(file: File) {
  return /tiff?$/i.test(file.name) || file.type === 'image/tiff'
}

// Dessine sur un canvas (fond blanc), borne la taille, renvoie un JPEG dataURL
function canvasToItem(name: string, draw: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void, srcW: number, srcH: number): Item {
  let w = srcW, h = srcH
  const m = Math.max(w, h)
  if (m > MAX_DIM) { const r = MAX_DIM / m; w = Math.round(w * r); h = Math.round(h * r) }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  draw(ctx, w, h)
  return { id: uid(), name, dataUrl: canvas.toDataURL('image/jpeg', 0.92), w, h }
}

async function fileToItem(file: File): Promise<Item> {
  if (isTiff(file)) {
    const UTIF = (await import('utif')).default
    const buf = await file.arrayBuffer()
    const ifds = UTIF.decode(buf)
    UTIF.decodeImage(buf, ifds[0])
    const rgba = UTIF.toRGBA8(ifds[0])
    const w = ifds[0].width as number
    const h = ifds[0].height as number
    // dessine d'abord en taille réelle dans un canvas tampon
    const tmp = document.createElement('canvas')
    tmp.width = w; tmp.height = h
    tmp.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0)
    return canvasToItem(file.name, (ctx, cw, ch) => ctx.drawImage(tmp, 0, 0, cw, ch), w, h)
  }
  // Autres formats : décodage natif du navigateur (JPG/PNG/GIF/WEBP/BMP…)
  const bitmap = await createImageBitmap(file)
  const item = canvasToItem(file.name, (ctx, cw, ch) => ctx.drawImage(bitmap, 0, 0, cw, ch), bitmap.width, bitmap.height)
  bitmap.close()
  return item
}

export default function ImagesToPdfPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'image' | 'a4'>('image')
  const [filename, setFilename] = useState('document')
  const fileRef = useRef<HTMLInputElement>(null)

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true); setError('')
    const added: Item[] = []
    for (const file of Array.from(files)) {
      try {
        added.push(await fileToItem(file))
      } catch {
        setError((e) => (e ? e + ' ' : '') + `« ${file.name} » illisible.`)
      }
    }
    setItems((prev) => [...prev, ...added])
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const arr = [...items]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setItems(arr)
  }
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))
  const clearAll = () => setItems([])

  const buildPdf = async () => {
    if (items.length === 0) return
    const { jsPDF } = await import('jspdf')
    const ori = (w: number, h: number) => (w > h ? 'l' : 'p') as 'l' | 'p'
    const doc = new jsPDF({
      unit: 'pt',
      format: mode === 'a4' ? 'a4' : [items[0].w, items[0].h],
      orientation: ori(items[0].w, items[0].h),
    })
    items.forEach((it, i) => {
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
    doc.save(`${(filename || 'document').replace(/\.pdf$/i, '')}.pdf`)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🖼️ Images → PDF</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Réunissez vos photos (JPG, JPEG, PNG, BMP, TIFF, WEBP, GIF…) dans un seul PDF.
          La conversion se fait <strong>localement dans votre navigateur</strong> : vos images ne sont pas envoyées sur un serveur.
        </p>
      </div>

      {/* Zone d'ajout */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
        className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center"
      >
        <p className="text-3xl mb-2">📤</p>
        <p className="text-sm text-gray-600">Glissez vos images ici, ou</p>
        <button onClick={() => fileRef.current?.click()} className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Choisir des images
        </button>
        <input ref={fileRef} type="file" accept="image/*,.tif,.tiff,.bmp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {loading && <p className="mt-3 text-sm text-amber-600">⏳ Lecture des images…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {items.length > 0 && (
        <>
          {/* Réglages + actions */}
          <div className="mt-5 flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mise en page</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as 'image' | 'a4')} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="image">Une image par page (taille de l&apos;image)</option>
                  <option value="a4">Page A4 (image centrée)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom du fichier</label>
                <div className="flex items-center">
                  <input value={filename} onChange={(e) => setFilename(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-40" />
                  <span className="ml-1 text-sm text-gray-400">.pdf</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-1.5">Tout effacer</button>
              <button onClick={buildPdf} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                📄 Télécharger le PDF ({items.length})
              </button>
            </div>
          </div>

          {/* Grille des images */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((it, i) => (
              <div key={it.id} className="relative rounded-xl border border-gray-200 bg-white overflow-hidden group">
                <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <button onClick={() => remove(it.id)} className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.dataUrl} alt={it.name} className="w-full h-28 object-contain bg-gray-50" />
                <div className="flex items-center justify-between px-1.5 py-1 border-t border-gray-100">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 text-sm">◀</button>
                  <span className="text-[10px] text-gray-400 truncate px-1">{it.name}</span>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 text-sm">▶</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
