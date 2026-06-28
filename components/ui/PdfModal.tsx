'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const NOTE_SUGGESTIONS = [
  'Intro',
  'Intro guitare seule',
  'Intro piano seul',
  'Couplet',
  'Refrain',
  'Pont',
  'Solo',
  'Break',
  'Entrée chant',
  'Entrée saxo',
  'Fin',
]

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
  kind?: 'BOOKMARK' | 'NOTE'
  color?: string
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
  const [placingMode, setPlacingMode] = useState<'bookmark' | 'note' | null>(null)
  const [jumpTarget, setJumpTarget] = useState<PdfBookmark | null>(null)
  const [noteEditor, setNoteEditor] = useState<{ id?: number; page: number; xPct?: number; yPct?: number } | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const draggingBookmarkRef = useRef<{ id: number; startX: number; startY: number; moved: boolean } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const resourceId = /^\/api\/ressources\/(\d+)/.exec(url)?.[1] || null
  const placingBookmark = placingMode === 'bookmark'
  const placingNote = placingMode === 'note'
  const pdfBookmarks = bookmarks.filter((item) => item.kind !== 'NOTE')
  const pdfNotes = bookmarks.filter((item) => item.kind === 'NOTE')

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

  const getBookmarkNumber = (bookmark: PdfBookmark) => pdfBookmarks.findIndex((item) => item.id === bookmark.id) + 1

  const getBookmarkTarget = (bookmark: PdfBookmark) => {
    if (!bookmark.targetBookmarkId) return null
    return pdfBookmarks.find((item) => item.id === bookmark.targetBookmarkId) || null
  }

  const followBookmark = (bookmark: PdfBookmark) => {
    goToBookmark(getBookmarkTarget(bookmark) || bookmark)
  }

  const updateBookmarkTarget = async (bookmark: PdfBookmark) => {
    if (!resourceId) return
    const candidates = pdfBookmarks.filter((item) => item.id !== bookmark.id)
    if (candidates.length === 0) {
      window.alert("Créez d'abord un deuxième repère pour pouvoir faire un lien.")
      return
    }

    const currentTarget = getBookmarkTarget(bookmark)
    const choices = pdfBookmarks
      .filter((item) => item.id !== bookmark.id)
      .map((item) => `${getBookmarkNumber(item)}. ${item.label || 'Repère'} · page ${item.page}`)
      .join('\n')
    const answer = window.prompt(
      `Vers quel repère doit aller le repère ${getBookmarkNumber(bookmark)} "${bookmark.label || 'Repère'}" ?\n\n${choices}\n\nTapez le numéro du repère, ou 0 pour retirer le lien.`,
      currentTarget ? String(getBookmarkNumber(currentTarget)) : ''
    )
    if (answer === null) return

    const choice = Number(answer.trim())
    if (choice === 0) {
      await saveBookmarkTarget(bookmark.id, null)
      return
    }
    if (!Number.isInteger(choice) || choice < 1 || choice > pdfBookmarks.length) {
      window.alert('Choix invalide.')
      return
    }
    const target = pdfBookmarks[choice - 1]
    if (!target || target.id === bookmark.id) {
      window.alert('Choix invalide.')
      return
    }
    await saveBookmarkTarget(bookmark.id, target.id)
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
      setPlacingMode(null)
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || "Impossible d'enregistrer ce repère.")
    }
  }

  const saveNoteDraft = async () => {
    if (!resourceId || !noteEditor) return
    const text = noteDraft.trim()
    if (!text) return

    if (noteEditor.id) {
      const res = await fetch(`/api/ressources/${resourceId}/bookmarks/${noteEditor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: text }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBookmarks((items) => items.map((item) => (item.id === updated.id ? updated : item)))
        setNoteEditor(null)
        setNoteDraft('')
      } else {
        const data = await res.json().catch(() => null)
        window.alert(data?.error || 'Impossible de modifier cette note.')
      }
      return
    }

    await createNote(noteEditor.xPct ?? 0.5, noteEditor.yPct ?? 0.5, text, noteEditor.page)
    setNoteEditor(null)
    setNoteDraft('')
  }

  const createNote = async (xPct: number, yPct: number, label: string, page = currentPage) => {
    if (!resourceId) return
    const text = label.trim()
    if (!text) return

    const res = await fetch(`/api/ressources/${resourceId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, xPct, yPct, label: text, kind: 'NOTE' }),
    })
    if (res.ok) {
      const note = await res.json()
      setBookmarks((items) => [...items, note].sort((a, b) => a.page - b.page || a.yPct - b.yPct || a.xPct - b.xPct))
      setPlacingMode(null)
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || "Impossible d'enregistrer cette note.")
    }
  }

  const updateNoteLabel = async (note: PdfBookmark) => {
    setNoteDraft(note.label || '')
    setNoteEditor({ id: note.id, page: note.page })
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

  const saveBookmarkPosition = async (bookmarkId: number, page: number, xPct: number, yPct: number) => {
    if (!resourceId) return
    const res = await fetch(`/api/ressources/${resourceId}/bookmarks/${bookmarkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, xPct, yPct }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBookmarks((items) => items
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => a.page - b.page || a.yPct - b.yPct || a.xPct - b.xPct)
      )
    } else {
      const data = await res.json().catch(() => null)
      window.alert(data?.error || 'Impossible de déplacer ce repère.')
    }
  }

  const moveBookmarkLocally = (bookmarkId: number, xPct: number, yPct: number) => {
    setBookmarks((items) => items.map((item) => item.id === bookmarkId ? { ...item, xPct, yPct } : item))
  }

  const handlePlacedBookmarkPointerDown = (bookmark: PdfBookmark, e: React.PointerEvent<HTMLButtonElement>) => {
    if (placingMode) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingBookmarkRef.current = { id: bookmark.id, startX: e.clientX, startY: e.clientY, moved: false }
  }

  const handlePlacedBookmarkPointerMove = (bookmark: PdfBookmark, e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = draggingBookmarkRef.current
    const pageEl = pageRef.current
    if (!drag || drag.id !== bookmark.id || !pageEl) return
    e.preventDefault()
    e.stopPropagation()

    const dx = Math.abs(e.clientX - drag.startX)
    const dy = Math.abs(e.clientY - drag.startY)
    if (dx > 4 || dy > 4) drag.moved = true
    if (!drag.moved) return

    const rect = pageEl.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const yPct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    moveBookmarkLocally(bookmark.id, xPct, yPct)
  }

  const handlePlacedBookmarkPointerUp = async (bookmark: PdfBookmark, e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = draggingBookmarkRef.current
    const pageEl = pageRef.current
    if (!drag || drag.id !== bookmark.id) return
    e.preventDefault()
    e.stopPropagation()
    draggingBookmarkRef.current = null

    if (!drag.moved) {
      if (bookmark.kind === 'NOTE') updateNoteLabel(bookmark)
      else followBookmark(bookmark)
      return
    }
    if (!pageEl) return

    const rect = pageEl.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const yPct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    await saveBookmarkPosition(bookmark.id, isImage ? 1 : currentPage, xPct, yPct)
  }

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !resourceId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return
    if (placingMode === 'note') {
      setNoteDraft('')
      setNoteEditor({ page: isImage ? 1 : currentPage, xPct, yPct })
    } else {
      createBookmark(xPct, yPct)
    }
  }

  const handleBookmarkPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placingMode || !resourceId) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top) / rect.height
    if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return
    if (placingMode === 'note') {
      setNoteDraft('')
      setNoteEditor({ page: isImage ? 1 : currentPage, xPct, yPct })
    } else {
      createBookmark(xPct, yPct)
    }
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
              <>
                <button
                  onClick={() => setPlacingMode((value) => value === 'bookmark' ? null : 'bookmark')}
                  title={placingBookmark ? 'Annuler le placement du repère' : 'Placer un repère PDF'}
                  className={`ml-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${placingBookmark ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white'}`}
                >
                  {placingBookmark ? 'Cliquez' : 'Repère'}
                </button>
                <button
                  onClick={() => setPlacingMode((value) => value === 'note' ? null : 'note')}
                  title={placingNote ? 'Annuler le placement de la note' : 'Placer une note courte'}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${placingNote ? 'bg-amber-500 text-gray-950 hover:bg-amber-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white'}`}
                >
                  {placingNote ? 'Cliquez' : 'Note'}
                </button>
              </>
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

        {resourceId && (bookmarks.length > 0 || placingMode) && (
          <div
            className="flex flex-wrap items-center gap-2 border-b border-gray-700 bg-gray-850 px-4 py-2 text-xs text-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold text-emerald-300">Repères PDF</span>
            {placingMode && (
              <span className={`rounded-full px-2.5 py-1 font-medium ${placingNote ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                Cliquez sur la partition pour placer {placingNote ? 'la note' : 'le bouton'}
              </span>
            )}
            {pdfBookmarks.map((bookmark) => (
              <span key={bookmark.id} className="inline-flex overflow-hidden rounded-full border border-emerald-500/35 bg-gray-800">
                <button
                  onClick={() => goToBookmark(bookmark)}
                  className="px-3 py-1.5 font-semibold text-emerald-100 hover:bg-emerald-500 hover:text-white"
                  title={`Aller page ${bookmark.page}`}
                >
                  #{getBookmarkNumber(bookmark)} {bookmark.label || 'Repère'} · p.{bookmark.page}
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
            {pdfNotes.length > 0 && <span className="ml-1 font-semibold text-amber-200">Notes</span>}
            {pdfNotes.map((note) => (
              <span key={note.id} className="inline-flex overflow-hidden rounded-full border border-amber-400/40 bg-gray-800">
                <button
                  onClick={() => goToBookmark(note)}
                  className="px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-500 hover:text-gray-950"
                  title={`Aller page ${note.page}`}
                >
                  {note.label || 'Note'} · p.{note.page}
                </button>
                <button
                  onClick={() => updateNoteLabel(note)}
                  className="border-l border-amber-400/25 px-2 text-gray-400 hover:bg-amber-500 hover:text-gray-950"
                  title="Modifier cette note"
                  aria-label="Modifier cette note"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteBookmark(note.id)}
                  className="border-l border-amber-400/25 px-2 text-gray-400 hover:bg-red-600 hover:text-white"
                  title="Supprimer cette note"
                  aria-label="Supprimer cette note"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {noteEditor && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-gray-950/55 px-4"
            onClick={() => { setNoteEditor(null); setNoteDraft(''); setPlacingMode(null) }}
          >
            <form
              className="w-full max-w-lg rounded-xl border border-amber-300/40 bg-gray-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); saveNoteDraft() }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{noteEditor.id ? 'Modifier la note' : 'Ajouter une note'}</h3>
                  <p className="text-sm text-gray-400">Saisissez un court texte ou choisissez une suggestion.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setNoteEditor(null); setNoteDraft(''); setPlacingMode(null) }}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-800 text-gray-300 hover:bg-red-600 hover:text-white"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              <input
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                className="mb-3 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-base font-semibold text-white outline-none transition focus:border-amber-300"
              />

              <div className="mb-4 flex flex-wrap gap-2">
                {NOTE_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setNoteDraft(suggestion)}
                    className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-300 hover:text-gray-950"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setNoteEditor(null); setNoteDraft(''); setPlacingMode(null) }}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!noteDraft.trim()}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-gray-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Valider
                </button>
              </div>
            </form>
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
              className={`relative mx-auto self-start ${placingMode ? 'cursor-crosshair' : ''}`}
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
                bookmark.kind === 'NOTE' ? (
                  <button
                    key={bookmark.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onPointerDown={(e) => handlePlacedBookmarkPointerDown(bookmark, e)}
                    onPointerMove={(e) => handlePlacedBookmarkPointerMove(bookmark, e)}
                    onPointerUp={(e) => handlePlacedBookmarkPointerUp(bookmark, e)}
                    onPointerCancel={(e) => { e.stopPropagation(); draggingBookmarkRef.current = null }}
                    title={bookmark.label}
                    style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                    className="absolute z-10 max-w-44 -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-md border border-amber-300 bg-amber-300 px-2.5 py-1 text-xs font-black text-gray-950 shadow-lg ring-2 ring-white/40 transition hover:bg-amber-200 active:scale-105"
                  >
                    {bookmark.label}
                  </button>
                ) : (
                <button
                  key={bookmark.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onPointerDown={(e) => handlePlacedBookmarkPointerDown(bookmark, e)}
                  onPointerMove={(e) => handlePlacedBookmarkPointerMove(bookmark, e)}
                  onPointerUp={(e) => handlePlacedBookmarkPointerUp(bookmark, e)}
                  onPointerCancel={(e) => { e.stopPropagation(); draggingBookmarkRef.current = null }}
                  title={bookmark.targetBookmarkId ? `${bookmark.label} → ${getBookmarkTarget(bookmark)?.label || 'repère lié'}` : bookmark.label}
                  style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                  className="absolute z-10 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 touch-none select-none items-center justify-center rounded-full bg-emerald-500 px-2 text-sm font-black text-white shadow-lg ring-4 ring-white/30 transition hover:bg-emerald-400 active:scale-110"
                >
                  {getBookmarkNumber(bookmark)}{bookmark.targetBookmarkId ? '↪' : ''}
                </button>
                )
              ))}
              {placingMode && (
                <div
                  className={`absolute inset-0 z-30 touch-none cursor-crosshair ring-4 ring-inset ${placingNote ? 'bg-amber-300/10 ring-amber-300/70' : 'bg-emerald-400/10 ring-emerald-400/60'}`}
                  onPointerUp={handleBookmarkPointer}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  aria-label="Zone de placement"
                />
              )}
            </div>
          ) : (
            <div
              ref={pageRef}
              className={`relative mx-auto self-start ${placingMode ? 'cursor-crosshair' : ''}`}
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
                bookmark.kind === 'NOTE' ? (
                  <button
                    key={bookmark.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onPointerDown={(e) => handlePlacedBookmarkPointerDown(bookmark, e)}
                    onPointerMove={(e) => handlePlacedBookmarkPointerMove(bookmark, e)}
                    onPointerUp={(e) => handlePlacedBookmarkPointerUp(bookmark, e)}
                    onPointerCancel={(e) => { e.stopPropagation(); draggingBookmarkRef.current = null }}
                    title={bookmark.label}
                    style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                    className="absolute z-10 max-w-44 -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-md border border-amber-300 bg-amber-300 px-2.5 py-1 text-xs font-black text-gray-950 shadow-lg ring-2 ring-white/40 transition hover:bg-amber-200 active:scale-105"
                  >
                    {bookmark.label}
                  </button>
                ) : (
                <button
                  key={bookmark.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onPointerDown={(e) => handlePlacedBookmarkPointerDown(bookmark, e)}
                  onPointerMove={(e) => handlePlacedBookmarkPointerMove(bookmark, e)}
                  onPointerUp={(e) => handlePlacedBookmarkPointerUp(bookmark, e)}
                  onPointerCancel={(e) => { e.stopPropagation(); draggingBookmarkRef.current = null }}
                  title={bookmark.targetBookmarkId ? `${bookmark.label} → ${getBookmarkTarget(bookmark)?.label || 'repère lié'}` : bookmark.label}
                  style={{ left: `${bookmark.xPct * 100}%`, top: `${bookmark.yPct * 100}%` }}
                  className="absolute z-10 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 touch-none select-none items-center justify-center rounded-full bg-emerald-500 px-2 text-sm font-black text-white shadow-lg ring-4 ring-white/30 transition hover:bg-emerald-400 active:scale-110"
                >
                  {getBookmarkNumber(bookmark)}{bookmark.targetBookmarkId ? '↪' : ''}
                </button>
                )
              ))}
              {placingMode && (
                <div
                  className={`absolute inset-0 z-30 touch-none cursor-crosshair ring-4 ring-inset ${placingNote ? 'bg-amber-300/10 ring-amber-300/70' : 'bg-emerald-400/10 ring-emerald-400/60'}`}
                  onPointerUp={handleBookmarkPointer}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  aria-label="Zone de placement"
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
