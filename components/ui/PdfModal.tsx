'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PdfModalProps {
  url: string    // URL of the file (/api/ressources/ID)
  title: string
  onClose: () => void
  kind?: 'pdf' | 'image'   // 'image' : partition au format photo (jpeg/png…)
}

export function PdfModal({ url, title, onClose, kind = 'pdf' }: PdfModalProps) {
  const isImage = kind === 'image'
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [pageInput, setPageInput] = useState('1')
  const [editingPage, setEditingPage] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Zoom mémorisé par utilisateur connecté ET par fichier (chaque partition garde son
  // propre zoom). Stocké localement, propre à chaque compte sur l'appareil.
  const { data: session } = useSession()
  const zoomKey = `solaupiano-pdf-zoom-${session?.user?.id ?? 'anon'}-${url}`

  // Charge le zoom sauvegardé dès que la clé utilisateur est connue.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = parseFloat(window.localStorage.getItem(zoomKey) || '')
    if (!Number.isNaN(saved) && saved >= 0.5 && saved <= 3) setScale(saved)
  }, [zoomKey])

  // Change le zoom ET le mémorise (uniquement sur action de l'utilisateur).
  const applyZoom = useCallback((updater: number | ((s: number) => number)) => {
    setScale((s) => {
      const next = typeof updater === 'function' ? updater(s) : updater
      if (typeof window !== 'undefined') window.localStorage.setItem(zoomKey, String(next))
      return next
    })
  }, [zoomKey])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingPage) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage((p) => Math.min(p + 1, numPages))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrentPage((p) => Math.max(p - 1, 1))
      if (e.key === '+' || e.key === '=') applyZoom((s) => Math.min(s + 0.2, 3))
      if (e.key === '-') applyZoom((s) => Math.max(s - 0.2, 0.5))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, numPages, editingPage, applyZoom])

  // Sync page input with current page
  useEffect(() => { setPageInput(String(currentPage)) }, [currentPage])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setCurrentPage(1)
  }, [])

  const goTo = (page: number) => {
    const p = Math.max(1, Math.min(page, numPages))
    setCurrentPage(p)
    setPageInput(String(p))
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(pageInput, 10)
    if (!isNaN(n)) goTo(n)
    setEditingPage(false)
  }

  // Plein écran CSS (et non l'API Fullscreen native) : la fenêtre s'étend bord à bord
  // dans la page, ce qui laisse le lecteur audio flottant TOUJOURS au premier plan.
  const toggleFullscreen = () => setIsFullscreen((v) => !v)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={`relative flex flex-col bg-gray-900 shadow-2xl overflow-hidden ${isFullscreen ? 'fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none' : 'w-full max-w-3xl max-h-[95vh] rounded-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <p className="text-sm font-medium text-white truncate pr-4 flex-1">{title}</p>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Zoom */}
            <button
              onClick={() => applyZoom((s) => Math.max(s - 0.2, 0.5))}
              title="Zoom −"
              className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white text-sm font-bold transition-colors"
            >−</button>
            <span className="text-xs text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => applyZoom((s) => Math.min(s + 0.2, 3))}
              title="Zoom +"
              className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white text-sm font-bold transition-colors"
            >+</button>

            {/* Fit width */}
            <button
              onClick={() => applyZoom(1.2)}
              title="Taille normale"
              className="ml-1 w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6-0l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6 0l5 5m0 0v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Fermer (Échap)"
              className="ml-1 w-7 h-7 rounded-md bg-gray-700 hover:bg-red-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!isImage && numPages > 1 && (
          <>
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Page précédente"
              aria-label="Page précédente"
              className="absolute left-3 sm:left-5 top-1/2 z-20 flex h-14 w-14 sm:h-16 sm:w-16 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl ring-4 ring-white/15 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-25"
            >
              <svg className="h-9 w-9 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              title="Page suivante"
              aria-label="Page suivante"
              className="absolute right-3 sm:right-5 top-1/2 z-20 flex h-14 w-14 sm:h-16 sm:w-16 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl ring-4 ring-white/15 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-25"
            >
              <svg className="h-9 w-9 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto flex justify-center bg-gray-800 p-4 min-h-0">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={title}
              style={{ width: `${Math.round((scale / 1.2) * 100)}%`, height: 'auto', maxWidth: 'none' }}
              className="self-start object-contain shadow-2xl"
            />
          ) : (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Chargement de la partition...</p>
                  </div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-48 text-red-400">
                  <div className="text-center">
                    <p className="text-2xl mb-2">⚠️</p>
                    <p className="text-sm">Impossible de charger le PDF.</p>
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                className="shadow-2xl"
              />
            </Document>
          )}
        </div>

        {/* Bottom navigation bar */}
        {!isImage && numPages > 0 && (
          <div className="flex items-center justify-center gap-4 sm:gap-8 px-4 py-2.5 bg-gray-800 border-t border-gray-700 flex-shrink-0">
            {/* Prev */}
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-2 rounded-xl bg-gray-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Précédente
            </button>

            {/* Page indicator / input */}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              {editingPage ? (
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageInput}
                    autoFocus
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputSubmit}
                    className="w-12 text-center rounded bg-gray-700 border border-indigo-500 text-white text-sm px-1 py-0.5 outline-none"
                  />
                  <span className="text-gray-500">/ {numPages}</span>
                </form>
              ) : (
                <button
                  onClick={() => setEditingPage(true)}
                  className="hover:text-white transition-colors"
                  title="Cliquer pour aller à une page"
                >
                  <span className="font-semibold text-white">{currentPage}</span>
                  <span className="text-gray-500"> / {numPages}</span>
                </button>
              )}
              <span className="text-xs text-gray-500">
                {numPages > 1 ? `· ← → pour naviguer` : ''}
              </span>
            </div>

            {/* Next */}
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="flex items-center gap-2 rounded-xl bg-gray-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Suivante
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
