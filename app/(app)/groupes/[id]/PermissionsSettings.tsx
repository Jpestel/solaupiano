'use client'

import { useState } from 'react'
import { resolvePermissions, DEFAULT_PERMISSIONS, MODULE_LABELS, ACTION_LABELS, type ChefPermissions } from '@/lib/permissions'

interface PermissionsSettingsProps {
  groupId: number
  initialPermissions: unknown
}

export function PermissionsSettings({ groupId, initialPermissions }: PermissionsSettingsProps) {
  const [perms, setPerms] = useState<ChefPermissions>(() => resolvePermissions(initialPermissions))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const toggle = (module: keyof ChefPermissions, action: string) => {
    setPerms((prev) => {
      const mod = { ...(prev[module] as Record<string, boolean>) }
      mod[action] = !mod[action]
      return { ...prev, [module]: mod }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/groupes/${groupId}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perms),
    })
    setSaving(false)
    if (res.ok) { setSaved(true) }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.') }
  }

  const resetAll = (value: boolean) => {
    const result = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) as ChefPermissions
    for (const mod of Object.keys(result) as (keyof ChefPermissions)[]) {
      for (const key of Object.keys(result[mod])) {
        ;(result[mod] as Record<string, boolean>)[key] = value
      }
    }
    setPerms(result)
    setSaved(false)
  }

  // Module icons
  const moduleIcons: Record<string, string> = {
    repetitions: '🎵',
    repertoire:  '🎼',
    ressources:  '📁',
    setlists:    '🎶',
    concerts:    '🎭',
    grilles:     '🎸',
    membres:     '👥',
    stats:       '📊',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          Définissez ce que les <strong>co-chefs</strong> (chefs que vous avez nommés) peuvent faire dans chaque module.
          Ces permissions ne s&apos;appliquent pas à vous en tant que fondateur.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => resetAll(true)}
            className="text-xs font-medium text-green-700 hover:text-green-900 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition-colors"
          >
            Tout autoriser
          </button>
          <button
            onClick={() => resetAll(false)}
            className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
          >
            Tout restreindre
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(Object.keys(perms) as (keyof ChefPermissions)[]).map((module) => {
          const actions = Object.keys(perms[module])
          const allOn = actions.every((a) => (perms[module] as Record<string, boolean>)[a])
          const allOff = actions.every((a) => !(perms[module] as Record<string, boolean>)[a])

          return (
            <div key={module} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">{moduleIcons[module]}</span>
                  <span className="text-sm font-semibold text-gray-800">{MODULE_LABELS[module]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {allOn ? (
                    <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Tout autorisé</span>
                  ) : allOff ? (
                    <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Tout restreint</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Partiel</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-0 divide-x divide-gray-100">
                {actions.map((action) => {
                  const isOn = (perms[module] as Record<string, boolean>)[action]
                  return (
                    <button
                      key={action}
                      onClick={() => toggle(module, action)}
                      className={`flex-1 min-w-[80px] flex flex-col items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors ${
                        isOn
                          ? 'bg-white text-gray-700 hover:bg-green-50'
                          : 'bg-red-50/60 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isOn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {isOn ? '✓' : '✕'}
                      </span>
                      {ACTION_LABELS[action] ?? action}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between">
        {saved && (
          <p className="text-sm text-green-700 font-medium">✓ Permissions enregistrées</p>
        )}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Sauvegarder les permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}
