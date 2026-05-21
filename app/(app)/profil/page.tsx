'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDateWithDay } from '@/lib/utils'

interface Instrument {
  id: number
  name: string
}

interface ProfileData {
  id: number
  name: string
  email: string
  siteRole: string
  userPlan: string
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

// Deterministic gradient based on name
function getAvatarGradient(name: string) {
  const gradients = [
    'from-violet-400 to-indigo-500',
    'from-indigo-400 to-blue-500',
    'from-blue-400 to-cyan-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-fuchsia-400 to-purple-500',
    'from-sky-400 to-blue-500',
  ]
  const idx = name.charCodeAt(0) % gradients.length
  return gradients[idx]
}

export default function ProfilPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([])
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [requestingGroup, setRequestingGroup] = useState<number | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planSuccess, setPlanSuccess] = useState('')

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
      setSelectedIds(p.instruments.map((ui) => ui.instrument.id))
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
      body: JSON.stringify({ name, instrumentIds: selectedIds }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur lors de la sauvegarde.')
      return
    }
    const updated = await res.json()
    setProfile(updated)
    setSuccess('Profil mis à jour avec succès.')
    await update({ name })
  }

  const handlePlanChange = async (newPlan: 'MUSICIEN' | 'CREATEUR') => {
    if (!profile || profile.userPlan === newPlan) return
    setPlanSaving(true)
    setPlanSuccess('')
    const res = await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile.name, instrumentIds: selectedIds, userPlan: newPlan }),
    })
    setPlanSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setPlanSuccess('Plan mis à jour avec succès.')
      await update({ userPlan: newPlan })
    }
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

  const gradient = getAvatarGradient(profile.name)
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
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 ring-white/30 flex-shrink-0`}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isAdmin ? 'bg-purple-200/40 text-white' : 'bg-white/20 text-white'
              }`}>
                {isAdmin ? '⚡ Administrateur' : profile.userPlan === 'CREATEUR' ? '🎼 Créateur' : '🎵 Musicien'}
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
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="form-input bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">L&apos;email ne peut pas être modifié.</p>
              </div>

              {!isAdmin && instruments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Instrument(s)</label>
                    {selectedIds.length > 0 && (
                      <span className="text-xs text-indigo-600 font-medium bg-indigo-50 rounded-full px-2 py-0.5">
                        {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {instruments.map((instr) => {
                      const selected = selectedIds.includes(instr.id)
                      return (
                        <button
                          key={instr.id}
                          type="button"
                          onClick={() => toggleInstrument(instr.id)}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                            selected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          {selected && <span className="mr-1 text-xs">✓</span>}
                          {instr.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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
                    placeholder="••••••••"
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
                  placeholder="8 caractères minimum"
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
                  placeholder="••••••••"
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

        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Plan — hidden for admins */}
          {!isAdmin && (
            <Card>
              <CardHeader title="Mon plan" subtitle="Choisissez comment vous utilisez Solaupiano." />
              {planSuccess && (
                <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  ✓ {planSuccess}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    value: 'MUSICIEN',
                    icon: '🎵',
                    label: 'Musicien',
                    desc: 'Je rejoins des groupes existants',
                    badge: 'Gratuit',
                  },
                  {
                    value: 'CREATEUR',
                    icon: '🎼',
                    label: 'Créateur',
                    desc: 'Je crée et gère mon groupe',
                    badge: 'Gratuit',
                  },
                ] as const).map((opt) => {
                  const isActive = profile.userPlan === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={planSaving || isActive}
                      onClick={() => handlePlanChange(opt.value)}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all disabled:cursor-default ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                      {isActive ? (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          ✓ Plan actuel
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                Passer en plan Musicien vous empêchera de créer de nouveaux groupes.
              </p>
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
