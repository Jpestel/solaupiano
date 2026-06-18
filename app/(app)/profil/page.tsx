'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GroupRoleBadge } from '@/components/ui/Badge'
import { GearManager } from './GearManager'
import { formatDateWithDay } from '@/lib/utils'
import { getShape, LOOKS, STAGE_COLORS, DEFAULT_STAGE_COLOR, resolveLook } from '@/components/ui/StageGraphics'
import { ph } from '@/lib/placeholders'

interface Instrument {
  id: number
  name: string
}

interface ProfileData {
  id: number
  name: string
  email: string
  avatarUrl?: string | null
  siteRole: string
  userPlan: string
  accountPlan?: string
  foundedGroupsCount?: number
  groupQuota?: { managed: number; max: number }
  myGroups?: { id: number; name: string; coverUrl?: string | null; groupRole: string; isFounder: boolean }[]
  gusoNumber?: string | null
  weeklyDigestOptOut: boolean
  rehearsalReminderOptOut: boolean
  evaluationReminderOptOut: boolean
  concertTimeReminderOptOut: boolean
  helpBubblesOptOut: boolean
  instruments: { instrument: Instrument }[]
  stats: {
    groupCount: number
    masterCount: number
    nextRehearsal: {
      id: number
      date: string
      location: string
      groupId: number
      group: { name: string }
    } | null
  }
}

interface AvailableGroup {
  id: number
  name: string
  description?: string
  joinRequests: { id: number; status: string }[]
}

// Deterministic gradient CSS style based on name
function getAvatarStyle(name: string): React.CSSProperties {
  const gradients = [
    'linear-gradient(135deg, #a78bfa, #6366f1)',
    'linear-gradient(135deg, #818cf8, #3b82f6)',
    'linear-gradient(135deg, #60a5fa, #06b6d4)',
    'linear-gradient(135deg, #34d399, #14b8a6)',
    'linear-gradient(135deg, #fb7185, #ec4899)',
    'linear-gradient(135deg, #fbbf24, #f97316)',
    'linear-gradient(135deg, #e879f9, #a855f7)',
    'linear-gradient(135deg, #38bdf8, #3b82f6)',
  ]
  const idx = name.charCodeAt(0) % gradients.length
  return { background: gradients[idx] }
}

