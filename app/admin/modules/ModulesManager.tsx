'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleDef } from '@/lib/modules'

interface Plan {
  key: string
  label: string
  color: string
}

interface PlanAccess {
  id: number
  moduleKey: string
  planKey: string
  enabled: boolean
}

interface UserOverride {
  id: number
  moduleKey: string
  userId: number
  allowed: boolean
  user: { id: number; name: string; email: string }
}

interface GroupOverride {
  id: number
  moduleKey: string
  groupId: number
  allowed: boolean
  group: { id: number; name: string }
}

interface UserItem {
  id: number
  name: string
  email: string
}

interface GroupItem {
  id: number
  name: string
}

interface Props {
  modules: ModuleDef[]
  plans: Plan[]
  planAccess: PlanAccess[]
  userOverrides: UserOverride[]
  groupOverrides: GroupOverride[]
  users: UserItem[]
  groups: GroupItem[]
}

export function ModulesManager({
  modules,
  plans,
  planAccess,
  userOverrides,
  groupOverrides,
  users,
  groups,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local state for plan access (optimistic)
  const [localPlanAccess, setLocalPlanAccess] = useState<PlanAccess[]>(planAccess)
  const [localUserOverrides, setLocalUserOverrides] = useState<UserOverride[]>(userOverrides)
  const [localGroupOverrides, setLocalGroupOverrides] = useState<GroupOverride[]>(groupOverrides)

  // Override form state
  const [overrideForm, setOverrideForm] = useState<{
    moduleKey: string
    type: 'user' | 'group'
    targetId: number
    allowed: boolean
  } | null>(null)

  // Active module tab
  const [activeModule, setActiveModule] = useState(modules[0]?.key ?? '')

  function getPlanEnabled(moduleKey: string, planKey: string): boolean {
    const rule = localPlanAccess.find(r => r.moduleKey === moduleKey && r.planKey === planKey)
    return rule ? rule.enabled : true // default: open
  }

  async function togglePlanAccess(moduleKey: string, planKey: string, enabled: boolean) {
    // Optimistic
    setLocalPlanAccess(prev => {
      const existing = prev.find(r => r.moduleKey === moduleKey && r.planKey === planKey)
      if (existing) {
        return prev.map(r => r.moduleKey === moduleKey && r.planKey === planKey ? { ...r, enabled } : r)
      }
      return [...prev, { id: Date.now(), moduleKey, planKey, enabled }]
    })

    await fetch('/api/admin/module-access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleKey, planKey, enabled }),
    })
    startTransition(() => router.refresh())
  }

  async function addOverride() {
    if (!overrideForm) return
    const res = await fetch('/api/admin/module-access/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrideForm),
    })
    if (!res.ok) return
    const record = await res.json()

    if (overrideForm.type === 'user') {
      const user = users.find(u => u.id === overrideForm.targetId)
      if (user) {
        setLocalUserOverrides(prev => {
          const filtered = prev.filter(o => !(o.moduleKey === overrideForm.moduleKey && o.userId === overrideForm.targetId))
          return [...filtered, { ...record, user }]
        })
      }
    } else {
      const group = groups.find(g => g.id === overrideForm.targetId)
      if (group) {
        setLocalGroupOverrides(prev => {
          const filtered = prev.filter(o => !(o.moduleKey === overrideForm.moduleKey && o.groupId === overrideForm.targetId))
          return [...filtered, { ...record, group }]
        })
      }
    }
    setOverrideForm(null)
    startTransition(() => router.refresh())
  }

  async function deleteUserOverride(id: number) {
    setLocalUserOverrides(prev => prev.filter(o => o.id !== id))
    await fetch(`/api/admin/module-access/override/user/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  async function deleteGroupOverride(id: number) {
    setLocalGroupOverrides(prev => prev.filter(o => o.id !== id))
    await fetch(`/api/admin/module-access/override/group/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  const currentModule = modules.find(m => m.key === activeModule)
  const moduleUserOverrides = localUserOverrides.filter(o => o.moduleKey === activeModule)
  const moduleGroupOverrides = localGroupOverrides.filter(o => o.moduleKey === activeModule)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des modules</h1>
        <p className="mt-1 text-sm text-gray-500">
          Activez ou désactivez l'accès aux outils selon le plan, le groupe ou l'utilisateur.
          Par défaut, tous les outils sont accessibles à tous.
        </p>
      </div>

      {/* Module tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {modules.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveModule(m.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeModule === m.key
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {currentModule && (
        <div className="space-y-6">
          {/* Module info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentModule.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-900">{currentModule.label}</h2>
                <p className="text-sm text-gray-500">{currentModule.description}</p>
              </div>
            </div>
          </div>

          {/* Plan access toggles */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Accès par plan
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Désactiver un plan bloque l'accès pour tous les utilisateurs de ce plan (sauf exceptions ci-dessous).
            </p>
            <div className="divide-y divide-gray-100">
              {plans.map(plan => {
                const enabled = getPlanEnabled(activeModule, plan.key)
                return (
                  <div key={plan.key} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${plan.color}-100 text-${plan.color}-800`}>
                        {plan.label}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePlanAccess(activeModule, plan.key, !enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        enabled ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={enabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* User overrides */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Exceptions par utilisateur
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Priorité maximale. Permet d'autoriser ou bloquer un utilisateur spécifique, quel que soit son plan.
            </p>

            {moduleUserOverrides.length > 0 ? (
              <ul className="mb-4 divide-y divide-gray-100">
                {moduleUserOverrides.map(o => (
                  <li key={o.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{o.user.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{o.user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {o.allowed ? '✅ Autorisé' : '🚫 Bloqué'}
                      </span>
                      <button
                        onClick={() => deleteUserOverride(o.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">Aucune exception utilisateur.</p>
            )}

            {/* Add user override */}
            {overrideForm?.moduleKey === activeModule && overrideForm?.type === 'user' ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Utilisateur</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={overrideForm.targetId || ''}
                      onChange={e => setOverrideForm(f => f ? { ...f, targetId: parseInt(e.target.value) } : f)}
                    >
                      <option value="">— Choisir un utilisateur —</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accès</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="uo-allowed"
                          checked={overrideForm.allowed === true}
                          onChange={() => setOverrideForm(f => f ? { ...f, allowed: true } : f)}
                          className="text-green-600"
                        />
                        <span className="text-sm text-green-700 font-medium">Autoriser</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="uo-allowed"
                          checked={overrideForm.allowed === false}
                          onChange={() => setOverrideForm(f => f ? { ...f, allowed: false } : f)}
                          className="text-red-600"
                        />
                        <span className="text-sm text-red-700 font-medium">Bloquer</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addOverride}
                      disabled={!overrideForm.targetId}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setOverrideForm(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setOverrideForm({ moduleKey: activeModule, type: 'user', targetId: 0, allowed: false })}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une exception utilisateur
              </button>
            )}
          </div>

          {/* Group overrides */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Exceptions par groupe
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Autoriser ou bloquer l'accès pour tous les membres d'un groupe spécifique.
            </p>

            {moduleGroupOverrides.length > 0 ? (
              <ul className="mb-4 divide-y divide-gray-100">
                {moduleGroupOverrides.map(o => (
                  <li key={o.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-gray-800">{o.group.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {o.allowed ? '✅ Autorisé' : '🚫 Bloqué'}
                      </span>
                      <button
                        onClick={() => deleteGroupOverride(o.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">Aucune exception groupe.</p>
            )}

            {/* Add group override */}
            {overrideForm?.moduleKey === activeModule && overrideForm?.type === 'group' ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Groupe</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={overrideForm.targetId || ''}
                      onChange={e => setOverrideForm(f => f ? { ...f, targetId: parseInt(e.target.value) } : f)}
                    >
                      <option value="">— Choisir un groupe —</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accès</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="go-allowed"
                          checked={overrideForm.allowed === true}
                          onChange={() => setOverrideForm(f => f ? { ...f, allowed: true } : f)}
                        />
                        <span className="text-sm text-green-700 font-medium">Autoriser</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="go-allowed"
                          checked={overrideForm.allowed === false}
                          onChange={() => setOverrideForm(f => f ? { ...f, allowed: false } : f)}
                        />
                        <span className="text-sm text-red-700 font-medium">Bloquer</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addOverride}
                      disabled={!overrideForm.targetId}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setOverrideForm(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setOverrideForm({ moduleKey: activeModule, type: 'group', targetId: 0, allowed: false })}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une exception groupe
              </button>
            )}
          </div>

          {/* Priority legend */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Ordre de priorité</h4>
            <ol className="text-xs text-indigo-800 space-y-1">
              <li><span className="font-bold">1.</span> Exception utilisateur (priorité maximale)</li>
              <li><span className="font-bold">2.</span> Exception groupe (si l'utilisateur est membre d'un groupe avec exception)</li>
              <li><span className="font-bold">3.</span> Accès par plan</li>
              <li><span className="font-bold">4.</span> Par défaut : accès autorisé pour tous</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
