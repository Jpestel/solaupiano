'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberCard {
  userId: number
  displayName: string
  instrumentLabel: string
  bio: string
  photoUrl?: string
  show: boolean
  order: number
}

interface PageData {
  slug: string
  published: boolean
  primaryColor: string
  accentColor: string
  bgColor: string
  textColor: string
  bannerTitle: string
  bannerSubtitle: string
  bio: string
  memberCards: MemberCard[]
  showConcerts: boolean
  showContact: boolean
  contactTitle: string
  instagram: string
  facebook: string
  youtube: string
  spotify: string
  website: string
}

interface GroupMember { userId: number; name: string; avatarUrl?: string | null; instruments: string[] }

const DEFAULTS: PageData = {
  slug: '',
  published: false,
  primaryColor: '#4f46e5',
  accentColor: '#7c3aed',
  bgColor: '#ffffff',
  textColor: '#111827',
  bannerTitle: '',
  bannerSubtitle: '',
  bio: '',
  memberCards: [],
  showConcerts: true,
  showContact: true,
  contactTitle: '',
  instagram: '',
  facebook: '',
  youtube: '',
  spotify: '',
  website: '',
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Components ───────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{hint && <span className="ml-1.5 text-xs font-normal text-gray-400">{hint}</span>}</label>
      {children}
    </div>
  )
}

