'use client'

import { useState, useEffect } from 'react'
import { DbPlan, COLOR_MAP, generateFeatureList, storageLabel } from '@/lib/plans'
import { MODULES } from '@/lib/modules'
import { ph } from '@/lib/placeholders'

type PlanWithCount = DbPlan & { groupCount: number }

const COLORS = ['gray', 'indigo', 'purple', 'green', 'blue', 'amber', 'rose'] as const
const COLOR_LABELS: Record<string, string> = {
  gray: 'Gris', indigo: 'Indigo', purple: 'Violet',
  green: 'Vert', blue: 'Bleu', amber: 'Ambre', rose: 'Rose',
}

const EMPTY_FORM = {
  key: '', label: '', description: '', priceMonthly: '', stripePriceId: '', isActive: true, sortOrder: 0,
  storageGb: '1', maxGroups: 1,
  maxMembersPerGroup: '', maxSongsPerGroup: '', maxSetlists: '', maxConcerts: '', maxCharts: '', maxFilesPerSong: '',
  hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
  hasMaPage: true, hasCoChefs: true, hasPrioritySupport: false, hasStats: false, hasFileSubmissions: true,
  hasMetronome: true, hasParoles: true, hasSequences: true, hasEvaluations: true, hasAccounting: true,
  hasChat: true, hasSharedResources: true, hasUnavailabilities: true, hasPolls: true,
  hasGalerie: true, hasSocial: true,
  color: 'gray',
}

type FormState = typeof EMPTY_FORM

function planToForm(p: PlanWithCount): FormState {
  return {
    key: p.key,
    label: p.label,
    description: p.description ?? '',
    priceMonthly: p.priceMonthly !== null ? String(p.priceMonthly) : '',
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    storageGb: String(p.storageGb),
    maxGroups: p.maxGroups,
    maxMembersPerGroup: p.maxMembersPerGroup !== null ? String(p.maxMembersPerGroup) : '',
    maxSongsPerGroup: p.maxSongsPerGroup !== null ? String(p.maxSongsPerGroup) : '',
    maxSetlists: p.maxSetlists !== null ? String(p.maxSetlists) : '',
    maxConcerts: p.maxConcerts !== null ? String(p.maxConcerts) : '',
    maxCharts: p.maxCharts !== null ? String(p.maxCharts) : '',
    maxFilesPerSong: p.maxFilesPerSong !== null ? String(p.maxFilesPerSong) : '',
    hasGrilles: p.hasGrilles,
    hasConcerts: p.hasConcerts,
    hasSetlists: p.hasSetlists,
    hasFicheTechnique: p.hasFicheTechnique,
    hasMaPage: p.hasMaPage,
    hasCoChefs: p.hasCoChefs,
    hasPrioritySupport: p.hasPrioritySupport,
    hasStats: p.hasStats,
    hasFileSubmissions: p.hasFileSubmissions,
    hasMetronome: p.hasMetronome,
    hasParoles: p.hasParoles,
    hasSequences: p.hasSequences,
    hasEvaluations: p.hasEvaluations,
    hasAccounting: p.hasAccounting,
    hasChat: p.hasChat,
    hasSharedResources: p.hasSharedResources,
    hasUnavailabilities: p.hasUnavailabilities,
    hasPolls: p.hasPolls,
    hasGalerie: p.hasGalerie,
    hasSocial: p.hasSocial,
    color: p.color,
    stripePriceId: p.stripePriceId ?? '',
  }
}

