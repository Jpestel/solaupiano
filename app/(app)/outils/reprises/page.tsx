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
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/reprises')
    if (r.ok) setScores(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const styles = useMemo(() => Array.from(new Set(scores.map((s) => s.style).filter(Boolean) as string[])).sort(), [scores])
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return scores.filter((s) =>
      (!style || s.style === style) &&
      (!t || [s.title, s.performer, s.composer, s.style].some((v) => v?.toLowerCase().includes(t))))
  }, [scores, q, style])

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

  const input = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm'

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">🎶 Partitions de reprises</h1>
        <button onClick={() => { reset(); setShowForm(true) }} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium">+ Ajouter</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="font-semibold">{editId === null ? 'Nouvelle partition' : 'Modifier les informations'}</h2>
          <input className={input} placeholder="Titre (obligatoire)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid sm:grid-cols-3 gap-3">
            <input className={input} placeholder="Style" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
            <input className={input} placeholder="Interprète" value={form.performer} onChange={(e) => setForm({ ...form, performer: e.target.value })} />
            <input className={input} placeholder="Compositeur" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
          </div>
          {editId === null && (
            <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Envoi…' : 'Enregistrer'}</button>
            <button type="button" onClick={reset} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className={input} placeholder="Rechercher (titre, interprète, compositeur…)" value={q} onChange={(e) => setQ(e.target.value)} />
        {styles.length > 0 && (
          <select className={input + ' sm:w-48'} value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Tous les styles</option>
            {styles.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : shown.length === 0 ? (
        <p className="text-sm text-gray-500">{scores.length === 0 ? 'Aucune partition pour le moment. Ajoutez-en une avec le bouton ci-dessus.' : 'Aucun résultat.'}</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700">
          {shown.map((s) => (
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
