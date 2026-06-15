'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PLANS, GroupPlan, formatBytes, storagePercent, storageLabel } from '@/lib/plans'
import { MUSIC_GENRES } from '@/lib/genres'
import { ph } from '@/lib/placeholders'

interface User {
  id: number
  name: string
  email: string
  siteRole: string
}

interface Group {
  id: number
  name: string
  description?: string
  style?: string | null
  isPublic: boolean
  isHidden: boolean
  plan: GroupPlan
  planExpiresAt: string | null
  storageUsedBytes: string // BigInt serialised as string by JSON
  createdAt: string
  maxMembersOverride: number | null
  planMaxMembersPerGroup: number | null
  storageQuotaOverrideGb: number | null
  planStorageGb: number
  archivedAt: string | null
  _count: { members: number; rehearsals: number; concerts: number; songs: number; setlists: number; chordCharts: number }
  members: { user: User; groupRole: string }[]
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  PRO: 'bg-indigo-100 text-indigo-700',
  PREMIUM: 'bg-purple-100 text-purple-700',
}

export default function AdminGroupesPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', chefId: '', isPublic: true })
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', style: '', isPublic: true, isHidden: false, plan: 'FREE' as string })
  const [planGiftOpen, setPlanGiftOpen] = useState<Group | null>(null)
  const [giftForm, setGiftForm] = useState({ plan: 'FREE', expiresAt: '' })
  const [memberLimitOpen, setMemberLimitOpen] = useState<Group | null>(null)
  const [memberLimitValue, setMemberLimitValue] = useState<string>('')
  const [storageQuotaOpen, setStorageQuotaOpen] = useState<Group | null>(null)
  const [storageQuotaValue, setStorageQuotaValue] = useState<string>('')
  const [planSaving, setPlanSaving] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [removeGroup, setRemoveGroup] = useState<Group | null>(null)
  const router = useRouter()

  const fetchData = async () => {
    const [grpRes, usrRes] = await Promise.all([
      fetch('/api/admin/groupes'),
      fetch('/api/admin/utilisateurs'),
    ])
    if (grpRes.ok) setGroups(await grpRes.json())
    if (usrRes.ok) setUsers(await usrRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/groupes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        chefId: Number(form.chefId),
        isPublic: form.isPublic,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setModalOpen(false)
    setForm({ name: '', description: '', chefId: '', isPublic: true })
    fetchData()
  }

  const openEdit = (group: Group) => {
    setEditGroup(group)
    setEditForm({ name: group.name, description: group.description || '', style: group.style || '', isPublic: group.isPublic, isHidden: group.isHidden ?? false, plan: group.plan || 'FREE' })
    setError('')
  }

  const openGift = (group: Group) => {
    setPlanGiftOpen(group)
    const expiry = group.planExpiresAt ? new Date(group.planExpiresAt).toISOString().split('T')[0] : ''
    setGiftForm({ plan: group.plan || 'FREE', expiresAt: expiry })
    setError('')
  }

  const openMemberLimit = (group: Group) => {
    setMemberLimitOpen(group)
    setMemberLimitValue(group.maxMembersOverride !== null ? String(group.maxMembersOverride) : '')
    setError('')
  }

  const openStorageQuota = (group: Group) => {
    setStorageQuotaOpen(group)
    setStorageQuotaValue(group.storageQuotaOverrideGb !== null ? String(group.storageQuotaOverrideGb) : '')
    setError('')
  }

  const handleStorageQuotaSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storageQuotaOpen) return
    setSaving(true)
    setError('')
    const override = storageQuotaValue.trim() === '' ? null : Number(storageQuotaValue)
    if (override !== null && (isNaN(override) || override < 1)) {
      setError('Le quota doit être un entier ≥ 1 Go.')
      setSaving(false)
      return
    }
    const res = await fetch(`/api/admin/groupes/${storageQuotaOpen.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageQuotaOverrideGb: override }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setStorageQuotaOpen(null)
    fetchData()
  }

  const handleMemberLimitSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberLimitOpen) return
    setSaving(true)
    setError('')
    const override = memberLimitValue.trim() === '' ? null : Number(memberLimitValue)
    const res = await fetch(`/api/admin/groupes/${memberLimitOpen.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxMembersOverride: override }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setMemberLimitOpen(null)
    fetchData()
  }

  const handleGiftSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planGiftOpen) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/groupes/${planGiftOpen.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: giftForm.plan,
        planExpiresAt: giftForm.expiresAt || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setPlanGiftOpen(null)
    fetchData()
  }

  const handlePlanChange = async (groupId: number, plan: GroupPlan) => {
    setPlanSaving(groupId)
    await fetch(`/api/admin/groupes/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, planExpiresAt: null }),
    })
    setPlanSaving(null)
    fetchData()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGroup) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${editGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Erreur.')
      return
    }
    setEditGroup(null)
    fetchData()
  }

  const handleDeleteForever = async (id: number) => {
    await fetch(`/api/admin/groupes/${id}`, { method: 'DELETE' })
    setRemoveGroup(null)
    fetchData()
    router.refresh() // vide le cache des pages serveur (tableau de bord, etc.)
  }
  // Démarre un aperçu « voir en tant que » puis ouvre le groupe côté usage.
  const startPreview = async (group: Group, role: 'CHEF' | 'MEMBRE') => {
    const res = await fetch('/api/admin/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: group.id, role }),
    })
    if (res.ok) window.location.href = `/groupes/${group.id}`
    else setError('Impossible de démarrer l’aperçu.')
  }

  const handleArchive = async (id: number, archive: boolean) => {
    await fetch(`/api/admin/groupes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archive }),
    })
    setRemoveGroup(null)
    fetchData()
    router.refresh()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groupes</h1>
          <p className="text-gray-500 mt-1">{groups.length} groupe{groups.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Créer un groupe</Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 text-center py-8">Aucun groupe créé.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Groupe</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Visibilité</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Stockage</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Chef d'orchestre</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Membres / Limite</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group: any) => {
                  const chef = group.members.find((m: any) => m.groupRole === 'CHEF')
                  const plan: GroupPlan = group.plan || 'FREE'
                  const usedBytes = Number(group.storageUsedBytes || 0)
                  const effectiveStorageGb = group.storageQuotaOverrideGb !== null
                    ? group.storageQuotaOverrideGb
                    : (group.planStorageGb ?? 0)
                  const pct = storagePercent(usedBytes, effectiveStorageGb)
                  return (
                    <tr key={group.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {group.name}
                          {group.archivedAt && <span className="text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5">📦 Archivé</span>}
                        </p>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          group.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {group.isPublic ? '🌐 Public' : '🔒 Privé'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={plan}
                            disabled={planSaving === group.id}
                            onChange={(e) => handlePlanChange(group.id, e.target.value as GroupPlan)}
                            className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${PLAN_COLORS[plan] ?? 'bg-indigo-100 text-indigo-700'}`}
                          >
                            {(Object.keys(PLANS) as GroupPlan[]).map((p) => (
                              <option key={p} value={p}>{PLANS[p].label}</option>
                            ))}
                          </select>
                          {group.planExpiresAt && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${
                              new Date(group.planExpiresAt) < new Date()
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              🎁 exp. {new Date(group.planExpiresAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[100px]">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{formatBytes(usedBytes)}</span>
                            <span className="flex items-center gap-1">
                              {group.storageQuotaOverrideGb !== null && (
                                <span className="text-[9px] font-bold bg-violet-100 text-violet-700 rounded-full px-1.5">override {group.storageQuotaOverrideGb} Go</span>
                              )}
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{effectiveStorageGb > 0 ? storageLabel(effectiveStorageGb) : 'Aucun stockage'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {chef ? (
                          <span className="text-sm text-gray-700">{chef.user.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const count = group._count.members
                          const planLimit = group.planMaxMembersPerGroup ?? null
                          const effectiveLimit = group.maxMembersOverride ?? planLimit ?? null
                          const atLimit = effectiveLimit !== null && count >= effectiveLimit
                          const nearLimit = effectiveLimit !== null && count >= effectiveLimit * 0.8
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-medium ${atLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
                                  {count}{effectiveLimit !== null ? ` / ${effectiveLimit}` : ''}
                                </span>
                                {group.maxMembersOverride !== null && (
                                  <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-full px-1.5 py-0.5">override</span>
                                )}
                                {atLimit && <span className="text-[10px] font-semibold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">complet</span>}
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <a
                            href={`/groupes/${group.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Voir
                          </a>
                          <button
                            onClick={() => startPreview(group, 'CHEF')}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700"
                            title="Voir ce groupe comme un chef (lecture seule)"
                          >
                            👁 Chef
                          </button>
                          <button
                            onClick={() => startPreview(group, 'MEMBRE')}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700"
                            title="Voir ce groupe comme un musicien (lecture seule)"
                          >
                            👁 Musicien
                          </button>
                          <a
                            href={`/groupes/${group.id}#permissions`}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700"
                            title="Configurer les permissions des co-chefs"
                          >
                            ⚙️ Permissions
                          </a>
                          <button
                            onClick={() => openEdit(group)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => openGift(group)}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700"
                            title="Offrir un plan"
                          >
                            🎁 Offrir
                          </button>
                          <button
                            onClick={() => openMemberLimit(group)}
                            className="text-xs font-medium text-violet-600 hover:text-violet-700"
                            title="Configurer la limite de membres"
                          >
                            👥 Limite
                          </button>
                          <button
                            onClick={() => openStorageQuota(group)}
                            className="text-xs font-medium text-cyan-600 hover:text-cyan-700"
                            title="Configurer le quota de stockage individuel"
                          >
                            💾 Stockage
                          </button>
                          {group.archivedAt ? (
                            <button
                              onClick={() => handleArchive(group.id, false)}
                              className="text-xs font-medium text-green-600 hover:text-green-700"
                              title="Réactiver le groupe"
                            >
                              ♻️ Restaurer
                            </button>
                          ) : null}
                          <button
                            onClick={() => setRemoveGroup(group)}
                            className="text-xs font-medium text-red-600 hover:text-red-500"
                          >
                            {group.archivedAt ? 'Supprimer déf.' : 'Retirer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 👥 Member limit modal */}
      <Modal isOpen={!!memberLimitOpen} onClose={() => setMemberLimitOpen(null)} title={`👥 Limite de membres — ${memberLimitOpen?.name}`}>
        <form onSubmit={handleMemberLimitSave} className="space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          {/* Context info */}
          {memberLimitOpen && (() => {
            const planLimit = memberLimitOpen.planMaxMembersPerGroup ?? null
            const currentCount = memberLimitOpen._count.members
            const effectiveLimit = memberLimitOpen.maxMembersOverride ?? planLimit
            return (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Membres actuels</span>
                  <span className="font-semibold text-gray-900">{currentCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Limite du plan ({memberLimitOpen.plan})</span>
                  <span className="font-medium text-gray-700">{planLimit ?? <em className="text-gray-400">illimitée</em>}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Limite effective actuelle</span>
                  <span className={`font-semibold ${effectiveLimit !== null ? 'text-violet-700' : 'text-gray-400'}`}>
                    {effectiveLimit !== null ? effectiveLimit : 'illimitée'}
                  </span>
                </div>
              </div>
            )
          })()}

          <div>
            <label className="form-label">
              Limite personnalisée <span className="text-gray-400 font-normal">(override admin)</span>
            </label>
            <input
              type="number"
              min="1"
              value={memberLimitValue}
              onChange={(e) => setMemberLimitValue(e.target.value)}
              placeholder={`Par défaut du plan : ${memberLimitOpen?.planMaxMembersPerGroup ?? 'illimité'}`}
              className="form-input"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Laisser vide pour utiliser la limite définie par le plan. Saisir un nombre pour imposer une limite différente (à la hausse ou à la baisse).
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-800 space-y-1">
            <p><strong>🔒 Application :</strong> la limite est vérifiée à chaque ajout de membre (invitation, demande d&apos;adhésion).</p>
            <p><strong>👑 Admins :</strong> les administrateurs du site contournent toujours la limite.</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {memberLimitValue !== '' && (
              <button
                type="button"
                onClick={() => setMemberLimitValue('')}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                ✕ Supprimer l&apos;override (revenir au plan)
              </button>
            )}
            <div className={`flex gap-3 ${memberLimitValue !== '' ? '' : 'ml-auto'}`}>
              <Button type="button" variant="secondary" onClick={() => setMemberLimitOpen(null)}>Annuler</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 💾 Storage quota modal */}
      <Modal isOpen={!!storageQuotaOpen} onClose={() => setStorageQuotaOpen(null)} title={`💾 Quota de stockage — ${storageQuotaOpen?.name}`}>
        <form onSubmit={handleStorageQuotaSave} className="space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          {storageQuotaOpen && (() => {
            const usedBytes = Number(storageQuotaOpen.storageUsedBytes || 0)
            const planGb = (storageQuotaOpen as any).planStorageGb ?? 0
            return (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Stockage utilisé (ce groupe)</span>
                  <span className="font-semibold text-gray-900">{formatBytes(usedBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quota du plan ({storageQuotaOpen.plan})</span>
                  <span className="font-medium text-gray-700">{planGb > 0 ? storageLabel(planGb) : 'Aucun'}</span>
                </div>
                {storageQuotaOpen.storageQuotaOverrideGb !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Override actuel</span>
                    <span className="font-semibold text-violet-700">{storageQuotaOpen.storageQuotaOverrideGb} Go</span>
                  </div>
                )}
              </div>
            )
          })()}

          <div>
            <label className="form-label">
              Quota individuel <span className="text-gray-400 font-normal">(override admin, en Go)</span>
            </label>
            <input
              type="number"
              min="1"
              value={storageQuotaValue}
              onChange={(e) => setStorageQuotaValue(e.target.value)}
              placeholder={ph('admin_groupes_1')}
              className="form-input"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Laisser vide pour utiliser le quota partagé (pool commun des groupes du chef, basé sur le meilleur plan).
              Saisir un nombre pour donner à CE groupe un quota indépendant du pool.
            </p>
          </div>

          <div className="rounded-xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-xs text-cyan-800 space-y-1">
            <p><strong>🔄 Partagé (défaut) :</strong> le stockage est mutualisé entre tous les groupes du chef, plafonné au meilleur plan.</p>
            <p><strong>🔒 Override :</strong> ce groupe obtient son propre quota indépendant — ses fichiers ne comptent plus dans le pool partagé.</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {storageQuotaValue !== '' && (
              <button
                type="button"
                onClick={() => setStorageQuotaValue('')}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                ✕ Supprimer l&apos;override (revenir au pool partagé)
              </button>
            )}
            <div className={`flex gap-3 ${storageQuotaValue !== '' ? '' : 'ml-auto'}`}>
              <Button type="button" variant="secondary" onClick={() => setStorageQuotaOpen(null)}>Annuler</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 🎁 Gift plan modal */}
      <Modal isOpen={!!planGiftOpen} onClose={() => setPlanGiftOpen(null)} title={`🎁 Offrir un plan — ${planGiftOpen?.name}`}>
        <form onSubmit={handleGiftSave} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Le groupe accédera à ce plan <strong>gratuitement</strong>, sans passer par Stripe. Utile pour les beta-testeurs, partenaires ou offres commerciales.
          </div>
          <div>
            <label className="form-label">Plan à offrir</label>
            <select
              value={giftForm.plan}
              onChange={(e) => setGiftForm({ ...giftForm, plan: e.target.value })}
              className="form-input"
            >
              {(Object.keys(PLANS) as GroupPlan[]).map((p) => (
                <option key={p} value={p}>{PLANS[p].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Date d&apos;expiration <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <input
              type="date"
              value={giftForm.expiresAt}
              onChange={(e) => setGiftForm({ ...giftForm, expiresAt: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="form-input"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Laisser vide = accès illimité. Sinon, le groupe repasse automatiquement en Gratuit à cette date.
            </p>
          </div>
          {giftForm.expiresAt && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: '+1 mois', days: 30 },
                { label: '+3 mois', days: 90 },
                { label: '+6 mois', days: 180 },
                { label: '+1 an', days: 365 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    setGiftForm({ ...giftForm, expiresAt: d.toISOString().split('T')[0] })
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPlanGiftOpen(null)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : '🎁 Offrir ce plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit group modal */}
      <Modal isOpen={!!editGroup} onClose={() => setEditGroup(null)} title="Modifier le groupe">
        <form onSubmit={handleEdit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du groupe *</label>
            <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="form-input" rows={2} />
          </div>
          <div>
            <label className="form-label">Style musical</label>
            <select value={editForm.style} onChange={(e) => setEditForm({ ...editForm, style: e.target.value })} className="form-input">
              <option value="">— Non renseigné —</option>
              {MUSIC_GENRES.map((grp) => (
                <optgroup key={grp.group} label={grp.group}>
                  {grp.items.map((g) => <option key={g} value={g}>{g}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Visibilité</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {([
                { key: 'public',  icon: '🌐', label: 'Public',  desc: "Visible sur l'accueil du site, ouvert aux demandes",   isPublic: true,  isHidden: false },
                { key: 'private', icon: '🔒', label: 'Privé',   desc: "Visible sur l'accueil du site, sur invitation du chef", isPublic: false, isHidden: false },
                { key: 'hidden',  icon: '🙈', label: 'Masqué',  desc: 'Invisible partout, réservé aux membres',               isPublic: false, isHidden: true  },
              ] as const).map((opt) => {
                const active = editForm.isPublic === opt.isPublic && editForm.isHidden === opt.isHidden
                return (
                  <button key={opt.key} type="button" onClick={() => setEditForm({ ...editForm, isPublic: opt.isPublic, isHidden: opt.isHidden })}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border-2 p-2.5 text-center transition-colors ${
                      active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-gray-500 leading-tight">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditGroup(null)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Créer un groupe">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label">Nom du groupe *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              placeholder={ph('admin_groupes_2')}
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-input"
              rows={2}
              placeholder={ph('admin_groupes_3')}
            />
          </div>
          <div>
            <label className="form-label">Visibilité</label>
            <div className="flex gap-3 mt-1">
              {[{ value: true, label: '🌐 Public', desc: 'Visible par tous' }, { value: false, label: '🔒 Privé', desc: 'Invitation uniquement' }].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm({ ...form, isPublic: opt.value })}
                  className={`flex-1 rounded-lg border-2 p-2.5 text-sm text-center transition-colors ${
                    form.isPublic === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs text-gray-500 font-normal">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Chef d'orchestre *</label>
            <select
              required
              value={form.chefId}
              onChange={(e) => setForm({ ...form, chefId: e.target.value })}
              className="form-input"
            >
              <option value="">Sélectionner un utilisateur...</option>
              {users.filter((u) => u.siteRole !== 'ADMIN').map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Création...' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Dialogue retrait de groupe : Archiver ou Supprimer définitivement */}
      {removeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRemoveGroup(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Retirer « {removeGroup.name} »</h3>
            <p className="text-sm text-gray-500 mt-1">Ce groupe contient :</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {[
                [removeGroup._count.members, 'membre(s)'],
                [removeGroup._count.rehearsals, 'répétition(s)'],
                [removeGroup._count.concerts, 'concert(s)'],
                [removeGroup._count.songs, 'morceau(x)'],
                [removeGroup._count.setlists, 'setlist(s)'],
                [removeGroup._count.chordCharts, 'grille(s)'],
              ].map(([n, l]) => (
                <span key={l as string} className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-600">{n as number} {l as string}</span>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {!removeGroup.archivedAt && (
                <button
                  onClick={() => handleArchive(removeGroup.id, true)}
                  className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-3 transition-colors"
                >
                  <p className="text-sm font-semibold text-amber-800">📦 Archiver (conserver l&apos;historique)</p>
                  <p className="text-xs text-amber-700 mt-0.5">Le groupe et toutes ses données (répétitions, concerts, répertoire…) sont <strong>conservés</strong> mais le groupe devient <strong>invisible pour les membres</strong>. Réversible à tout moment.</p>
                </button>
              )}
              <button
                onClick={() => { if (confirm(`Supprimer DÉFINITIVEMENT « ${removeGroup.name} » et TOUTES ses données (répétitions, concerts, répertoire, fichiers) ? Action irréversible.`)) handleDeleteForever(removeGroup.id) }}
                className="w-full text-left rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-3 transition-colors"
              >
                <p className="text-sm font-semibold text-red-700">🗑 Supprimer définitivement</p>
                <p className="text-xs text-red-600 mt-0.5">Efface le groupe et <strong>tout</strong> son contenu (y compris les fichiers). <strong>Irréversible.</strong></p>
              </button>
              <button onClick={() => setRemoveGroup(null)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
