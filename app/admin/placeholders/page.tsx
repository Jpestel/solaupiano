'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { PLACEHOLDER_GROUPS, PLACEHOLDER_DEFAULTS } from '@/lib/placeholders'

export default function AdminPlaceholdersPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/placeholders')
    if (r.ok) {
      const d = await r.json()
      setOverrides(d.overrides || {})
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // valeur affichée = brouillon si modifié, sinon surcharge, sinon défaut
  const valueOf = (key: string) =>
    key in draft ? draft[key] : (overrides[key] ?? PLACEHOLDER_DEFAULTS[key] ?? '')

  const isOverridden = (key: string) => {
    const v = valueOf(key)
    return v !== (PLACEHOLDER_DEFAULTS[key] ?? '')
  }

  const setField = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const resetField = (key: string) => {
    setDraft((d) => ({ ...d, [key]: PLACEHOLDER_DEFAULTS[key] ?? '' }))
  }

  const dirty = useMemo(() => {
    return Object.keys(draft).filter((k) => draft[k] !== (overrides[k] ?? PLACEHOLDER_DEFAULTS[k] ?? ''))
  }, [draft, overrides])

  const save = async () => {
    if (dirty.length === 0) return
    setSaving(true)
    const updates: Record<string, string> = {}
    for (const k of dirty) updates[k] = draft[k]
    const r = await fetch('/api/admin/placeholders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }),
    })
    setSaving(false)
    if (r.ok) {
      // recharge l'état serveur, vide le brouillon
      const next = { ...overrides }
      for (const k of dirty) {
        if (updates[k] === (PLACEHOLDER_DEFAULTS[k] ?? '')) delete next[k]
        else next[k] = updates[k]
      }
      setOverrides(next)
      setDraft({})
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(null), 2500)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!q) return PLACEHOLDER_GROUPS
    return PLACEHOLDER_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          g.group.toLowerCase().includes(q) ||
          it.default.toLowerCase().includes(q) ||
          (overrides[it.key] || '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [q, overrides])

  const toggleGroup = (g: string) => {
    setOpenGroups((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })
  }

  const overriddenCount = useMemo(
    () => PLACEHOLDER_GROUPS.reduce((acc, g) => acc + g.items.filter((it) => (overrides[it.key] ?? PLACEHOLDER_DEFAULTS[it.key]) !== PLACEHOLDER_DEFAULTS[it.key]).length, 0),
    [overrides]
  )

  if (loading) return <div className="text-gray-500">Chargement…</div>

  const totalCount = PLACEHOLDER_GROUPS.reduce((a, g) => a + g.items.length, 0)
  const groupIsOpen = (g: string) => !!q || openGroups.has(g)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personnalisation des placeholders</h1>
        <p className="text-gray-500 mt-1">
          Personnalisez les textes d&apos;exemple (placeholders) affichés dans tous les formulaires du site.
          {' '}<span className="text-gray-400">{totalCount} champs · {overriddenCount} personnalisé{overriddenCount > 1 ? 's' : ''}.</span>
        </p>
      </div>

      {/* Barre d'actions collante */}
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 bg-white/95 backdrop-blur border-b border-gray-100 px-4 sm:px-0 py-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un champ, un formulaire, un texte…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        />
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-sm text-green-600">✓ Enregistré</span>}
          <button
            onClick={save}
            disabled={saving || dirty.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : dirty.length > 0 ? `Enregistrer (${dirty.length})` : 'Enregistrer'}
          </button>
        </div>
      </div>

      {filteredGroups.length === 0 && (
        <p className="text-gray-400 text-sm py-6 text-center">Aucun champ ne correspond à « {search} ».</p>
      )}

      <div className="space-y-3">
        {filteredGroups.map((g) => {
          const open = groupIsOpen(g.group)
          const customInGroup = g.items.filter((it) => (overrides[it.key] ?? PLACEHOLDER_DEFAULTS[it.key]) !== PLACEHOLDER_DEFAULTS[it.key]).length
          return (
            <div key={g.group} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => toggleGroup(g.group)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                  {g.group}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {customInGroup > 0 && <span className="rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 font-medium">{customInGroup} perso.</span>}
                  <span className="text-gray-400">{g.items.length} champ{g.items.length > 1 ? 's' : ''}</span>
                </span>
              </button>
              {open && (
                <ul className="divide-y divide-gray-50 border-t border-gray-100">
                  {g.items.map((it) => (
                    <li key={it.key} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <input
                            value={valueOf(it.key)}
                            onChange={(e) => setField(it.key, e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-200 ${isOverridden(it.key) ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-300'}`}
                          />
                          <p className="mt-1 text-[11px] text-gray-400 truncate">
                            Défaut : « {PLACEHOLDER_DEFAULTS[it.key]} »
                          </p>
                        </div>
                        {isOverridden(it.key) && (
                          <button
                            onClick={() => resetField(it.key)}
                            title="Revenir au texte par défaut"
                            className="mt-1.5 flex-shrink-0 text-xs text-gray-400 hover:text-red-500"
                          >
                            ↺ Défaut
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400">
        Astuce : les modifications sont visibles immédiatement après enregistrement (rechargez la page concernée si besoin).
      </p>
    </div>
  )
}
