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

interface PdfBookmark {
  id: number
  page: number
  xPct: number
  yPct: number
  label: string
  targetBookmarkId?: number | null
}

export function PdfModal({ url, title, onClose, kind = 'pdf' }: PdfModalProps) {
  const isImage = kind === 'image'
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [pageInput, setPageInput] = useState('1')
  const [editingPage, setEditingPage] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(true)
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([])
  const [placingBookmark, setPlacingBookmark] = useState(false)
  const [jumpTarget, setJumpTarget] = useState<PdfBookmark | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const resourceId = /^\/api\/ressources\/(\d+)/.exec(url)?.[1] || null

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

  useEffect(() => {
    if (!resourceId) return
    fetch(`/api/ressources/${resourceId}/bookmarks`)
      .then((res) => (res.ok ? res.json() : { bookmarks: [] }))
      .then((data) => setBookmarks(data.bookmarks || []))
      .catch(() => setBookmarks([]))
  }, [resourceId])

  useEffect(() => {
    if (!jumpTarget || jumpTarget.page !== currentPage) return
    const content = contentRef.current
    const pageEl = pageRef.current
    if (!content || !pageEl) return

    const timer = window.setTimeout(() => {
      const left = pageEl.offsetLeft + pageEl.offsetWidth * jumpTarget.xPct - content.clientWidth / 2
      const top = pageEl.offsetTop + pageEl.offsetHeight * jumpTarget.yPct - content.clientHeight / 2
      content.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth' })
      setJumpTarget(null)
    }, 80)

    return () => window.clearTimeout(timer)
  }, [currentPage, scale, jumpTarget])

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

  const goToBookmark = (bookmark: PdfBookmark) => {
    setJumpTarget(bookmark)
    goTo(bookmark.page)
  }

  const getBookmarkTarget = (bookmark: PdfBookmark) => {
    if (!bookmark.targetBookmarkId) return null
    return bookmarks.find((item) => item.id === bookmark.targetBookmarkId) || null
  }

  const followBookmark = (bookmark: PdfBookmark) => {
    goToBookmark(getBookmarkTarget(bookmark) || bookmark)
  }

  const updateBookmarkTarget = async (bookmark: PdfBookmark) => {
    if (!resourceId) return
    const candidates = bookmarks.filter((item) => item.id !== bookmark.id)
    if (candidates.length === 0) {
      window.alert("Créez d'abord un deuxième repère pour pouvoir faire un lien.")
      return
    }

    const currentTarget = getBookmarkTarget(bookmark)
    const choices = candidates
      .map((item, index) => `${index + 1}. ${item.label || 'Repère'} · page ${item.page}`)
      .join('\n')
    const answer = window.prompt(
      `Vers quel repère doit aller "${bookmark.label || 'Repère'}" ?\n\n${choices}\n\nTapez le numéro du repère, ou 0 pour retirer le lien.`,
      currentTarget ? String(candidates.findIndex((item) => item.id === currentTarget.id) + 1) : ''
    )
    if (answer === null) return

    const choice = Number(answer.trim())
    if (choice === 0) {
      await saveBookmarkTarget(bookmark.id, null)
      return
    }
    if (!Number.isInteger(choice) || choice < 1 || choice > candidates.length) {
      window.alert('Choix invalide.')
      return
    }
    await saveBookmarkTarget(bookmark.id, candidates[choice - 1].id)
  }

  const saveBookmarkTarget = async (bookmarkId: number, targetBookmarkId: number | null) => {
    if (!resourceId) return
    const res = await fetch(`/api/ressources/${resourceId}/bookmarks/${bookmarkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetBookmarkId }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBookmarks((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || "Impossible d'enregistrer le lien de repère.")
    }
  }

  const createBookmark = async (xPct: number, yPct: number) => {
    if (!resourceId) return
    const label = window.prompt('Nom du repère PDF', `Page ${currentPage}`)
    if (label === null) return

    const res = await fetch(`/api/ressources/${resourceId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: currentPage, xPct, yPct, label }),
    })
    if (res.ok) {
      const bookmark = await res.json()
      setBookmarks((items) => [...items, bookmark].sort((a, b) => a.page - b.page || a.yPct - b.yPct || a.xPct - b.xPct))
      setPlacingBookmark(false)
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || "Impossible d'enregistrer ce repère.")
    }
  }

  const deleteBookmark = async (id: number) => {
    if (!resourceId) return
    const res = await fetch(`/api/ressources/${resourceId}/bookmarks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBookmarks((items) => items
        .filter((item) => item.id !== id)
        .map((item) => item.targetBookmarkId === id ? { ...item, targetBookmarkId: null } : item)
      )
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || 'Impossible de supprimer ce repère.')
    }
  }

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingBookmark || !resourceId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return
    createBookmark(xPct, yPct)
  }

  const handleBookmarkPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placingBookmark || !resourceId) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return
    createBookmark(xPct, yPct)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={`relative flex flex-col bg-gray-900 shadow-2xl overflow-hidden ${isFullscreen ? 'fixed inset-0 max-w-none max-h-none rounded-none' : 'h-[95dvh] w-[min(96dvw,980px)] rounded-2xl'}`}
        style={isFullscreen ? { width: '100dvw', height: '100dvh' } : undefined}
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

            {resourceId && (
              <button
                onClick={() => setPlacingBookmark((value) => !value)}
                title={placingBookmark ? 'Annuler le placement du repère' : 'Placer un repère PDF'}
                className={`ml-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${placingBookmark ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white'}`}
              >
                {placingBookmark ? 'Cliquez sur le PDF' : 'Repère'}
              </button>
            )}

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

        {resourceId && (bookmarks.length > 0 || placingBookmark) && (
          <div
            className="flex flex-wrap items-center gap-2 border-b border-gray-700 bg-gray-850 px-4 py-2 text-xs text-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold text-emerald-300">Repères PDF</span>
            {placingBookmark && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-200">
                Cliquez sur la partition pour placer le bouton
              </span>
            )}
            {bookmarks.map((bookmark) => (
              <span key={bookmark.id} className="inline-flex overflow-hidden rounded-full border border-emerald-500/35 bg-gray-800">
                <button
                  onClick={() => goToBookmark(bookmark)}
                  className="px-3 py-1.5 font-semibold text-emerald-100 hover:bg-emerald-500 hover:text-white"
                  title={`Aller page ${bookmark.page}`}
                >
                  {bookmark.label || 'Repère'} · p.{bookmark.page}
                </button>
                <button
                  onClick={() => updateBookmarkTarget(bookmark)}
                  className={`border-l border-emerald-500/25 px-2.5 font-semibold hover:bg-emerald-500 hover:text-white ${bookmark.targetBookmarkId ? 'text-emerald-200' : 'text-gray-400'}`}
                  title={bookmark.targetBookmarkId ? `Lien vers ${getBookmarkTarget(bookmark)?.label || 'un repère'}` : 'Créer un lien vers un autre repère'}
                  aria-label="Choisir la destination de ce repère"
                >
                  ↪
                </button>
                <button
                  onClick={() => deleteBookmark(bookmark.id)}
                  className="border-l border-emerald-500/25 px-2 text-gray-400 hover:bg-red-600 hover:text-white"
                  title="Supprimer ce repère"
                  aria-label="Supprimer ce repère"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {!isImage && numPages > 1 && (
          <>
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Page précédente"
              aria-label="Page précédente"
              className="absolute left-2 sm:left-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl ring-4 ring-white/15 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-25"
            >
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              title="Page suivante"
              aria-label="Page suivante"
              className="absolute right-2 sm:right-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl ring-4 ring-white/15 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-25"
            >
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-auto flex justify-start bg-gray-800 px-20 py-4 sm:px-24 min-h-0">
          {isImage ? (
            <div
              ref={pageRef}
              className={`relative mx-auto self-start ${placingBookmark ? 'cursor-crosshair' : ''}`}
              onClick={handlePageClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={title}
                style={{ width: `${Math.round((scale / 1.2) * 100)}%`, height: 'auto', maxWidth: 'none' }}
                className="block object-contain shadow-2xl"
              />
              {bookmarks.filter((bookmark) => bookmark.page === 1).map((bookmark) => (
                <button
                  key={bookmark.id}
                  onClick={(e) => { e.stopPropagation(); followBookmark(bookmark) }}
                  title={bookmark.targetBookmarkId ? `${bookmark.label} → ${getBookmarkTarget(bookmark)?.label || 'repère lié'}` : bookmark.label}
                  style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                  className="absolute z-10 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 px-2 text-sm font-black text-white shadow-lg ring-4 ring-white/30 hover:bg-emerald-400"
                >
                  {bookmark.targetBookmarkId ? '↪' : '•'}
                </button>
              ))}
              {placingBookmark && (
                <div
                  className="absolute inset-0 z-30 touch-none cursor-crosshair bg-emerald-400/10 ring-4 ring-inset ring-emerald-400/60"
                  onPointerUp={handleBookmarkPointer}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  aria-label="Zone de placement du repère"
                />
              )}
            </div>
          ) : (
            <div
              ref={pageRef}
              className={`relative mx-auto self-start ${placingBookmark ? 'cursor-crosshair' : ''}`}
              onClick={handlePageClick}
            >
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex h-48 items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <p className="text-sm">Chargement de la partition...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex h-48 items-center justify-center text-red-400">
                    <div className="text-center">
                      <p className="mb-2 text-2xl">⚠️</p>
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
              {bookmarks.filter((bookmark) => bookmark.page === currentPage).map((bookmark) => (
                <button
                  key={bookmark.id}
                  onClick={(e) => { e.stopPropagation(); followBookmark(bookmark) }}
                  title={bookmark.targetBookmarkId ? `${bookmark.label} → ${getBookmarkTarget(bookmark)?.label || 'repère lié'}` : bookmark.label}
                  style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                  className="absolute z-10 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 px-2 text-sm font-black text-white shadow-lg ring-4 ring-white/30 hover:bg-emerald-400"
                >
                  {bookmark.targetBookmarkId ? '↪' : '•'}
                </button>
              ))}
              {placingBookmark && (
                <div
                  className="absolute inset-0 z-30 touch-none cursor-crosshair bg-emerald-400/10 ring-4 ring-inset ring-emerald-400/60"
                  onPointerUp={handleBookmarkPointer}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  aria-label="Zone de placement du repère"
                />
              )}
            </div>
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
