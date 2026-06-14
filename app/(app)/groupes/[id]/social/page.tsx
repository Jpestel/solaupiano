'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Photo { id: number; filePath: string; eventLabel: string | null }
interface SavedPost { id: number; caption: string; images: string[]; createdAt: string; author: { name: string } | null }

const HASHTAGS = ['#musique', '#groupedemusique', '#musiciens', '#répétition', '#concert', '#live', '#backstage']

export default function SocialPage({ params }: { params: { id: string } }) {
  const groupId = params.id
  const [groupName, setGroupName] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [posts, setPosts] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [gRes, galRes, postsRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}`),
      fetch(`/api/groupes/${groupId}/galerie`),
      fetch(`/api/groupes/${groupId}/social`),
    ])
    if (gRes.ok) { const g = await gRes.json(); setGroupName(g.name || '') }
    if (galRes.ok) { const d = await galRes.json(); setPhotos((d.photos || []).map((p: Photo) => ({ id: p.id, filePath: p.filePath, eventLabel: p.eventLabel }))) }
    if (postsRes.ok) setPosts(await postsRes.json())
    setLoading(false)
  }, [groupId])
  useEffect(() => { load() }, [load])

  const toggle = (url: string) => setSelected((s) => (s.includes(url) ? s.filter((u) => u !== url) : [...s, url]))

  const suggest = () => {
    const tag = '#' + (groupName || 'monGroupe').toLowerCase().replace(/[^a-z0-9]/g, '')
    setCaption(`🎶 ${groupName || 'Notre groupe'} — un moment à partager avec vous !\n\nMerci à tous ❤️\n\n#musique #groupedemusique #live ${tag}`)
  }
  const addHashtag = (h: string) => setCaption((c) => (c.includes(h) ? c : (c.trimEnd() + (c ? ' ' : '') + h)))

  // Construit des File à partir des images sélectionnées (pour le partage natif)
  async function toFiles(): Promise<File[]> {
    return Promise.all(selected.map(async (url, i) => {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      return new File([blob], `photo-${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' })
    }))
  }

  const sharePost = async () => {
    setMsg(''); setBusy(true)
    try {
      const files = selected.length ? await toFiles() : []
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
      const hasShare = 'share' in navigator
      if (files.length && nav.canShare && nav.canShare({ files })) {
        await navigator.share({ files, text: caption } as ShareData)
      } else if (hasShare) {
        await navigator.share({ text: caption })
        if (files.length) setMsg('Votre appareil ne permet pas de partager l’image directement : téléchargez-la puis ajoutez-la dans l’app.')
      } else {
        await navigator.clipboard.writeText(caption)
        setMsg('Partage natif indisponible : la légende a été copiée. Téléchargez les images puis publiez manuellement.')
      }
    } catch { /* annulé */ } finally { setBusy(false) }
  }

  const download = async () => {
    for (let i = 0; i < selected.length; i++) {
      const a = document.createElement('a')
      a.href = selected[i]; a.download = `post-${i + 1}.jpg`; document.body.appendChild(a); a.click(); a.remove()
      await new Promise((r) => setTimeout(r, 400))
    }
  }
  const copyCaption = async () => { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }

  const savePost = async () => {
    if (!caption.trim() && selected.length === 0) { setMsg('Ajoutez du texte ou une image.'); return }
    setBusy(true)
    const res = await fetch(`/api/groupes/${groupId}/social`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption, images: selected }),
    })
    setBusy(false)
    if (res.ok) { setMsg('✓ Post enregistré.'); load() } else setMsg('Erreur à l’enregistrement.')
  }
  const reusePost = (p: SavedPost) => { setCaption(p.caption); setSelected(p.images); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const delPost = async (id: number) => { if (!confirm('Supprimer ce post enregistré ?')) return; await fetch(`/api/groupes/${groupId}/social/${id}`, { method: 'DELETE' }); load() }

  const t = encodeURIComponent(caption)
  const quick = [
    { label: 'Facebook', cls: 'bg-[#1877f2]', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://solaupiano.fr')}&quote=${t}` },
    { label: 'X', cls: 'bg-black', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=${t}` },
    { label: 'WhatsApp', cls: 'bg-[#25d366]', icon: '🟢', href: `https://wa.me/?text=${t}` },
  ]

  if (loading) return <div className="px-4 py-8 text-gray-500">Chargement…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <Link href={`/groupes/${groupId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">← Retour au groupe</Link>
      <h1 className="text-2xl font-bold text-gray-900">📣 Atelier réseaux sociaux</h1>
      <p className="text-gray-500 text-sm mt-0.5">Composez un post avec vos photos et partagez-le en un geste.</p>

      {/* Sélection des photos */}
      <div className="mt-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">1. Choisissez des photos {selected.length > 0 && <span className="text-sky-600">({selected.length} sélectionnée{selected.length > 1 ? 's' : ''})</span>}</p>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-400 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">Aucune photo dans la Galerie. Ajoutez-en depuis <Link href={`/groupes/${groupId}/galerie`} className="text-indigo-600 underline">la Galerie</Link>.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto p-1">
            {photos.map((p) => {
              const sel = selected.includes(p.filePath)
              const idx = selected.indexOf(p.filePath)
              return (
                <button key={p.id} onClick={() => toggle(p.filePath)} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${sel ? 'border-sky-500' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.filePath} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {sel && <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">2. Rédigez la légende</p>
          <button onClick={suggest} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">✨ Suggérer un texte</button>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" placeholder="Écrivez votre message… ajoutez des emojis et des hashtags 🎶" />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {HASHTAGS.map((h) => <button key={h} onClick={() => addHashtag(h)} className="rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs hover:bg-gray-200">{h}</button>)}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{caption.length} caractères</p>
      </div>

      {/* Actions */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">3. Partagez</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={sharePost} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-60">📤 Partager</button>
          <button onClick={copyCaption} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">{copied ? '✓ Copié' : '📋 Copier la légende'}</button>
          {selected.length > 0 && <button onClick={download} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">⬇ Télécharger {selected.length > 1 ? 'les images' : "l'image"}</button>}
          <span className="text-gray-300">|</span>
          {quick.map((q) => (
            <a key={q.label} href={q.href} target="_blank" rel="noopener noreferrer" title={`Partager le texte sur ${q.label}`} className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold ${q.cls}`}>{q.icon}</a>
          ))}
          <button onClick={savePost} disabled={busy} className="ml-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">💾 Enregistrer</button>
        </div>
        {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}
        <p className="text-[11px] text-gray-400 mt-2">💡 Sur mobile, « Partager » ouvre directement Instagram, Facebook, etc. avec l’image. Sur ordinateur, copiez la légende et téléchargez l’image pour la publier.</p>
      </div>

      {/* Posts enregistrés */}
      {posts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Posts enregistrés</h2>
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5">
                <div className="flex -space-x-2 flex-shrink-0">
                  {p.images.slice(0, 3).map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={u} alt="" className="w-9 h-9 rounded-md object-cover border-2 border-white" />
                  ))}
                  {p.images.length === 0 && <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-xs">📝</div>}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 flex-1 min-w-0">{p.caption || <span className="text-gray-400">(sans texte)</span>}</p>
                <button onClick={() => reusePost(p)} className="text-xs text-indigo-600 hover:text-indigo-700 flex-shrink-0">Réutiliser</button>
                <button onClick={() => delPost(p.id)} className="text-xs text-red-500 hover:text-red-600 flex-shrink-0">×</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
