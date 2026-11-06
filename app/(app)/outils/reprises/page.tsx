'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { titresSimilaires, type Similaire } from '@/lib/reprises-similarite'
import { ScoreViewer } from '@/components/ScoreViewer'

interface Score {
  id: number; title: string; style: string | null; performer: string | null; composer: string | null
  filePath: string; fileType: 'image' | 'pdf'; shareToken: string | null
  pages: { id: number; filePath: string; fileType: 'image' | 'pdf' }[]
}
/** Pages d'une partition ; une ancienne partition (sans page enregistrée) n'a que son fichier, d'identifiant 0. */
const pagesOf = (s: Score) => (s.pages.length > 0 ? s.pages : [{ id: 0, filePath: s.filePath, fileType: s.fileType }])
interface Selection { id: number; token: string; name: string | null; _count: { scores: number } }
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
  const [files, setFiles] = useState<File[]>([])
  const [pv, setPv] = useState(0) // page affichée dans l'aperçu
  const [editId, setEditId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [doublons, setDoublons] = useState<Similaire[] | null>(null) // réponse du serveur à l'enregistrement
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f))
    setUrls(u)
    return () => u.forEach((x) => URL.revokeObjectURL(x))
  }, [files])
  // Une fois le premier fichier choisi, le curseur passe sur le titre.
  useEffect(() => { if (files.length > 0) titleRef.current?.focus() }, [files.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    const r = await fetch('/api/reprises')
    if (r.ok) setScores(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // ── Partage par lien ────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<Selection[]>([])
  const [shareId, setShareId] = useState<number | null>(null)        // partition dont on affiche le lien
  const [pickMode, setPickMode] = useState(false)                     // mode « choisir une sélection »
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [selName, setSelName] = useState('')
  const [copied, setCopied] = useState('')
  const loadSelections = useCallback(async () => {
    const r = await fetch('/api/reprises/selections')
    if (r.ok) setSelections(await r.json())
  }, [])
  useEffect(() => { loadSelections() }, [loadSelections])

  const togglePick = (id: number) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const urlOf = (kind: 'partition' | 'selection', token: string) => `${window.location.origin}/${kind}/${token}`
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url) } catch { window.prompt('Copiez ce lien :', url) }
    setCopied(url); setTimeout(() => setCopied(''), 2000)
  }
  async function send(url: string, title: string) {
    if (navigator.share) { try { await navigator.share({ title, url }); return } catch { /* annulé */ } }
    copy(url)
  }
  async function shareAction(id: number, action: 'enable' | 'renew' | 'stop') {
    if (action === 'stop' && !confirm('Arrêter le partage ? Le lien ne fonctionnera plus pour personne.')) return
    if (action === 'renew' && !confirm("Créer un nouveau lien ? L'ancien ne fonctionnera plus.")) return
    const r = await fetch(`/api/reprises/${id}/partage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    if (r.ok) { await load(); if (action === 'stop') setShareId(null) }
  }
  async function createSelection() {
    const r = await fetch('/api/reprises/selections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selName, scoreIds: Array.from(picked) }) })
    if (!r.ok) return
    setPickMode(false); setPicked(new Set()); setSelName('')
    await loadSelections()
  }
  async function deleteSelection(sel: Selection) {
    if (!confirm('Arrêter ce lien de sélection ? Il ne fonctionnera plus pour personne.')) return
    await fetch(`/api/reprises/selections/${sel.id}`, { method: 'DELETE' })
    await loadSelections()
  }

  const distinct = (k: 'style' | 'performer' | 'composer') =>
    Array.from(new Set(scores.map((s) => s[k]).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  const styles = useMemo(() => distinct('style'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps
  const performers = useMemo(() => distinct('performer'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps
  const composers = useMemo(() => distinct('composer'), [scores]) // eslint-disable-line react-hooks/exhaustive-deps

  const proches = useMemo(() => (showForm && form.title.trim().length >= 3 ? titresSimilaires(form.title, scores, editId ?? undefined) : []), [showForm, form.title, scores, editId])

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

  const reset = () => { setDoublons(null); setForm(EMPTY); setFiles([]); setPv(0); setEditId(null); setShowForm(false); setError(''); if (fileRef.current) fileRef.current.value = '' }

  async function submit(e: React.FormEvent | null, force = false) {
    e?.preventDefault()
    setDoublons(null)
    setError('')
    if (!form.title.trim()) return setError('Le titre est obligatoire.')
    if (editId === null && files.length === 0) return setError('Choisissez au moins une image ou un PDF.')
    setBusy(true)
    try {
      let res: Response
      if (editId === null) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        if (force) fd.append('force', '1')
        fd.append('file', files[0]) // les autres pages suivent une à une (requêtes légères, reprise possible)
        res = await fetch('/api/reprises', { method: 'POST', body: fd })
      } else {
        res = await fetch(`/api/reprises/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, force }) })
      }
      if (res.status === 409) {
        const d = await res.json().catch(() => ({}))
        if (d.code === 'DOUBLON') { setDoublons(d.similaires ?? []); return }
      }
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Échec de l’enregistrement.'); return }
      if (editId === null && files.length > 1) {
        const created = await res.json()
        for (let i = 1; i < files.length; i++) {
          setProgress(`Envoi de la page ${i + 1} sur ${files.length}…`)
          const fd = new FormData(); fd.append('file', files[i])
          const r = await fetch(`/api/reprises/${created.id}/pages`, { method: 'POST', body: fd })
          if (!r.ok) {
            await load()
            setEditId(created.id); setFiles([]); setPv(0)
            setError(`La partition est enregistrée, mais la page ${i + 1} n’a pas pu être envoyée (${(await r.json().catch(() => ({}))).error || 'erreur'}). Ajoutez-la avec « + Ajouter des pages ».`)
            return
          }
        }
      }
      reset(); await load()
    } finally { setBusy(false); setProgress('') }
  }

  // ── Pages d'une partition existante (modification) ─────────────────────────
  const [pageBusy, setPageBusy] = useState(false)
  const pageFileRef = useRef<HTMLInputElement>(null)
  async function pageCall(fn: () => Promise<Response>) {
    setPageBusy(true); setError('')
    try {
      const r = await fn()
      if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Échec.')
      await load()
    } finally { setPageBusy(false) }
  }
  const addPages = (id: number, list: FileList | null) => {
    if (!list || list.length === 0) return
    const fd = new FormData(); Array.from(list).forEach((f) => fd.append('file', f))
    pageCall(() => fetch(`/api/reprises/${id}/pages`, { method: 'POST', body: fd })).then(() => { if (pageFileRef.current) pageFileRef.current.value = '' })
  }
  const deletePage = (sc: Score, pageId: number) => { if (confirm('Supprimer cette page ?')) { setPv(0); pageCall(() => fetch(`/api/reprises/${sc.id}/pages/${pageId}`, { method: 'DELETE' })) } }
  const movePage = (sc: Score, i: number, d: number) => {
    const ids = pagesOf(sc).map((p) => p.id)
    if (ids.includes(0) || i + d < 0 || i + d >= ids.length) return
    ;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]
    setPv(i + d)
    pageCall(() => fetch(`/api/reprises/${sc.id}/pages`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: ids }) }))
  }
  const moveNew = (i: number, d: number) => {
    if (i + d < 0 || i + d >= files.length) return
    const n = files.slice(); [n[i], n[i + d]] = [n[i + d], n[i]]; setFiles(n); setPv(i + d)
  }

  async function remove(s: Score) {
    if (!confirm(`Supprimer « ${s.title} » ?`)) return
    await fetch(`/api/reprises/${s.id}`, { method: 'DELETE' })
    await load()
  }

  const viewIndex = viewing === null ? -1 : shown.findIndex((x) => x.id === viewing)

  const input = 'w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm'

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">🎶 Partitions de reprises</h1>
        <div className="flex gap-2">
          {scores.length > 0 && <button onClick={() => { setPickMode((m) => !m); setPicked(new Set()) }} className="rounded-lg border border-gray-300 bg-white text-gray-800 px-3 py-2 text-sm">{pickMode ? 'Annuler la sélection' : '🔗 Partager une sélection'}</button>}
          <button onClick={() => { reset(); setShowForm(true) }} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium">+ Ajouter</button>
        </div>
      </div>

      {showForm && (() => {
        const editing = editId !== null ? scores.find((x) => x.id === editId) : null
        // Liste des pages affichées : celles qu'on s'apprête à envoyer, ou celles déjà enregistrées.
        const list = editing
          ? pagesOf(editing).map((p, i) => ({ key: p.id, label: `Page ${i + 1}`, url: p.filePath, type: p.fileType }))
          : files.map((f, i) => ({ key: i, label: f.name, url: urls[i], type: f.type === 'application/pdf' ? 'pdf' : 'image' }))
        const cur = list[Math.min(pv, list.length - 1)]
        const canSave = editing || files.length > 0
        return (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">{editing ? 'Modifier la partition' : 'Nouvelle partition'}</h2>

          {!editing && files.length === 0 && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-10 text-center text-sm text-indigo-700">
              <span className="text-base font-semibold">1. Choisissez la photo ou le PDF de la partition</span>
              <span className="mt-1 text-xs">Une partition de plusieurs pages ? Sélectionnez tous les fichiers d&apos;un coup, ou ajoutez-les ensuite.</span>
              <input ref={fileRef} type="file" multiple accept="application/pdf,image/*" className="sr-only" onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setPv(0) }} />
            </label>
          )}

          {list.length > 0 && cur && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center h-80 md:h-[28rem]">
                  {cur.type === 'pdf'
                    ? <iframe src={cur.url} title="Aperçu" className="w-full h-full bg-white" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={cur.url} alt="Aperçu de la partition" className="max-w-full max-h-full object-contain" />}
                </div>
                <ul className="space-y-1">
                  {list.map((p, i) => (
                    <li key={p.key} className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${i === pv ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                      <button type="button" onClick={() => setPv(i)} className="min-w-0 flex-1 truncate text-left text-gray-800">
                        <span className="font-semibold">Page {i + 1}</span>{!editing && <span className="text-gray-500"> · {p.label}</span>}
                      </button>
                      <button type="button" disabled={pageBusy || i === 0} onClick={() => (editing ? movePage(editing, i, -1) : moveNew(i, -1))} className="px-1 text-gray-600 disabled:opacity-30" aria-label="Monter">↑</button>
                      <button type="button" disabled={pageBusy || i === list.length - 1} onClick={() => (editing ? movePage(editing, i, 1) : moveNew(i, 1))} className="px-1 text-gray-600 disabled:opacity-30" aria-label="Descendre">↓</button>
                      <button type="button" disabled={pageBusy || list.length === 1} onClick={() => (editing ? deletePage(editing, p.key as number) : (setFiles(files.filter((_, k) => k !== i)), setPv(0)))} className="px-1 text-red-600 disabled:opacity-30" aria-label="Retirer">✕</button>
                    </li>
                  ))}
                </ul>
                <label className="inline-block cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800">
                  + Ajouter des pages
                  <input ref={pageFileRef} type="file" multiple accept="application/pdf,image/*" className="sr-only"
                    onChange={(e) => { if (editing) addPages(editing.id, e.target.files); else { setFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = '' } }} />
                </label>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{editing ? '' : '2. '}Renseignez les informations en regardant l&apos;aperçu.</p>
                <input ref={titleRef} className={input} placeholder="Titre (obligatoire)" value={form.title} onChange={(e) => { setDoublons(null); setForm({ ...form, title: e.target.value }) }} />
                {(doublons ?? proches).length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-medium">{(doublons ?? proches).some((d) => d.niveau === 'identique') ? 'Ce titre existe déjà dans votre répertoire :' : 'Un titre très proche existe déjà :'}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {(doublons ?? proches).map((d) => <li key={d.id}>{d.title}{d.performer ? ` — ${d.performer}` : ''}{d.niveau === 'identique' ? ' (identique)' : ''}</li>)}
                    </ul>
                    {doublons && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => submit(null, true)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-white disabled:opacity-50">Ajouter quand même</button>
                        <button type="button" onClick={() => setDoublons(null)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5">Modifier le titre</button>
                      </div>
                    )}
                  </div>
                )}
                <input className={input} placeholder="Interprète" value={form.performer} onChange={(e) => setForm({ ...form, performer: e.target.value })} />
                <input className={input} placeholder="Compositeur" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
                <input className={input} placeholder="Style" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            {canSave && !doublons && <button disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? (progress || 'Envoi…') : 'Enregistrer'}</button>}
            <button type="button" onClick={reset} className="rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2 text-sm">{editing ? 'Fermer' : 'Annuler'}</button>
          </div>
        </form>
        )
      })()}

      {pickMode && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <span className="text-indigo-900">Cochez les partitions à partager ({picked.size})</span>
          <input className={input + ' sm:w-64'} placeholder="Nom du lien (ex. Soirée du 12)" value={selName} onChange={(e) => setSelName(e.target.value)} />
          <button disabled={picked.size === 0} onClick={createSelection} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40">Créer le lien</button>
        </div>
      )}

      {selections.length > 0 && (
        <details className="mb-3 rounded-xl border border-gray-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium text-gray-800">Mes liens de sélection ({selections.length})</summary>
          <ul className="mt-2 divide-y divide-gray-100">
            {selections.map((sel) => {
              const url = typeof window !== 'undefined' ? urlOf('selection', sel.token) : ''
              return (
                <li key={sel.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate">{sel.name || 'Sans nom'} <span className="text-xs text-gray-500">· {sel._count.scores} partition{sel._count.scores > 1 ? 's' : ''}</span></span>
                  <button onClick={() => send(url, sel.name || 'Partitions')} className="text-xs text-indigo-600 hover:underline">Envoyer</button>
                  <button onClick={() => copy(url)} className="text-xs text-indigo-600 hover:underline">{copied === url ? 'Copié ✓' : 'Copier le lien'}</button>
                  <button onClick={() => deleteSelection(sel)} className="text-xs text-red-600 hover:underline">Arrêter</button>
                </li>
              )
            })}
          </ul>
        </details>
      )}

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

      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : shown.length === 0 ? (
        <p className="text-sm text-gray-500">{scores.length === 0 ? 'Aucune partition pour le moment. Ajoutez-en une avec le bouton ci-dessus.' : 'Aucun résultat.'}</p>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 md:columns-2 md:gap-6">
            {groups.map(([l, items]) => (
              <section key={l} id={`lettre-${l === '#' ? 'autres' : l}`} className="mb-3 scroll-mt-4">
                <h2 className="mb-0.5 break-after-avoid border-b border-indigo-100 text-base font-bold leading-tight text-indigo-700">{l}</h2>
                <ul className="divide-y divide-gray-100">
                  {items.map((s) => (
                    <li key={s.id} className="break-inside-avoid py-1.5">
                      <div className="flex items-center gap-2">
                        {pickMode && <input type="checkbox" className="h-5 w-5 shrink-0" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} />}
                        <button onClick={() => (pickMode ? togglePick(s.id) : setViewing(s.id))} className="min-w-0 flex-1 text-left leading-tight">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {s.title}
                            {s.shareToken && <span className="ml-1.5 align-middle text-[10px]" title="Partagée par lien">🔗</span>}
                            {pagesOf(s).length > 1 && <span className="ml-1.5 rounded bg-gray-100 px-1 align-middle text-[10px] font-medium text-gray-600">{pagesOf(s).length} p.</span>}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {[s.performer, s.composer && `de ${s.composer}`, s.style].filter(Boolean).join(' · ') || (s.fileType === 'pdf' ? 'PDF' : 'Image')}
                          </span>
                        </button>
                        {!pickMode && (
                          <details className="relative shrink-0">
                            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Actions">⋯</summary>
                            <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
                              <button onClick={() => { setShareId(shareId === s.id ? null : s.id); if (!s.shareToken) shareAction(s.id, 'enable') }} className="block w-full px-3 py-1.5 text-left text-gray-800 hover:bg-gray-50">🔗 Partager</button>
                              <button onClick={() => { setPv(0); setEditId(s.id); setForm({ title: s.title, style: s.style ?? '', performer: s.performer ?? '', composer: s.composer ?? '' }); setShowForm(true); window.scrollTo({ top: 0 }) }} className="block w-full px-3 py-1.5 text-left text-gray-800 hover:bg-gray-50">✏️ Modifier</button>
                              <button onClick={() => remove(s)} className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-gray-50">🗑 Supprimer</button>
                            </div>
                          </details>
                        )}
                      </div>
                      {shareId === s.id && s.shareToken && (() => {
                        const url = urlOf('partition', s.shareToken)
                        return (
                          <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-600">Toute personne qui a ce lien peut voir cette partition, sans compte.</p>
                            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={input} />
                            <div className="flex flex-wrap gap-2 text-sm">
                              <button onClick={() => send(url, s.title)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white">Envoyer</button>
                              <button onClick={() => copy(url)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-800">{copied === url ? 'Copié ✓' : 'Copier le lien'}</button>
                              <button onClick={() => shareAction(s.id, 'renew')} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-800">Nouveau lien</button>
                              <button onClick={() => shareAction(s.id, 'stop')} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-600">Arrêter le partage</button>
                            </div>
                          </div>
                        )
                      })()}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Index A–Z : barre verticale sur toute la hauteur de l'écran, toujours visible. */}
          <nav aria-label="Index alphabétique" className="sticky top-2 flex h-[calc(100vh-1rem)] w-9 shrink-0 flex-col justify-between rounded-xl bg-indigo-50 py-1 sm:w-11">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map((l) => (
              <button key={l} onClick={() => jump(l)} disabled={!present.has(l)}
                className={`flex min-h-0 flex-1 items-center justify-center text-sm font-bold sm:text-base ${present.has(l) ? 'text-indigo-700 hover:bg-indigo-200' : 'text-indigo-200'}`}>{l}</button>
            ))}
          </nav>
        </div>
      )}

      {viewIndex >= 0 && (
        <ScoreViewer
          key={viewing}
          scores={shown.map((x) => ({ id: x.id, title: x.title, performer: x.performer, composer: x.composer, pages: pagesOf(x).map((p) => ({ id: p.id, fileType: p.fileType, src: p.filePath })) }))}
          start={viewIndex}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
