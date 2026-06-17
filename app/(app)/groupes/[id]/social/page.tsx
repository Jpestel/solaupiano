'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Photo { id: number; filePath: string; eventLabel: string | null }
interface SavedPost { id: number; caption: string; images: string[]; taggedUserIds: number[]; createdAt: string; author: { name: string } | null }
interface Member { userId: number; name: string; consent: boolean | null }

const HASHTAGS = ['#musique', '#groupedemusique', '#musiciens', '#répétition', '#concert', '#live', '#backstage']

export default function SocialPage({ params }: { params: { id: string } }) {
  const groupId = params.id
  const [groupName, setGroupName] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [posts, setPosts] = useState<SavedPost[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tagged, setTagged] = useState<number[]>([])
  const [noneIdentifiable, setNoneIdentifiable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
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
    // Module réservé aux chefs / co-chefs : un membre/élève reçoit 403.
    if (postsRes.status === 403) { setForbidden(true); setLoading(false); return }
    if (postsRes.ok) { const d = await postsRes.json(); setPosts(d.posts || []); setMembers(d.members || []) }
    setLoading(false)
  }, [groupId])
  useEffect(() => { load() }, [load])

  // Droit à l'image : on ne peut publier que si les personnes identifiables ont consenti.
  const consentReady = noneIdentifiable || tagged.length > 0
  const refusedMembers = members.filter((m) => m.consent === false)
  const pendingMembers = members.filter((m) => m.consent === null)
  const toggleTag = (m: Member) => {
    if (m.consent !== true) return
    setNoneIdentifiable(false)
    setTagged((t) => (t.includes(m.userId) ? t.filter((x) => x !== m.userId) : [...t, m.userId]))
  }

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
    if (!consentReady) { setMsg("Droit à l'image : indiquez qui apparaît, ou cochez « Aucune personne identifiable »."); return }
    setMsg(''); setBusy(true)
    // On copie la légende AVANT le partage (dans le geste utilisateur) : la plupart des apps
    // (Instagram, Facebook…) ignorent le texte joint à une image → il suffira de la coller.
    let captionCopied = false
    if (caption.trim()) { try { await navigator.clipboard.writeText(caption); captionCopied = true } catch { /* ignore */ } }
    try {
      const files = selected.length ? await toFiles() : []
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
      const hasShare = 'share' in navigator
      if (files.length && nav.canShare && nav.canShare({ files })) {
        await navigator.share({ files, text: caption } as ShareData)
        setMsg(captionCopied
          ? '✓ Image partagée. La légende est dans le presse-papier — dans l’app, faites un appui long puis « Coller ».'
          : '✓ Image partagée.')
      } else if (hasShare) {
        await navigator.share({ text: caption })
        if (files.length) setMsg('Votre appareil ne partage pas l’image directement : téléchargez-la puis ajoutez-la dans l’app (la légende est copiée).')
      } else {
        if (!captionCopied) await navigator.clipboard.writeText(caption)
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
    if (!consentReady) { setMsg("Droit à l'image : indiquez qui apparaît, ou cochez « Aucune personne identifiable »."); return }
    setBusy(true)
    const res = await fetch(`/api/groupes/${groupId}/social`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption, images: selected, taggedUserIds: tagged }),
    })
    setBusy(false)
    if (res.ok) { setMsg('✓ Post enregistré.'); load() }
    else { const e = await res.json().catch(() => ({})); setMsg(e.error || 'Erreur à l’enregistrement.') }
  }
  const reusePost = (p: SavedPost) => { setCaption(p.caption); setSelected(p.images); setTagged(p.taggedUserIds || []); setNoneIdentifiable((p.taggedUserIds || []).length === 0); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const delPost = async (id: number) => { if (!confirm('Supprimer ce post enregistré ?')) return; await fetch(`/api/groupes/${groupId}/social/${id}`, { method: 'DELETE' }); load() }

  const t = encodeURIComponent(caption)
  const quick = [
    { label: 'Facebook', cls: 'bg-[#1877f2]', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://solaupiano.fr')}&quote=${t}` },
    { label: 'X', cls: 'bg-black', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=${t}` },
    { label: 'WhatsApp', cls: 'bg-[#25d366]', icon: '🟢', href: `https://wa.me/?text=${t}` },
  ]

  if (loading) return <div className="px-4 py-8 text-gray-500">Chargement…</div>

  if (forbidden) return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Atelier réseaux — réservé</h1>
      <p className="text-gray-500 text-sm">
        Ce module est réservé aux <strong>chefs et co-chefs</strong> du groupe. En tant que membre, vous n&apos;y avez pas accès.
      </p>
    </div>
  )

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

      {/* Droit à l'image */}
      <div className="mt-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">2. Qui apparaît sur ces photos / vidéos ?</p>
        <p className="text-[12px] text-gray-500 mb-2">Le <strong>droit à l&apos;image</strong> impose le consentement de chaque personne reconnaissable. Vous ne pouvez identifier que les membres ayant <strong>accepté</strong> la diffusion de leur visage.</p>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">Aucun membre dans le groupe.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = tagged.includes(m.userId)
              const ok = m.consent === true
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => toggleTag(m)}
                  disabled={!ok}
                  title={ok ? '' : m.consent === false ? 'A refusé le droit à l’image' : "N'a pas encore répondu au droit à l’image"}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    !ok
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : on
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{on && ok ? '☑' : ok ? '☐' : m.consent === false ? '⛔' : '⏳'}</span>
                  {m.name}
                  {!ok && <span className="text-[10px]">{m.consent === false ? '(a refusé)' : '(en attente)'}</span>}
                </button>
              )
            })}
          </div>
        )}

        <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noneIdentifiable}
            onChange={(e) => { setNoneIdentifiable(e.target.checked); if (e.target.checked) setTagged([]) }}
            className="rounded border-gray-300"
          />
          Aucune personne identifiable sur ces médias (instruments, de dos, foule…).
        </label>

        {refusedMembers.length > 0 && (
          <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">
            ⚠️ {refusedMembers.map((m) => m.name).join(', ')} a refusé le droit à l&apos;image. Ne publiez <strong>aucune</strong> photo/vidéo où cette personne est reconnaissable.
          </p>
        )}
        {pendingMembers.length > 0 && (
          <p className="mt-2 text-[11px] text-gray-400">{pendingMembers.length} membre(s) n&apos;ont pas encore répondu au droit à l&apos;image — ils ne peuvent pas être identifiés tant qu&apos;ils n&apos;ont pas accepté.</p>
        )}
        {!consentReady && (
          <p className="mt-2 text-[12px] font-medium text-amber-600">Pour publier : sélectionnez les membres qui apparaissent, ou cochez « Aucune personne identifiable ».</p>
        )}
      </div>

      {/* Légende */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">3. Rédigez la légende</p>
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
        <p className="text-sm font-semibold text-gray-700 mb-3">4. Partagez</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={sharePost} disabled={busy || !consentReady} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed">📤 Partager</button>
          <button onClick={copyCaption} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">{copied ? '✓ Copié' : '📋 Copier la légende'}</button>
          {selected.length > 0 && <button onClick={download} disabled={!consentReady} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">⬇ Télécharger {selected.length > 1 ? 'les images' : "l'image"}</button>}
          <span className="text-gray-300">|</span>
          {quick.map((q) => (
            consentReady
              ? <a key={q.label} href={q.href} target="_blank" rel="noopener noreferrer" title={`Partager le texte sur ${q.label}`} className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold ${q.cls}`}>{q.icon}</a>
              : <span key={q.label} title="Réglez d’abord le droit à l’image" className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold opacity-40 cursor-not-allowed ${q.cls}`}>{q.icon}</span>
          ))}
          <button onClick={savePost} disabled={busy || !consentReady} className="ml-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">💾 Enregistrer</button>
        </div>
        {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}
        <p className="text-[11px] text-gray-400 mt-2">💡 Sur mobile, « Partager » ouvre Instagram, Facebook, etc. avec l’image. La plupart de ces apps n’importent pas la légende automatiquement : elle est <strong>copiée</strong> pour vous — il suffit de la <strong>coller</strong> (appui long → Coller) dans l’app.</p>
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