export default function ProfilPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [instrumentSearch, setInstrumentSearch] = useState('')
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([])
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [requestingGroup, setRequestingGroup] = useState<number | null>(null)
  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [gusoNumber, setGusoNumber] = useState('')
  const [stageFigure, setStageFigure] = useState<string>('p1')
  const [stageColor, setStageColor] = useState<string>(DEFAULT_STAGE_COLOR)
  const [stageName, setStageName] = useState('')
  const [weeklyDigestOptOut, setWeeklyDigestOptOut] = useState(false)
  const [digestSaving, setDigestSaving] = useState(false)
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [newsletterSaving, setNewsletterSaving] = useState(false)
  const [rehearsalReminderOptOut, setRehearsalReminderOptOut] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)
  const [evaluationReminderOptOut, setEvaluationReminderOptOut] = useState(false)
  const [concertTimeReminderOptOut, setConcertTimeReminderOptOut] = useState(false)
  const [concertTimeReminderSaving, setConcertTimeReminderSaving] = useState(false)
  const [helpBubblesOptOut, setHelpBubblesOptOut] = useState(false)
  const [helpBubblesSaving, setHelpBubblesSaving] = useState(false)
  const [imageConsents, setImageConsents] = useState<{ groupId: number; groupName: string; consent: boolean | null }[]>([])
  const [imageConsentSaving, setImageConsentSaving] = useState<number | null>(null)
  const [evalReminderSaving, setEvalReminderSaving] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const fetchData = async () => {
    const [profRes, instrRes, groupsRes] = await Promise.all([
      fetch('/api/profil'),
      fetch('/api/instruments'),
      fetch('/api/groupes/disponibles'),
    ])
    if (profRes.ok) {
      const p: ProfileData = await profRes.json()
      setProfile(p)
      setName(p.name)
      setGusoNumber(p.gusoNumber ?? '')
      setStageFigure(resolveLook((p as { stageFigure?: string }).stageFigure))
      setStageColor((p as { stageColor?: string }).stageColor || DEFAULT_STAGE_COLOR)
      setStageName((p as { stageName?: string }).stageName || '')
      setSelectedIds(p.instruments.map((ui) => ui.instrument.id))
      setWeeklyDigestOptOut(p.weeklyDigestOptOut ?? false)
      setNewsletterSubscribed((p as { newsletterSubscribed?: boolean }).newsletterSubscribed ?? false)
      setRehearsalReminderOptOut(p.rehearsalReminderOptOut ?? false)
      setEvaluationReminderOptOut(p.evaluationReminderOptOut ?? false)
      setConcertTimeReminderOptOut(p.concertTimeReminderOptOut ?? false)
      setHelpBubblesOptOut(p.helpBubblesOptOut ?? false)
    }
    if (instrRes.ok) setInstruments(await instrRes.json())
    if (groupsRes.ok) setAvailableGroups(await groupsRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const toggleInstrument = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    const res = await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instrumentIds: selectedIds, gusoNumber, stageFigure, stageColor, stageName }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur lors de la sauvegarde.')
      return
    }
    // Recharger le profil complet (avec stats) plutôt que d'écraser avec la réponse PATCH (sans stats)
    await fetchData()
    setSuccess('Profil mis à jour avec succès.')
    await update({ name })
  }

  const handleDigestToggle = async (newValue: boolean) => {
    setWeeklyDigestOptOut(newValue)
    setDigestSaving(true)
    await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instrumentIds: selectedIds, weeklyDigestOptOut: newValue }),
    })
    setDigestSaving(false)
  }

  const handleNewsletterToggle = async (newValue: boolean) => {
    setNewsletterSubscribed(newValue)
    setNewsletterSaving(true)
    await fetch('/api/profil/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribe: newValue }),
    })
    setNewsletterSaving(false)
  }

  const handleReminderToggle = async (newValue: boolean) => {
    setRehearsalReminderOptOut(newValue)
    setReminderSaving(true)
    await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instrumentIds: selectedIds, rehearsalReminderOptOut: newValue }),
    })
    setReminderSaving(false)
  }

  const handleEvalReminderToggle = async (newValue: boolean) => {
    setEvaluationReminderOptOut(newValue)
    setEvalReminderSaving(true)
    await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instrumentIds: selectedIds, evaluationReminderOptOut: newValue }),
    })
    setEvalReminderSaving(false)
  }

  const handleConcertTimeReminderToggle = async (newValue: boolean) => {
    setConcertTimeReminderOptOut(newValue)
    setConcertTimeReminderSaving(true)
    await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, instrumentIds: selectedIds, concertTimeReminderOptOut: newValue }),
    })
    setConcertTimeReminderSaving(false)
  }

  const handleHelpBubblesToggle = async (newValue: boolean) => {
    setHelpBubblesOptOut(newValue)
    setHelpBubblesSaving(true)
    await fetch('/api/me/help-bubbles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: newValue }),
    })
    setHelpBubblesSaving(false)
  }

  useEffect(() => {
    fetch('/api/me/image-consent').then((r) => (r.ok ? r.json() : [])).then(setImageConsents).catch(() => {})
  }, [])

  const setImageConsent = async (groupId: number, value: boolean) => {
    setImageConsentSaving(groupId)
    const res = await fetch('/api/me/image-consent', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, consent: value }),
    })
    setImageConsentSaving(null)
    if (res.ok) setImageConsents((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, consent: value } : g)))
  }

  const handleJoinRequest = async (groupId: number) => {
    setRequestingGroup(groupId)
    const res = await fetch(`/api/groupes/${groupId}/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setRequestingGroup(null)
    if (res.ok) await fetchData()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Le fichier doit être une image (JPG, PNG, WebP…)')
      return
    }
    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setAvatarUploading(true)
    setAvatarError('')
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch('/api/profil/avatar', { method: 'POST', body: formData })
    setAvatarUploading(false)
    if (!res.ok) {
      const d = await res.json()
      setAvatarError(d.error || 'Erreur lors de l\'upload.')
      setAvatarPreview(null)
      return
    }
    const { avatarUrl } = await res.json()
    setProfile((prev) => prev ? { ...prev, avatarUrl } : prev)
    setAvatarPreview(null)
    await update({})
    router.refresh()
  }

  const handleAvatarDelete = async () => {
    if (!confirm('Supprimer la photo de profil ?')) return
    setAvatarUploading(true)
    await fetch('/api/profil/avatar', { method: 'DELETE' })
    setAvatarUploading(false)
    setProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev)
    await update({})
    router.refresh()
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword !== confirmPassword) {
      setPwError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    setPwSaving(true)
    const res = await fetch('/api/profil/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setPwSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setPwError(d.error || 'Erreur lors du changement de mot de passe.')
      return
    }
    setPwSuccess('Mot de passe modifié avec succès.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }
  if (!profile) return null

  const avatarStyle = getAvatarStyle(profile.name)
  const isAdmin = profile.siteRole === 'ADMIN'

  const statusLabel: Record<string, { label: string; className: string }> = {
    PENDING:  { label: 'En attente',  className: 'bg-yellow-100 text-yellow-700' },
    ACCEPTED: { label: 'Acceptée',    className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Refusée',     className: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles et vos préférences.</p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar — cliquable pour modifier */}
          <div className="relative flex-shrink-0 group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/30 focus:outline-none"
              title="Changer la photo de profil"
            >
              {avatarPreview || profile.avatarUrl ? (
                <img
                  src={avatarPreview || profile.avatarUrl!}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  style={avatarStyle}
                  className="w-full h-full flex items-center justify-center text-white font-bold text-3xl"
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {avatarUploading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                }
              </div>
            </button>
            {/* Supprimer si photo existante */}
            {profile.avatarUrl && !avatarUploading && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                title="Supprimer la photo"
              >
                ✕
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            {avatarError && (
              <p className="text-xs text-red-200 bg-red-500/30 rounded-lg px-3 py-1.5 mb-2">{avatarError}</p>
            )}
            {!profile.avatarUrl && !avatarPreview && (
              <p className="text-xs text-indigo-200 mb-1.5">
                📷 <button type="button" onClick={() => fileInputRef.current?.click()} className="underline hover:text-white transition-colors">Ajouter une photo</button>
              </p>
            )}
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isAdmin ? 'bg-purple-200/40 text-white' : 'bg-white/20 text-white'
              }`}>
                {isAdmin ? '⚡ Administrateur' : '🎵 Musicien'}
              </span>
              {profile.instruments.length > 0 && (
                <span className="text-xs text-indigo-200">
                  {profile.instruments.slice(0, 3).map((ui) => ui.instrument.name).join(', ')}
                  {profile.instruments.length > 3 && ` +${profile.instruments.length - 3}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {!isAdmin && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.stats.groupCount}</p>
              <p className="text-xs text-indigo-200 mt-0.5">Groupe{profile.stats.groupCount > 1 ? 's' : ''}</p>
            </div>
            <div className="text-center border-x border-white/20">
              <p className="text-2xl font-bold">{profile.stats.masterCount}</p>
              <p className="text-xs text-indigo-200 mt-0.5">Morceaux maîtrisés</p>
            </div>
            <div className="text-center">
              {profile.stats.nextRehearsal ? (
                <>
                  <Link
                    href={`/groupes/${profile.stats.nextRehearsal.groupId}/repetitions/${profile.stats.nextRehearsal.id}`}
                    className="block hover:opacity-80 transition-opacity"
                  >
                    <p className="text-sm font-semibold capitalize leading-tight">
                      {formatDateWithDay(profile.stats.nextRehearsal.date).split(' ').slice(0, 2).join(' ')}
                    </p>
                    <p className="text-xs text-indigo-200 mt-0.5 truncate">{profile.stats.nextRehearsal.group.name}</p>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">–</p>
                  <p className="text-xs text-indigo-200 mt-0.5">Prochaine répét.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="space-y-6">

          {/* Profile form */}
          <Card>
            <CardHeader title="Informations" />
            <form onSubmit={handleSave} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  <span>✓</span> {success}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <span>✕</span> {error}
                </div>
              )}

              <div>
                <label className="form-label">Nom complet</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Nom de scène <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="form-input"
                  placeholder={name || ph('profil_stagename')}
                  maxLength={40}
                />
                <p className="text-xs text-gray-400 mt-1">Affiché sur les plans de scène. Laissez vide pour utiliser votre nom.</p>
              </div>

              <div>
                <label className="form-label">Mon personnage (plan de scène)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LOOKS.map((key) => {
                    const sh = getShape(key)
                    const active = stageFigure === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStageFigure(key)}
                        className={`rounded-xl border-2 p-1.5 transition-colors ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                        title="Choisir ce look"
                      >
                        <div style={{ width: 28, height: 38 }}>{sh.draw(stageColor)}</div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStageColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${stageColor === c ? 'border-gray-800 scale-110' : 'border-white shadow'}`}
                      style={{ background: c }}
                      title="Choisir cette couleur"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Choisissez votre allure et votre couleur : c&apos;est ainsi que vous apparaîtrez sur les plans de scène.</p>
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="form-input bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">L&apos;email ne peut pas être modifié.</p>
              </div>

              {!isAdmin && (
                <div>
                  <label className="form-label flex items-center gap-1.5">
                    Numéro GUSO
                    <span className="text-xs text-gray-400 font-normal">(optionnel)</span>
                    <span className="relative group">
                      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold inline-flex items-center justify-center cursor-help hover:bg-indigo-100 hover:text-indigo-600 transition-colors select-none">?</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-xl
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50
                        pointer-events-none group-hover:pointer-events-auto whitespace-normal font-normal leading-relaxed">
                        <span className="font-semibold">GUSO</span> — Guichet Unique du Spectacle Occasionnel. Identifiant officiel pour les artistes et techniciens du spectacle vivant en France.
                        <a href="https://www.guso.fr" target="_blank" rel="noreferrer"
                          className="block mt-2 text-indigo-300 underline hover:text-indigo-200 transition-colors">
                          En savoir plus sur guso.fr →
                        </a>
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={gusoNumber}
                    onChange={(e) => setGusoNumber(e.target.value)}
                    className="form-input"
                    placeholder={ph('profil_1')}
                  />
                </div>
              )}

              {!isAdmin && instruments.length > 0 && (() => {
                const selectedInstr = instruments.filter((i) => selectedIds.includes(i.id))
                const q = instrumentSearch.trim().toLowerCase()
                const filtered = instruments.filter((i) => i.name.toLowerCase().includes(q))
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="form-label mb-0">Instrument(s)</label>
                      {selectedInstr.length > 0 && (
                        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 rounded-full px-2 py-0.5">
                          {selectedInstr.length} sélectionné{selectedInstr.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Puces sélectionnées */}
                    {selectedInstr.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedInstr.map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => toggleInstrument(i.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                            title="Retirer"
                          >
                            {i.name}
                            <span className="opacity-70" aria-hidden>✕</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recherche */}
                    <input
                      type="text"
                      value={instrumentSearch}
                      onChange={(e) => setInstrumentSearch(e.target.value)}
                      className="form-input"
                      placeholder={ph('profil_2')}
                    />

                    {/* Liste filtrée bornée */}
                    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                      {filtered.length > 0 ? (
                        filtered.map((instr) => {
                          const selected = selectedIds.includes(instr.id)
                          return (
                            <button
                              key={instr.id}
                              type="button"
                              onClick={() => toggleInstrument(instr.id)}
                              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                                selected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                                selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {selected && (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </span>
                              {instr.name}
                            </button>
                          )
                        })
                      ) : (
                        <p className="px-2.5 py-3 text-sm text-gray-400">Aucun instrument trouvé.</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="pt-1">
                <Button type="submit" disabled={saving} fullWidth>
                  {saving ? 'Enregistrement...' : 'Sauvegarder les modifications'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Password change */}
          <Card>
            <CardHeader title="Mot de passe" subtitle="Modifiez votre mot de passe de connexion." />
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {pwSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  <span>✓</span> {pwSuccess}
                </div>
              )}
              {pwError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <span>✕</span> {pwError}
                </div>
              )}

              <div>
                <label className="form-label">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="form-input pr-10"
                    placeholder={ph('profil_3')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPasswords ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="form-input"
                  placeholder={ph('profil_4')}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="form-label">Confirmer le nouveau mot de passe</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`form-input ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-300 focus:ring-red-300'
                      : ''
                  }`}
                  placeholder={ph('profil_5')}
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwSaving || (!!confirmPassword && confirmPassword !== newPassword)}
                  className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {pwSaving ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader title="Notifications" subtitle="Gérez les emails que vous recevez de Sol au piano." />
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Résumé hebdomadaire</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reçu chaque vendredi si vous ne vous êtes pas connecté(e) depuis 7 jours — grilles, fichiers, morceaux ajoutés et prochaines répétitions.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!weeklyDigestOptOut}
                  onClick={() => handleDigestToggle(!weeklyDigestOptOut)}
                  disabled={digestSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    !weeklyDigestOptOut ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !weeklyDigestOptOut ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">📬 Newsletter</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Nouveautés de la plateforme, astuces et conseils pour les groupes. Désinscription possible à tout moment.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={newsletterSubscribed}
                  onClick={() => handleNewsletterToggle(!newsletterSubscribed)}
                  disabled={newsletterSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    newsletterSubscribed ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${newsletterSubscribed ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Rappels de répétition automatiques</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reçu automatiquement 5 jours avant chaque répétition à laquelle vous êtes invité(e).
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!rehearsalReminderOptOut}
                  onClick={() => handleReminderToggle(!rehearsalReminderOptOut)}
                  disabled={reminderSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    !rehearsalReminderOptOut ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !rehearsalReminderOptOut ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Rappels d&apos;auto-évaluation</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reçu le lendemain d&apos;une répétition à laquelle vous étiez présent(e), si vous n&apos;avez pas encore laissé d&apos;évaluation.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!evaluationReminderOptOut}
                  onClick={() => handleEvalReminderToggle(!evaluationReminderOptOut)}
                  disabled={evalReminderSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    !evaluationReminderOptOut ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !evaluationReminderOptOut ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Relance « heure de concert manquante » (chef)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Si vous êtes chef d&apos;un groupe : relance à l&apos;approche d&apos;un concert dont l&apos;heure de début n&apos;est pas renseignée, puis tous les 2 jours jusqu&apos;à ce que vous la saisissiez.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!concertTimeReminderOptOut}
                  onClick={() => handleConcertTimeReminderToggle(!concertTimeReminderOptOut)}
                  disabled={concertTimeReminderSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    !concertTimeReminderOptOut ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !concertTimeReminderOptOut ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                Les emails transactionnels (ajout à un groupe, mot de passe) sont toujours envoyés.
              </p>
            </div>
          </Card>

          {/* Affichage */}
          <Card>
            <CardHeader title="Affichage" subtitle="Personnalisez votre expérience de navigation." />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">💡 Bulles d&apos;aide</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Petites astuces contextuelles affichées sur les pages pour vous guider. Désactivez-les si vous préférez une interface épurée.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!helpBubblesOptOut}
                onClick={() => handleHelpBubblesToggle(!helpBubblesOptOut)}
                disabled={helpBubblesSaving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                  !helpBubblesOptOut ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !helpBubblesOptOut ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* Droit à l'image */}
          {imageConsents.length > 0 && (
            <Card>
              <CardHeader title="Droit à l'image" subtitle="Autorisez ou non la diffusion de votre visage (photos/vidéos) sur les réseaux sociaux, groupe par groupe." />
              <div className="space-y-3">
                {imageConsents.map((g) => (
                  <div key={g.groupId} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">📸 {g.groupName}</p>
                      <p className="text-xs mt-0.5">
                        {g.consent === true ? <span className="text-green-600 font-medium">Vous avez accepté</span>
                          : g.consent === false ? <span className="text-red-600 font-medium">Vous avez refusé</span>
                          : <span className="text-gray-400">Pas encore répondu</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setImageConsent(g.groupId, true)}
                        disabled={imageConsentSaving === g.groupId}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${g.consent === true ? 'bg-green-600 text-white' : 'border border-green-300 text-green-700 hover:bg-green-50'}`}
                      >✓ J&apos;accepte</button>
                      <button
                        onClick={() => setImageConsent(g.groupId, false)}
                        disabled={imageConsentSaving === g.groupId}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${g.consent === false ? 'bg-red-600 text-white' : 'border border-red-300 text-red-600 hover:bg-red-50'}`}
                      >✗ Je refuse</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Plan — hidden for admins */}
          {!isAdmin && (
            <Card>
              <CardHeader title="Mon compte" subtitle="Tout est inclus : vous décidez au fil de l'eau." />
              {(() => {
                return (
                  <>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2"><span className="text-indigo-500 flex-shrink-0">✓</span> Jouer en solo : votre répertoire, vos accords, vos outils.</li>
                      <li className="flex items-start gap-2"><span className="text-indigo-500 flex-shrink-0">✓</span> Rejoindre des groupes sur invitation ou par candidature.</li>
                      <li className="flex items-start gap-2"><span className="text-indigo-500 flex-shrink-0">✓</span> Créer et gérer votre propre groupe ou votre classe.</li>
                      <li className="flex items-start gap-2"><span className="text-indigo-500 flex-shrink-0">✓</span> Enseigner et suivre vos élèves, ou rejoindre les cours d'un prof.</li>
                    </ul>

                    {/* Quota de groupes gérables — selon le meilleur plan de vos groupes */}
                    {profile.groupQuota && (
                      <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                        <p className="text-sm font-semibold text-indigo-900">
                          Plan {(profile.accountPlan ?? 'FREE') === 'FREE' ? 'Gratuit' : profile.accountPlan} · Groupes gérés : {profile.groupQuota.managed} / {profile.groupQuota.max}
                        </p>
                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                          {profile.groupQuota.max > 1
                            ? `Votre plan vous permet de gérer jusqu'à ${profile.groupQuota.max} groupes.`
                            : 'Le plan Gratuit permet de gérer 1 groupe. Pour en gérer plusieurs, il faut un plan Pro ou Premium (contactez l’administrateur ou voyez les tarifs).'}{' '}
                          <Link href="/tarifs" className="underline underline-offset-2 font-medium">Voir les tarifs →</Link>
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </Card>
          )}

          {/* Mon matériel */}
          {!isAdmin && (
            <Card>
              <CardHeader title="🎚️ Mon matériel" subtitle="Votre setup complet de musicien." />
              <GearManager />
            </Card>
          )}

          {/* Mes groupes & rôles */}
          {!isAdmin && (profile.myGroups?.length ?? 0) > 0 && (
            <Card>
              <CardHeader title="Mes rôles" subtitle="Votre rôle dans chacun de vos groupes." />
              <div className="space-y-2">
                {profile.myGroups!.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groupes/${g.id}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                      {g.coverUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                        : g.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate flex-1 min-w-0">{g.name}</span>
                    <GroupRoleBadge groupRole={g.groupRole} isFounder={g.isFounder} />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Join a group */}
          {!isAdmin && availableGroups.length > 0 && (
            <Card>
              <CardHeader
                title="Rejoindre un groupe"
                subtitle="Envoyez une demande au chef de groupe"
              />
              <div className="space-y-3">
                {availableGroups.map((group) => {
                  const req = group.joinRequests[0]
                  return (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {req ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusLabel[req.status]?.className}`}>
                            {statusLabel[req.status]?.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleJoinRequest(group.id)}
                            disabled={requestingGroup === group.id}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                          >
                            {requestingGroup === group.id ? '...' : 'Demander'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Empty state for right column if admin */}
          {isAdmin && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-4xl mb-3">⚡</p>
              <p className="text-sm font-medium text-gray-700">Compte Administrateur</p>
              <p className="text-xs text-gray-500 mt-1">Vous avez accès à l&apos;ensemble des fonctionnalités de la plateforme.</p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 mt-4 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
              >
                Accéder à l&apos;admin →
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
