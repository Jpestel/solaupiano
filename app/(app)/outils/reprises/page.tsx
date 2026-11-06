'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Score {
  id: number; title: string; style: string | null; performer: string | null; composer: string | null
  filePath: string; fileType: 'image' | 'pdf'
}
const EMPTY = { title: '', style: '', performer: '', composer: '' }

export default function ReprisesPage() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [style, setStyle] = useState('')
  const [performerF, setPerformerF] = useState('')
  const [composerF, setComposerF] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'performer' | 'composer'>('title')
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'pdf' } | null>(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview({ url, type: file.type === 'application/pdf' ? 'pdf' : 'image' })
    return () => URL.revokeObjectURL(url)
  }, [file])
  // Une fois l'aperçu affiché, le curseur passe sur le titre.
  useEffect(() => { if (preview) titleRef.current?.focus() }, [preview])

  const load = useCallback(async () => {
    const r = await fetch('/api/reprises')
    if (r.ok) setScores(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const distinct = (k: 'style' | 'performer' | 'composer') =>
    Array.from(new Set(scores.map((s) => s[k]).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  const styles = useMemo(() => distinct('style'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps
  const performers = useMemo(() => distinct('performer'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps
  const composers = useMemo(() => distinct('composer'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortValue = useCallback((s: Score) => (sortBy === 'title' ? s.title : s[sortBy] ?? ''), [sortBy])
  const letterOf = useCallback((s: Score) => {
    const c = sortValue(s).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
    return /[A-Z]/.test(c) ? c : '#'
  }, [sortValue])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return scores
      .filter((s) =>
        (!style || s.style === style) && (!performerF || s.performer === performerF) && (!composerF || s.composer === composerF) &&
        (!t || [s.title, s.performer, s.composer, s.style].some((v) => v?.toLowerCase().includes(t))))
      .sort((a, b) => {
        const va = sortValue(a), vb = sortValue(b)
        // Sans valeur (ex. pas d'interprète) : en fin de liste.
        if (!va !== !vb) return va ? -1 : 1
        return va.localeCompare(vb, 'fr', { sensitivity: 'base' }) || a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
      })
  }, [scores, q, style, performerF, composerF, sortValue])

  const groups = useMemo(() => {
    const m = new Map<string, Score[]>()
    for (const s of shown) { const l = letterOf(s); m.set(l, [...(m.get(l) ?? []), s]) }
    return Array.from(m.entries()).sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
  }, [shown, letterOf])
  const present = useMemo(() => new Set(groups.map(([l]) => l)), [groups])
  const filtersOn = !!(q || style || performerF || composerF)
  const jump = (l: string) => document.getElementById(`lettre-${l === '#' ? 'autres' : l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const reset = () => { setForm(EMPTY); setFile(null); setEditId(null); setShowForm(false); setError(''); if (fileRef.current) fileRef.current.value = '' }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('Le titre est obligatoire.')
    if (editId === null && !file) return setError('Choisissez une image ou un PDF.')
    setBusy(true)
    try {
      let res: Response
      if (editId === null) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('file', file!)
        res = await fetch('/api/reprises', { method: 'POST', body: fd })
      } else {
        res = await fetch(`/api/reprises/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      }
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Échec de l’enregistrement.'); return }
      reset(); await load()
    } finally { setBusy(false) }
  }

  async function remove(s: Score) {
    if (!confirm(`Supprimer « ${s.title} » ?`)) return
    await fetch(`/api/reprises/${s.id}`, { method: 'DELETE' })
    await load()
  }

  const viewIndex = viewing === null ? -1 : shown.findIndex((s) => s.id === viewing)
  const current = viewIndex >= 0 ? shown[viewIndex] : null
  const go = useCallback((d: number) => {
    if (viewIndex < 0) return
    const n = shown[viewIndex + d]
    if (n) setViewing(n.id)
  }, [shown, viewIndex])

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [current, go])

  const input = 'w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm'

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">🎶 Partitions de reprises</h1>
        <button onClick={() => { reset(); setShowForm(true) }} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium">+ Ajouter</button>
      </div>

      {showForm && (() => {
        const editing = editId !== null ? scores.find((x) => x.id === editId) : null
        const shownPreview = preview ?? (editing ? { url: editing.filePath, type: editing.fileType } : null)
        return (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">{editing ? 'Modifier les informations' : 'Nouvelle partition'}</h2>

          {!editing && (
            <div>
              <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center text-sm ${file ? 'border-gray-200 py-2 text-gray-500' : 'border-indigo-300 bg-indigo-50 py-10 text-indigo-700'}`}>
                {file ? <span>{file.name} — <span className="underline">changer de fichier</span></span>
                  : <><span className="text-base font-semibold">1. Choisissez la photo ou le PDF de la partition</span><span className="mt-1 text-xs">Appareil photo, galerie ou fichier (PDF, JPG, PNG…)</span></>}
                <input ref={fileRef} type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {(shownPreview || editing) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center h-80 md:h-[28rem]">
                {shownPreview?.type === 'pdf'
                  ? <iframe src={shownPreview.url} title="Aperçu" className="w-full h-full bg-white" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : shownPreview && <img src={shownPreview.url} alt="Aperçu de la partition" className="max-w-full max-h-full object-contain" />}
              </div>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{editing ? '' : '2. '}Renseignez les informations en regardant l&apos;aperçu.</p>
                <input ref={titleRef} className={input} placeholder="Titre (obligatoire)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input className={input} placeholder="Interprète" value={form.performer} onChange={(e) => setForm({ ...form, performer: e.target.value })} />
                <input className={input} placeholder="Compositeur" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
                <input className={input} placeholder="Style" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            {(file || editing) && <button disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Envoi…' : 'Enregistrer'}</button>}
            <button type="button" onClick={reset} className="rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
        )
      })()}

      <div className="space-y-2 mb-3">
        <input className={input} placeholder="Rechercher (titre, interprète, compositeur, style…)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select className={input} value={performerF} onChange={(e) => setPerformerF(e.target.value)}>
            <option value="">Tous les interprètes</option>{performers.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select className={input} value={composerF} onChange={(e) => setComposerF(e.target.value)}>
            <option value="">Tous les compositeurs</option>{composers.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select className={input} value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Tous les styles</option>{styles.map((v) => <option key={v}>{v}</option>)}
          </select>
          <select className={input} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="title">Classer par titre</option>
            <option value="performer">Classer par interprète</option>
            <option value="composer">Classer par compositeur</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{shown.length} partition{shown.length > 1 ? 's' : ''}{filtersOn ? ` sur ${scores.length}` : ''}</span>
          {filtersOn && <button onClick={() => { setQ(''); setStyle(''); setPerformerF(''); setComposerF('') }} className="text-indigo-600 hover:underline">Effacer les filtres</button>}
        </div>
      </div>

      {scores.length > 0 && (
        <div className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap gap-1 bg-white/95 px-1 py-2 backdrop-blur border-b border-gray-200">
          {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'].map((l) => (
            <button key={l} onClick={() => jump(l)} disabled={!present.has(l)}
              className={`h-8 min-w-[2rem] rounded-md text-sm font-semibold ${present.has(l) ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-gray-300 cursor-default'}`}>{l}</button>
          ))}
        </div>
      )}

      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : shown.length === 0 ? (
        <p className="text-sm text-gray-500">{scores.length === 0 ? 'Aucune partition pour le moment. Ajoutez-en une avec le bouton ci-dessus.' : 'Aucun résultat.'}</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([l, items]) => (
            <section key={l} id={`lettre-${l === '#' ? 'autres' : l}`} className="scroll-mt-16">
              <h2 className="mb-1 text-lg font-bold text-indigo-700">{l}</h2>
              <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
                {items.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-3">
                    <button onClick={() => setViewing(s.id)} className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{s.title}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {[s.performer, s.composer && `de ${s.composer}`, s.style].filter(Boolean).join(' · ') || (s.fileType === 'pdf' ? 'PDF' : 'Image')}
                      </div>
                    </button>
                    <button onClick={() => { setEditId(s.id); setForm({ title: s.title, style: s.style ?? '', performer: s.performer ?? '', composer: s.composer ?? '' }); setShowForm(true); window.scrollTo({ top: 0 }) }} className="text-xs text-gray-500 hover:underline">Modifier</button>
                    <button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {current && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center gap-2 p-2 text-white text-sm bg-black/80">
            <button onClick={() => go(-1)} disabled={viewIndex === 0} className="px-3 py-1 rounded disabled:opacity-30" aria-label="Précédente">←</button>
            <button onClick={() => go(1)} disabled={viewIndex === shown.length - 1} className="px-3 py-1 rounded disabled:opacity-30" aria-label="Suivante">→</button>
            <span className="flex-1 truncate text-center font-medium">{current.title}</span>
            <button onClick={() => setViewing(null)} className="px-3 py-1 rounded bg-white/15">Fermer ✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center">
            {current.fileType === 'pdf'
              ? <iframe src={current.filePath} title={current.title} className="w-full h-full bg-white" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={current.filePath} alt={current.title} className="max-w-full max-h-full object-contain m-auto" />}
          </div>
        </div>
      )}
    </div>
  )
}