function ToggleFeature({ label, icon, checked, onChange }: { label: string; icon: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
        checked
          ? 'border-green-300 bg-green-50 text-green-700'
          : 'border-gray-200 bg-white text-gray-400'
      }`}
    >
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${checked ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {checked ? '✓' : '✕'}
      </span>
      <span className="mr-0.5">{icon}</span>
      {label}
    </button>
  )
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanWithCount | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [storageUnit, setStorageUnit] = useState<'Mo' | 'Go'>('Go')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<PlanWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'general' | 'limits' | 'modules' | 'display'>('general')

  // Module access state
  const [planModuleAccess, setPlanModuleAccess] = useState<Record<string, boolean>>({})
  const [allPlanModuleAccess, setAllPlanModuleAccess] = useState<{ moduleKey: string; planKey: string; enabled: boolean }[]>([])
  const [moduleAccessLoading, setModuleAccessLoading] = useState(false)

  // Modules-only modal (for Musicien role & similar)
  const [modulesOnlyModal, setModulesOnlyModal] = useState(false)
  const [modulesOnlyLabel, setModulesOnlyLabel] = useState('')

  const fetchPlans = async () => {
    const res = await fetch('/api/admin/plans')
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchPlans()
    fetch('/api/admin/module-access')
      .then(r => r.json())
      .then(d => setAllPlanModuleAccess(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const loadModuleAccess = async (planKey: string) => {
    setModuleAccessLoading(true)
    const res = await fetch(`/api/admin/module-access?planKey=${encodeURIComponent(planKey)}`)
    if (res.ok) {
      const records: { moduleKey: string; planKey: string; enabled: boolean }[] = await res.json()
      const map: Record<string, boolean> = {}
      MODULES.forEach(m => {
        const rec = records.find(r => r.moduleKey === m.key)
        map[m.key] = rec !== undefined ? rec.enabled : true
      })
      setPlanModuleAccess(map)
    }
    setModuleAccessLoading(false)
  }

  const handleModuleToggle = async (moduleKey: string, enabled: boolean) => {
    const planKey = editingPlan?.key ?? form.key
    if (!planKey) return
    setPlanModuleAccess(prev => ({ ...prev, [moduleKey]: enabled }))
    setAllPlanModuleAccess(prev => {
      const filtered = prev.filter(r => !(r.moduleKey === moduleKey && r.planKey === planKey))
      return [...filtered, { moduleKey, planKey, enabled }]
    })
    await fetch('/api/admin/module-access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleKey, planKey, enabled }),
    })
  }

  const openModulesOnly = (planKey: string, label: string) => {
    setEditingPlan(null)
    // form.key drives handleModuleToggle when editingPlan is null
    setForm(prev => ({ ...EMPTY_FORM, key: planKey }))
    setModulesOnlyLabel(label)
    loadModuleAccess(planKey)
    setModulesOnlyModal(true)
  }

  const openCreate = () => {
    setEditingPlan(null)
    setForm({ ...EMPTY_FORM, sortOrder: plans.length })
    setStorageUnit('Go')
    setError('')
    setTab('general')
    const defaults: Record<string, boolean> = {}
    MODULES.forEach(m => { defaults[m.key] = true })
    setPlanModuleAccess(defaults)
    setModalOpen(true)
  }

  const openEdit = (p: PlanWithCount) => {
    setEditingPlan(p)
    setForm(planToForm(p))
    // Affiche en Mo si quota < 1 Go (et > 0), sinon en Go
    setStorageUnit(p.storageGb > 0 && p.storageGb < 1 ? 'Mo' : 'Go')
    setError('')
    setTab('general')
    setModalOpen(true)
    loadModuleAccess(p.key)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const parsedStorage = form.storageGb === '' ? NaN : Number(form.storageGb)
    if (isNaN(parsedStorage) || parsedStorage < 0) {
      setError('Le stockage doit être un nombre positif (0 = pas de fichiers).')
      setSaving(false)
      return
    }

    const payload = {
      ...form,
      storageGb: parsedStorage,
      priceMonthly: form.priceMonthly !== '' ? Number(form.priceMonthly) : null,
      stripePriceId: form.stripePriceId.trim() || null,
      maxMembersPerGroup: form.maxMembersPerGroup !== '' ? Number(form.maxMembersPerGroup) : null,
      maxSongsPerGroup: form.maxSongsPerGroup !== '' ? Number(form.maxSongsPerGroup) : null,
      maxSetlists: form.maxSetlists !== '' ? Number(form.maxSetlists) : null,
      maxConcerts: form.maxConcerts !== '' ? Number(form.maxConcerts) : null,
      maxCharts: form.maxCharts !== '' ? Number(form.maxCharts) : null,
      maxFilesPerSong: form.maxFilesPerSong !== '' ? Number(form.maxFilesPerSong) : null,
    }

    const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans'
    const method = editingPlan ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur lors de la sauvegarde.')
      return
    }
    setModalOpen(false)
    fetchPlans()
  }

  const handleDelete = async (p: PlanWithCount) => {
    setDeleting(true)
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur.')
    }
    setDeleteConfirm(null)
    fetchPlans()
  }

  const handleToggleActive = async (p: PlanWithCount) => {
    setTogglingId(p.id)
    await fetch(`/api/admin/plans/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    setTogglingId(null)
    fetchPlans()
  }

  const set = (key: keyof FormState, val: unknown) => setForm((f) => ({ ...f, [key]: val }))

  const activePlans = plans.filter((p) => p.isActive)
  const paidPlans = plans.filter((p) => p.priceMonthly !== null && p.isActive)

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans tarifaires</h1>
          <p className="text-sm text-gray-500 mt-1">Configurez les offres disponibles pour les groupes.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Plans au total', value: plans.length, icon: '📋' },
          { label: 'Plans actifs', value: activePlans.length, icon: '✅' },
          { label: 'Plans payants actifs', value: paidPlans.length, icon: '💶' },
          { label: 'Groupes sur plan payant', value: plans.filter((p) => p.priceMonthly).reduce((a, b) => a + b.groupCount, 0), icon: '🎵' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Musicien role card ─── */}
      <div className="mb-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 overflow-hidden">
        <div className="flex items-start gap-4 p-5">
          <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0 bg-indigo-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-indigo-700">Musicien</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-500">MUSICIEN</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">Rôle utilisateur</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Plan de base pour les musiciens qui rejoignent des groupes. Gratuit, toujours disponible. Configurez ici quels outils lui sont accessibles.</p>
            <div className="flex flex-wrap gap-1.5">
              {MODULES.map(m => {
                const rec = allPlanModuleAccess.find(r => r.moduleKey === m.key && r.planKey === 'MUSICIEN')
                const enabled = rec !== undefined ? rec.enabled : true
                return (
                  <span key={m.key} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                    enabled ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-white text-gray-300'
                  }`}>
                    {m.icon} {m.label}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => openModulesOnly('MUSICIEN', 'Musicien')}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Configurer les modules
            </button>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {plans.map((p) => {
          const c = COLOR_MAP[p.color] ?? COLOR_MAP.gray
          const features = generateFeatureList(p)
          return (
            <div key={p.id} className={`rounded-xl border-2 ${p.isActive ? c.border : 'border-gray-200'} bg-white overflow-hidden transition-all`}>
              <div className="flex items-start gap-4 p-5">
                {/* Color dot */}
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${COLOR_MAP[p.color]?.dot ?? 'bg-gray-400'}`} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className={`text-base font-bold ${p.isActive ? c.text : 'text-gray-400'}`}>{p.label}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-500">{p.key}</span>
                    {!p.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">Inactif</span>
                    )}
                    {p.groupCount > 0 && (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {p.groupCount} groupe{p.groupCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mb-2">{p.description}</p>}

                  {/* Stripe status */}
                  {p.priceMonthly !== null && (
                    <div className="mb-2">
                      {p.stripePriceId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          ✓ Stripe lié — <span className="font-mono">{p.stripePriceId.slice(0, 18)}…</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          ⚠ Stripe Price ID manquant — bouton &quot;Souscrire&quot; désactivé
                        </span>
                      )}
                    </div>
                  )}

                  {/* Key metrics */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      💾 {p.storageGb > 0 ? storageLabel(p.storageGb) : 'Aucun stockage'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      🎵 {p.maxGroups === 1 ? '1 groupe' : `${p.maxGroups} groupes max`}
                    </span>
                    {p.maxMembersPerGroup && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        👥 {p.maxMembersPerGroup} membres/groupe
                      </span>
                    )}
                    {p.maxSongsPerGroup && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        🎼 {p.maxSongsPerGroup} titres max
                      </span>
                    )}
                  </div>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { on: p.hasParoles, label: "Paroles" },
                      { on: p.hasMetronome, label: "Métronome" },
                      { on: p.hasSequences, label: "Séquences" },
                      { on: p.hasEvaluations, label: "Auto-éval." },
                      { on: p.hasAccounting, label: "Compta" },
                      { on: p.hasChat, label: "Tchat" },
                      { on: p.hasSharedResources, label: "Ressources" },
                      { on: p.hasUnavailabilities, label: "Dispos" },
                      { on: p.hasPolls, label: "Sondages" },
                      { on: p.hasGalerie, label: "Galerie" },
                      { on: p.hasSocial, label: "Réseaux" },
                      { on: p.hasGrilles, label: "Grilles" },
                      { on: p.hasConcerts, label: "Concerts" },
                      { on: p.hasSetlists, label: "Setlists" },
                      { on: p.hasFicheTechnique, label: "Fiche tech." },
                      { on: p.hasMaPage, label: "Page web" },
                      { on: p.hasCoChefs, label: "Co-chefs" },
                      { on: p.hasFileSubmissions, label: "Soumissions" },
                      { on: p.hasPrioritySupport, label: "Support ★" },
                      { on: p.hasStats, label: "Stats" },
                    ].map(({ on, label }) => (
                      <span key={label} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        on ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-300'
                      }`}>
                        {on ? '✓' : '✕'} {label}
                      </span>
                    ))}
                  </div>

                  {/* Module pills */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100">
                    {MODULES.map(m => {
                      const rec = allPlanModuleAccess.find(r => r.moduleKey === m.key && r.planKey === p.key)
                      const enabled = rec !== undefined ? rec.enabled : true
                      return (
                        <span key={m.key} className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          enabled ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-white text-gray-300'
                        }`}>
                          {m.icon} {m.label}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Price + actions */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <div className="text-right">
                    {p.priceMonthly !== null ? (
                      <>
                        <p className={`text-lg font-bold ${p.isActive ? c.text : 'text-gray-400'}`}>
                          {Number(p.priceMonthly).toFixed(2).replace('.', ',')} €
                        </p>
                        <p className="text-xs text-gray-400">/mois</p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-gray-500">Gratuit</p>
                    )}
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(p)}
                    disabled={togglingId === p.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                      p.isActive ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    title={p.isActive ? 'Désactiver ce plan' : 'Activer ce plan'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      p.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <p className="text-[10px] text-gray-400">{p.isActive ? 'Actif' : 'Inactif'}</p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      Modifier
                    </button>
                    {p.groupCount === 0 && (
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Aucun plan configuré</p>
          <p className="text-sm mt-1">Cliquez sur &quot;Nouveau plan&quot; pour commencer.</p>
        </div>
      )}

      {/* ─── Create / Edit Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPlan ? `Modifier — ${editingPlan.label}` : 'Nouveau plan'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 gap-1 overflow-x-auto scrollbar-hide">
              {([
                { key: 'general', label: 'Général' },
                { key: 'limits', label: 'Quotas & limites' },
                { key: 'modules', label: 'Modules inclus' },
                { key: 'display', label: 'Affichage' },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    tab === t.key
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4 min-h-[320px]">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* ── General tab ── */}
                {tab === 'general' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Nom du plan <span className="text-red-500">*</span></label>
                        <input
                          type="text" required autoFocus value={form.label}
                          onChange={(e) => {
                            set('label', e.target.value)
                            if (!editingPlan) set('key', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''))
                          }}
                          className="form-input" placeholder={ph('admin_plans_1')} />
                      </div>
                      <div>
                        <label className="form-label">Clé unique <span className="text-red-500">*</span></label>
                        <input
                          type="text" required value={form.key}
                          onChange={(e) => set('key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                          className={`form-input font-mono ${editingPlan ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                          placeholder={ph('admin_plans_2')}
                          readOnly={!!editingPlan} />
                        {!editingPlan && <p className="text-[11px] text-gray-400 mt-1">Identifiant technique — ne peut plus être modifié après création.</p>}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                      <textarea
                        rows={2} value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        className="form-input resize-none" placeholder={ph('admin_plans_3')} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">Prix mensuel (€)</label>
                        <div className="relative">
                          <input
                            type="number" step="0.01" min="0" value={form.priceMonthly}
                            onChange={(e) => set('priceMonthly', e.target.value)}
                            className="form-input pr-8" placeholder={ph('admin_plans_4')} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Laisser vide = plan gratuit.</p>
                      </div>
                    </div>

                    {/* Stripe Price ID — uniquement si plan payant */}
                    {form.priceMonthly !== '' && Number(form.priceMonthly) > 0 && (
                      <div>
                        <label className="form-label flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                          </svg>
                          Stripe Price ID
                        </label>
                        <input
                          type="text"
                          value={form.stripePriceId}
                          onChange={(e) => set('stripePriceId', e.target.value)}
                          className="form-input font-mono text-sm"
                          placeholder={ph('admin_plans_5')} />
                        <p className="text-[11px] text-gray-400 mt-1">
                          Trouvable dans le dashboard Stripe → Produits → Tarifs. Requis pour activer le bouton &quot;Souscrire&quot;.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Ordre d&apos;affichage</label>
                        <input
                          type="number" min="0" value={form.sortOrder}
                          onChange={(e) => set('sortOrder', Number(e.target.value))}
                          className="form-input" />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="form-label">Statut</label>
                        <button
                          type="button"
                          onClick={() => set('isActive', !form.isActive)}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                            form.isActive
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-500'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex-shrink-0 ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {form.isActive ? 'Plan actif' : 'Plan inactif'}
                        </button>
                        <p className="text-[11px] text-gray-400 mt-1">Actif = disponible pour les groupes.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Limits tab ── */}
                {tab === 'limits' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      Laissez un champ vide pour une limite <strong>illimitée (∞)</strong>.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Stockage <span className="text-red-500">*</span></label>
                        {/* Valeur affichée selon l'unité choisie ; stockage interne en Go (Float) */}
                        <div className="flex gap-2">
                          <input
                            type="number" step={storageUnit === 'Mo' ? '1' : '0.5'} min="0"
                            value={(() => {
                              const gb = Number(form.storageGb) || 0
                              const v = storageUnit === 'Mo' ? gb * 1024 : gb
                              // évite les flottants moches (20.000000001)
                              return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
                            })()}
                            onChange={(e) => {
                              const num = Number(e.target.value)
                              const gb = storageUnit === 'Mo' ? num / 1024 : num
                              set('storageGb', String(gb))
                            }}
                            className="form-input flex-1" />
                          <select
                            value={storageUnit}
                            onChange={(e) => setStorageUnit(e.target.value as 'Mo' | 'Go')}
                            className="form-input w-20 flex-shrink-0"
                          >
                            <option value="Mo">Mo</option>
                            <option value="Go">Go</option>
                          </select>
                        </div>
                        {/* Préréglages rapides */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            { label: '0 (aucun)', gb: 0,        unit: 'Go' as const },
                            { label: '20 Mo',     gb: 20 / 1024, unit: 'Mo' as const },
                            { label: '100 Mo',    gb: 100 / 1024, unit: 'Mo' as const },
                            { label: '500 Mo',    gb: 500 / 1024, unit: 'Mo' as const },
                            { label: '1 Go',      gb: 1,        unit: 'Go' as const },
                            { label: '5 Go',      gb: 5,        unit: 'Go' as const },
                            { label: '10 Go',     gb: 10,       unit: 'Go' as const },
                          ].map(p => (
                            <button key={p.label} type="button"
                              onClick={() => { set('storageGb', String(p.gb)); setStorageUnit(p.unit) }}
                              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {(() => {
                            const gb = Number(form.storageGb)
                            if (!gb || gb <= 0) return '⛔ Quota à 0 → upload de fichiers impossible pour ce plan.'
                            const mo = gb * 1024
                            return mo < 1024 ? `≈ ${Math.round(mo)} Mo — upload de fichiers activé` : `${gb % 1 === 0 ? gb : gb.toFixed(2)} Go — upload de fichiers activé`
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="form-label">Groupes créés max <span className="text-red-500">*</span></label>
                        <input type="number" min="1" required value={form.maxGroups}
                          onChange={(e) => set('maxGroups', Number(e.target.value))}
                          className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Membres max par groupe</label>
                        <input type="number" min="1" value={form.maxMembersPerGroup}
                          onChange={(e) => set('maxMembersPerGroup', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_6')} />
                      </div>
                      <div>
                        <label className="form-label">Titres max au répertoire</label>
                        <input type="number" min="1" value={form.maxSongsPerGroup}
                          onChange={(e) => set('maxSongsPerGroup', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_7')} />
                      </div>
                      <div>
                        <label className="form-label">Setlists max par groupe</label>
                        <input type="number" min="1" value={form.maxSetlists}
                          onChange={(e) => set('maxSetlists', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_8')} />
                      </div>
                      <div>
                        <label className="form-label">Concerts max par groupe</label>
                        <input type="number" min="1" value={form.maxConcerts}
                          onChange={(e) => set('maxConcerts', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_9')} />
                      </div>
                      <div>
                        <label className="form-label">Grilles max par groupe</label>
                        <input type="number" min="1" value={form.maxCharts}
                          onChange={(e) => set('maxCharts', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_10')} />
                      </div>
                      <div>
                        <label className="form-label">Fichiers max par morceau</label>
                        <input type="number" min="1" value={form.maxFilesPerSong}
                          onChange={(e) => set('maxFilesPerSong', e.target.value)}
                          className="form-input" placeholder={ph('admin_plans_11')} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Modules tab ── */}
                {tab === 'modules' && (
                  <div className="space-y-5">
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      Choisissez les fonctionnalités incluses dans ce plan. Les modules désactivés seront masqués pour les membres du groupe.
                    </p>

                    {/* Group features */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Fonctionnalités groupe</p>
                      <div className="flex flex-wrap gap-2">
                        <ToggleFeature label="Paroles & prompteur" icon="🎤" checked={form.hasParoles} onChange={(v) => set('hasParoles', v)} />
                        <ToggleFeature label="Métronome" icon="🥁" checked={form.hasMetronome} onChange={(v) => set('hasMetronome', v)} />
                        <ToggleFeature label="Lecteur de séquences" icon="🎚" checked={form.hasSequences} onChange={(v) => set('hasSequences', v)} />
                        <ToggleFeature label="Auto-évaluation des répét." icon="⭐" checked={form.hasEvaluations} onChange={(v) => set('hasEvaluations', v)} />
                        <ToggleFeature label="Comptabilité / caisse" icon="💶" checked={form.hasAccounting} onChange={(v) => set('hasAccounting', v)} />
                        <ToggleFeature label="Tchat du groupe" icon="💬" checked={form.hasChat} onChange={(v) => set('hasChat', v)} />
                        <ToggleFeature label="Ressources partagées" icon="📒" checked={form.hasSharedResources} onChange={(v) => set('hasSharedResources', v)} />
                        <ToggleFeature label="Disponibilités" icon="🗓" checked={form.hasUnavailabilities} onChange={(v) => set('hasUnavailabilities', v)} />
                        <ToggleFeature label="Sondages" icon="📊" checked={form.hasPolls} onChange={(v) => set('hasPolls', v)} />
                        <ToggleFeature label="Galerie photos" icon="📸" checked={form.hasGalerie} onChange={(v) => set('hasGalerie', v)} />
                        <ToggleFeature label="Atelier réseaux sociaux" icon="📣" checked={form.hasSocial} onChange={(v) => set('hasSocial', v)} />
                        <ToggleFeature label="Grilles d'accords" icon="🎸" checked={form.hasGrilles} onChange={(v) => set('hasGrilles', v)} />
                        <ToggleFeature label="Concerts" icon="🎭" checked={form.hasConcerts} onChange={(v) => set('hasConcerts', v)} />
                        <ToggleFeature label="Setlists" icon="🎶" checked={form.hasSetlists} onChange={(v) => set('hasSetlists', v)} />
                        <ToggleFeature label="Fiche technique" icon="📋" checked={form.hasFicheTechnique} onChange={(v) => set('hasFicheTechnique', v)} />
                        <ToggleFeature label="Page publique" icon="🌐" checked={form.hasMaPage} onChange={(v) => set('hasMaPage', v)} />
                        {/* Upload de fichiers : dérivé automatiquement du quota (Go > 0) */}
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="text-sm text-gray-600">📬 Upload de fichiers</span>
                          <span className={`text-xs font-semibold ${Number(form.storageGb) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {Number(form.storageGb) > 0 ? 'Activé (quota > 0)' : 'Désactivé (quota 0)'}
                          </span>
                        </div>
                        <ToggleFeature label="Gestion des co-chefs" icon="👥" checked={form.hasCoChefs} onChange={(v) => set('hasCoChefs', v)} />
                        <ToggleFeature label="Support prioritaire" icon="⭐" checked={form.hasPrioritySupport} onChange={(v) => set('hasPrioritySupport', v)} />
                        <ToggleFeature label="Statistiques avancées" icon="📊" checked={form.hasStats} onChange={(v) => set('hasStats', v)} />
                      </div>
                    </div>

                    {/* Les outils autonomes (Accordeur, Métronome, etc.) se gèrent désormais
                        uniquement sur Admin → Modules, qui gère aussi les exceptions par
                        utilisateur et par groupe. On évite ainsi le doublon de réglages. */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-3">
                        <span className="text-base leading-none mt-0.5">🛠</span>
                        <p className="text-xs text-indigo-700">
                          Les <strong>outils autonomes</strong> (Accordeur, Métronome, Créateur d'accords…)
                          se règlent sur <a href="/admin/modules" className="font-semibold underline hover:text-indigo-900">Admin → Modules</a>,
                          qui gère aussi les exceptions par utilisateur et par groupe.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Display tab ── */}
                {tab === 'display' && (
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Couleur du plan</label>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {COLORS.map((c) => {
                          const cls = COLOR_MAP[c]
                          return (
                            <button
                              key={c} type="button"
                              onClick={() => set('color', c)}
                              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${
                                form.color === c
                                  ? `${cls.border} ${cls.bg}`
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full ${COLOR_MAP[c]?.dot}`} />
                              <span className={`text-xs font-semibold ${form.color === c ? cls.text : 'text-gray-500'}`}>
                                {COLOR_LABELS[c]}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Aperçu de la carte</p>
                      <div className={`rounded-xl border-2 p-4 max-w-xs ${COLOR_MAP[form.color]?.border ?? 'border-gray-200'} ${COLOR_MAP[form.color]?.bg ?? 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-bold text-sm ${COLOR_MAP[form.color]?.text ?? 'text-gray-700'}`}>
                            {form.label || 'Nom du plan'}
                          </p>
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${COLOR_MAP[form.color]?.bg} ${COLOR_MAP[form.color]?.text} border ${COLOR_MAP[form.color]?.border}`}>
                            Actuel
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{Number(form.storageGb) > 0 ? `${storageLabel(Number(form.storageGb))} de stockage` : 'Aucun stockage'}</p>
                        <p className={`text-base font-bold mt-2 ${COLOR_MAP[form.color]?.text}`}>
                          {form.priceMonthly !== '' ? `${Number(form.priceMonthly || 0).toFixed(2).replace('.', ',')} €` : 'Gratuit'}
                          {form.priceMonthly !== '' && <span className="text-xs font-normal text-gray-500">/mois</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex gap-1">
                  {(['general', 'limits', 'modules', 'display'] as const).map((t) => (
                    <span key={t} className={`w-2 h-2 rounded-full transition-colors ${tab === t ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors">
                    {saving ? 'Enregistrement...' : editingPlan ? 'Enregistrer les modifications' : 'Créer le plan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modules-only modal (Musicien + future virtual plans) ─── */}
      {modulesOnlyModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto" onClick={() => setModulesOnlyModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Outils & modules — {modulesOnlyLabel}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Les modifications sont sauvegardées en temps réel.</p>
              </div>
              <button onClick={() => setModulesOnlyModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {moduleAccessLoading ? (
                <p className="text-sm text-gray-400">Chargement…</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    Activez ou désactivez chaque outil pour le plan <strong>{modulesOnlyLabel}</strong>. Par défaut, tout est actif.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map(m => (
                      <ToggleFeature
                        key={m.key}
                        label={m.label}
                        icon={m.icon}
                        checked={planModuleAccess[m.key] ?? true}
                        onChange={v => handleModuleToggle(m.key, v)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setModulesOnlyModal(false)}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer le plan &quot;{deleteConfirm.label}&quot; ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