const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const ta  = `${inp} resize-none`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaPageEditor({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [page, setPage] = useState<PageData>(DEFAULTS)
  const [slugInput, setSlugInput] = useState('')
  const [slugError, setSlugError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'config' | 'contenu' | 'membres' | 'options'>('config')

  // Photo upload state
  const [uploadingFor, setUploadingFor] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<number | null>(null)

  // ─── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    fetch(`/api/groupes/${groupId}/ma-page`).then(r => r.json()).then(d => {
      setGroupName(d.groupName ?? '')
      setIsChef(d.role === 'CHEF')
      setGroupMembers(d.members ?? [])

      if (d.page) {
        const p = d.page
        setPage({
          slug: p.slug ?? '',
          published: p.published ?? false,
          primaryColor: p.primaryColor ?? DEFAULTS.primaryColor,
          accentColor: p.accentColor ?? DEFAULTS.accentColor,
          bgColor: p.bgColor ?? DEFAULTS.bgColor,
          textColor: p.textColor ?? DEFAULTS.textColor,
          bannerTitle: p.bannerTitle ?? '',
          bannerSubtitle: p.bannerSubtitle ?? '',
          bio: p.bio ?? '',
          memberCards: Array.isArray(p.memberCards) ? p.memberCards : [],
          showConcerts: p.showConcerts ?? true,
          showContact: p.showContact ?? true,
          contactTitle: p.contactTitle ?? '',
          instagram: p.instagram ?? '',
          facebook: p.facebook ?? '',
          youtube: p.youtube ?? '',
          spotify: p.spotify ?? '',
          website: p.website ?? '',
        })
        setSlugInput(p.slug ?? '')
      } else {
        const suggested = d.suggestedSlug ?? ''
        setPage(prev => ({ ...prev, slug: suggested }))
        setSlugInput(suggested)
      }
      setLoading(false)
    })
  }, [session, groupId])

  // ─── Pre-fill members ─────────────────────────────────────────────────────
  const prefillMembers = () => {
    const cards: MemberCard[] = groupMembers.map((m, i) => ({
      userId: m.userId,
      displayName: m.name,
      instrumentLabel: m.instruments[0] ?? '',
      bio: '',
      photoUrl: m.avatarUrl ?? undefined,
      show: true,
      order: i,
    }))
    setPage(prev => ({ ...prev, memberCards: cards }))
  }

  // ─── Member card helpers ──────────────────────────────────────────────────
  const updCard = (userId: number, patch: Partial<MemberCard>) => {
    setPage(prev => ({
      ...prev,
      memberCards: prev.memberCards.map(c => c.userId === userId ? { ...c, ...patch } : c),
    }))
  }

  const moveCard = (userId: number, dir: -1 | 1) => {
    const cards = [...page.memberCards].sort((a, b) => a.order - b.order)
    const idx = cards.findIndex(c => c.userId === userId)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= cards.length) return
    const reordered = [...cards]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    setPage(prev => ({ ...prev, memberCards: reordered.map((c, i) => ({ ...c, order: i })) }))
  }

  // ─── Photo upload ─────────────────────────────────────────────────────────
  const triggerPhotoUpload = (userId: number) => {
    uploadTargetRef.current = userId
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploadTargetRef.current === null) return

    const targetUserId = uploadTargetRef.current
    setUploadingFor(targetUserId)

    const formData = new FormData()
    formData.append('photo', file)
    formData.append('userId', String(targetUserId))

    const res = await fetch(`/api/groupes/${groupId}/ma-page/photo`, { method: 'POST', body: formData })
    const d = await res.json()

    if (d.photoUrl) {
      updCard(targetUserId, { photoUrl: d.photoUrl })
    }
    setUploadingFor(null)
    e.target.value = ''
  }

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (slugError) return
    setSaving(true)

    const res = await fetch(`/api/groupes/${groupId}/ma-page`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...page, slug: slugInput }),
    })

    if (!res.ok) {
      const d = await res.json()
      setSlugError(d.error || 'Erreur lors de la sauvegarde.')
      setSaving(false)
      return
    }

    const saved_page = await res.json()
    setSlugInput(saved_page.slug)
    setPage(prev => ({ ...prev, slug: saved_page.slug, published: saved_page.published }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ─── Slug validation ──────────────────────────────────────────────────────
  const validateSlug = (v: string) => {
    if (!v) { setSlugError('L\'URL ne peut pas être vide.'); return }
    if (!/^[a-z0-9-]+$/.test(v)) { setSlugError('Uniquement lettres minuscules, chiffres et tirets.'); return }
    if (v.length < 2) { setSlugError('Minimum 2 caractères.'); return }
    setSlugError('')
  }

  const publicUrl = `https://solaupiano.fr/${slugInput}`

  if (loading) return <div className="text-gray-500 p-8">Chargement...</div>

  const sortedCards = [...page.memberCards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <div>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Ma page</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma page publique</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mini-site de présentation partageable</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {page.slug && (
            <a href={`/${slugInput}`} target="_blank" rel="noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-200 flex items-center gap-1.5 transition-colors">
              🌐 Voir la page →
            </a>
          )}
          {isChef && (
            <Button onClick={handleSave} disabled={saving || !!slugError}>
              {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        <TabBtn active={tab === 'config'} onClick={() => setTab('config')}>⚙️ Config</TabBtn>
        <TabBtn active={tab === 'contenu'} onClick={() => setTab('contenu')}>✏️ Contenu</TabBtn>
        <TabBtn active={tab === 'membres'} onClick={() => setTab('membres')}>👤 Membres</TabBtn>
        <TabBtn active={tab === 'options'} onClick={() => setTab('options')}>🔗 Options</TabBtn>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

        {/* ── Config ── */}
        {tab === 'config' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-base font-semibold text-gray-900">Configuration & apparence</h2>

            {/* Published toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Statut de la page</p>
                <p className="text-xs text-gray-500 mt-0.5">{page.published ? 'Visible publiquement' : 'Brouillon — non visible'}</p>
              </div>
              <button
                disabled={!isChef}
                onClick={() => setPage(prev => ({ ...prev, published: !prev.published }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${page.published ? 'bg-green-500' : 'bg-gray-300'} ${!isChef ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${page.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* URL */}
            <Field label="URL de la page">
              <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-r border-gray-300 whitespace-nowrap flex-shrink-0">solaupiano.fr/</span>
                <input
                  disabled={!isChef}
                  value={slugInput}
                  onChange={e => { setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); validateSlug(e.target.value) }}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  placeholder="nom-du-groupe"
                />
              </div>
              {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
              {!slugError && slugInput && (
                <p className="text-xs text-gray-400 mt-1">🔗 {publicUrl}</p>
              )}
            </Field>

            {/* Colors */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Couleurs du thème</p>

              {/* Preview strip */}
              <div className="h-10 rounded-xl overflow-hidden shadow-sm" style={{ background: `linear-gradient(135deg, ${page.primaryColor} 0%, ${page.accentColor} 100%)` }} />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Couleur principale">
                  <div className="flex items-center gap-2">
                    <input disabled={!isChef} type="color" value={page.primaryColor} onChange={e => setPage(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                    <input disabled={!isChef} value={page.primaryColor} onChange={e => setPage(p => ({ ...p, primaryColor: e.target.value }))} className={`${inp} font-mono text-xs`} maxLength={7} />
                  </div>
                </Field>
                <Field label="Couleur accent">
                  <div className="flex items-center gap-2">
                    <input disabled={!isChef} type="color" value={page.accentColor} onChange={e => setPage(p => ({ ...p, accentColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                    <input disabled={!isChef} value={page.accentColor} onChange={e => setPage(p => ({ ...p, accentColor: e.target.value }))} className={`${inp} font-mono text-xs`} maxLength={7} />
                  </div>
                </Field>
                <Field label="Fond de page">
                  <div className="flex items-center gap-2">
                    <input disabled={!isChef} type="color" value={page.bgColor} onChange={e => setPage(p => ({ ...p, bgColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                    <input disabled={!isChef} value={page.bgColor} onChange={e => setPage(p => ({ ...p, bgColor: e.target.value }))} className={`${inp} font-mono text-xs`} maxLength={7} />
                  </div>
                </Field>
                <Field label="Couleur du texte">
                  <div className="flex items-center gap-2">
                    <input disabled={!isChef} type="color" value={page.textColor} onChange={e => setPage(p => ({ ...p, textColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                    <input disabled={!isChef} value={page.textColor} onChange={e => setPage(p => ({ ...p, textColor: e.target.value }))} className={`${inp} font-mono text-xs`} maxLength={7} />
                  </div>
                </Field>
              </div>
              <button
                disabled={!isChef}
                onClick={() => setPage(p => ({ ...p, primaryColor: DEFAULTS.primaryColor, accentColor: DEFAULTS.accentColor, bgColor: DEFAULTS.bgColor, textColor: DEFAULTS.textColor }))}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ↺ Réinitialiser les couleurs
              </button>
            </div>
          </div>
        )}

        {/* ── Contenu ── */}
        {tab === 'contenu' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-base font-semibold text-gray-900">Bannière & biographie</h2>
            <Field label="Titre de la bannière" hint="(nom du groupe par défaut)">
              <input disabled={!isChef} value={page.bannerTitle} onChange={e => setPage(p => ({ ...p, bannerTitle: e.target.value }))} className={inp} placeholder={groupName} />
            </Field>
            <Field label="Sous-titre" hint="(genre, slogan…)">
              <input disabled={!isChef} value={page.bannerSubtitle} onChange={e => setPage(p => ({ ...p, bannerSubtitle: e.target.value }))} className={inp} placeholder="Rock alternatif depuis 2010" />
            </Field>
            <Field label="Biographie du groupe">
              <textarea disabled={!isChef} rows={8} value={page.bio} onChange={e => setPage(p => ({ ...p, bio: e.target.value }))} className={ta} placeholder="Racontez l'histoire de votre groupe, comment vous vous êtes rencontrés, votre univers musical…" />
            </Field>
          </div>
        )}

        {/* ── Membres ── */}
        {tab === 'membres' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-semibold text-gray-900">Présentation des membres</h2>
              {isChef && page.memberCards.length === 0 && groupMembers.length > 0 && (
                <button onClick={prefillMembers} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors">
                  ✨ Pré-remplir depuis le groupe
                </button>
              )}
            </div>

            {page.memberCards.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Aucun membre ajouté.</p>
                {isChef && groupMembers.length > 0 && (
                  <button onClick={prefillMembers} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                    Pré-remplir depuis les membres du groupe →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedCards.map((card, idx) => (
                  <div key={card.userId} className={`rounded-2xl border p-4 transition-colors ${card.show ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-2xl relative">
                          {card.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.photoUrl} alt={card.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>🎵</span>
                          )}
                          {uploadingFor === card.userId && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {isChef && (
                          <button onClick={() => triggerPhotoUpload(card.userId)} className="mt-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium w-16 text-center block">
                            📷 Photo
                          </button>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 font-medium">Nom affiché</label>
                            <input disabled={!isChef} value={card.displayName} onChange={e => updCard(card.userId, { displayName: e.target.value })} className={`${inp} py-1.5 mt-0.5`} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 font-medium">Instrument</label>
                            <input disabled={!isChef} value={card.instrumentLabel} onChange={e => updCard(card.userId, { instrumentLabel: e.target.value })} className={`${inp} py-1.5 mt-0.5`} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-medium">Biographie courte</label>
                          <textarea disabled={!isChef} rows={2} value={card.bio} onChange={e => updCard(card.userId, { bio: e.target.value })} className={`${ta} mt-0.5`} placeholder="Guitariste depuis 15 ans, passionné de blues…" />
                        </div>
                      </div>

                      {/* Controls */}
                      {isChef && (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <button onClick={() => moveCard(card.userId, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-lg leading-none">↑</button>
                          <button onClick={() => moveCard(card.userId, 1)} disabled={idx === sortedCards.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-lg leading-none">↓</button>
                          <button onClick={() => updCard(card.userId, { show: !card.show })} className={`text-xs font-medium mt-1 ${card.show ? 'text-green-600' : 'text-gray-400'}`} title="Afficher/masquer">
                            {card.show ? '👁' : '🙈'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Options ── */}
        {tab === 'options' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-base font-semibold text-gray-900">Sections & réseaux sociaux</h2>

            {/* Concerts */}
            <div className="p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input disabled={!isChef} type="checkbox" checked={page.showConcerts} onChange={e => setPage(p => ({ ...p, showConcerts: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-900">🎭 Afficher les prochains concerts</p>
                  <p className="text-xs text-gray-400">Alimenté automatiquement depuis vos concerts</p>
                </div>
              </label>
            </div>

            {/* Contact */}
            <div className="p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input disabled={!isChef} type="checkbox" checked={page.showContact} onChange={e => setPage(p => ({ ...p, showContact: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-900">✉️ Afficher le formulaire de contact</p>
                  <p className="text-xs text-gray-400">Les visiteurs peuvent vous envoyer un message</p>
                </div>
              </label>
              {page.showContact && (
                <Field label="Titre de la section contact" hint="(optionnel)">
                  <input disabled={!isChef} value={page.contactTitle} onChange={e => setPage(p => ({ ...p, contactTitle: e.target.value }))} className={inp} placeholder="Nous contacter" />
                </Field>
              )}
            </div>

            {/* Social links */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Réseaux sociaux</p>
              {([
                { key: 'instagram', icon: '📷', label: 'Instagram', placeholder: '@mongroupe' },
                { key: 'facebook',  icon: '📘', label: 'Facebook',  placeholder: 'mongroupe ou URL complète' },
                { key: 'youtube',   icon: '▶️',  label: 'YouTube',   placeholder: '@mongroupe ou URL' },
                { key: 'spotify',   icon: '🎵', label: 'Spotify',   placeholder: 'URL artiste Spotify' },
                { key: 'website',   icon: '🌐', label: 'Site web',  placeholder: 'https://mongroupe.fr' },
              ] as const).map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-6 text-lg flex-shrink-0">{s.icon}</span>
                  <input
                    disabled={!isChef}
                    value={(page as any)[s.key]}
                    onChange={e => setPage(p => ({ ...p, [s.key]: e.target.value }))}
                    className={inp}
                    placeholder={s.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* URL bar */}
      {slugInput && !slugError && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-indigo-700">
            {page.published ? '🟢 Page publiée :' : '🟡 Brouillon :'}
          </span>
          <a href={`/${slugInput}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
            solaupiano.fr/{slugInput}
          </a>
        </div>
      )}
    </div>
  )
}
