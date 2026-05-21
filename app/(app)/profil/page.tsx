'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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
}

interface AvailableGroup {
  id: number
  name: string
  description?: string
  joinRequests: { id: number; status: string }[]
}

export default function ProfilPage() {
  const { data: session, update } = useSession()
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
    if (res.ok) {
      await fetchData()
    }
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!profile) return null

  const statusLabel: Record<string, { label: string; className: string }> = {
    PENDING:  { label: 'En attente',  className: 'bg-yellow-100 text-yellow-700' },
    ACCEPTED: { label: 'Acceptée',    className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Refusée',     className: 'bg-red-100 text-red-700' },
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles.</p>
      </div>

      <div className="max-w-lg space-y-6">

        {/* User plan — hidden for admins */}
        {profile.siteRole !== 'ADMIN' && (
          <Card>
            <CardHeader title="Mon plan" subtitle="Choisissez comment vous utilisez Solaupiano." />
            {planSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{planSuccess}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'MUSICIEN', icon: '🎵', label: 'Musicien', desc: 'Je rejoins des groupes existants', badge: 'Gratuit' },
                { value: 'CREATEUR', icon: '🎼', label: 'Créateur', desc: 'Je crée et gère mon groupe', badge: 'Gratuit' },
              ] as const).map((opt) => {
                const isActive = profile.userPlan === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={planSaving || isActive}
                    onClick={() => handlePlanChange(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all disabled:cursor-default ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">Plan actuel</span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              ⚠️ Passer en plan Musicien vous empêchera de créer de nouveaux groupes.
            </p>
          </Card>
        )}

        {/* Profile form */}
        <Card>
          <CardHeader title="Informations" />

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                profile.siteRole === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {profile.siteRole === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
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
            </div>

            {profile.siteRole !== 'ADMIN' && instruments.length > 0 && (
              <div>
                <label className="form-label">Instrument(s)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {instruments.map((instr) => (
                    <button
                      key={instr.id}
                      type="button"
                      onClick={() => toggleInstrument(instr.id)}
                      className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                        selectedIds.includes(instr.id)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {instr.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={saving} fullWidth>
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Join a group — hidden for admins */}
        {profile.siteRole !== 'ADMIN' && availableGroups.length > 0 && (
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
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
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

      </div>
    </div>
  )
}
