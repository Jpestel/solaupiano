'use client'

import { useState, useEffect } from 'react'
import { GEAR_CATEGORIES, getGearCategory, GEAR_SUGGESTIONS } from '@/lib/gear'
import { ph } from '@/lib/placeholders'

interface GearItem {
  id?: number
  category: string
  name: string
  brand: string
  details: string
  quantity: number
}

const uid = () => Math.random().toString(36).slice(2)

export function GearManager() {
  const [items, setItems] = useState<(GearItem & { _k: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [addCat, setAddCat] = useState('INSTRUMENT')

  useEffect(() => {
    fetch('/api/profil/materiel').then(r => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setItems(data.map((d: any) => ({
          _k: uid(), id: d.id, category: d.category, name: d.name,
          brand: d.brand ?? '', details: d.details ?? '', quantity: d.quantity ?? 1,
        })))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const addItem = () => {
    setItems(prev => [...prev, { _k: uid(), category: addCat, name: '', brand: '', details: '', quantity: 1 }])
    setSaved(false)
  }
  const update = (k: string, patch: Partial<GearItem>) => {
    setItems(prev => prev.map(it => it._k === k ? { ...it, ...patch } : it))
    setSaved(false)
  }
  const remove = (k: string) => {
    setItems(prev => prev.filter(it => it._k !== k))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/profil/materiel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.filter(it => it.name.trim()) }),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setItems(data.map((d: any) => ({
        _k: uid(), id: d.id, category: d.category, name: d.name,
        brand: d.brand ?? '', details: d.details ?? '', quantity: d.quantity ?? 1,
      })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>

  return (
    <div className="space-y-3">
      {/* Suggestions par catégorie (autocomplétion du champ Modèle) */}
      {GEAR_CATEGORIES.map((c) => (
        <datalist key={c.key} id={`gear-cat-${c.key}`}>
          {(GEAR_SUGGESTIONS[c.key] ?? []).map((s) => <option key={s} value={s} />)}
        </datalist>
      ))}

      <p className="text-xs text-gray-400">
        Décrivez votre setup complet (instruments, ampli, micros, pédales, câbles…). Il pourra être réutilisé ailleurs sur le site (fiches techniques, etc.).
      </p>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-3xl mb-2">🎚️</p>
          <p className="text-sm text-gray-500">Aucun matériel renseigné pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const cat = getGearCategory(it.category)
            return (
              <div key={it._k} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={it.category}
                    onChange={(e) => update(it._k, { category: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-shrink-0"
                  >
                    {GEAR_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => update(it._k, { name: e.target.value })}
                    list={`gear-cat-${it.category}`}
                    placeholder={`${cat.label}${ph('gear_search_suffix')}`}
                    className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button onClick={() => remove(it._k)} className="text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0 px-1" title="Supprimer">×</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={it.brand}
                    onChange={(e) => update(it._k, { brand: e.target.value })}
                    placeholder={ph('profil_gearmanager_1')}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    type="text"
                    value={it.details}
                    onChange={(e) => update(it._k, { details: e.target.value })}
                    placeholder={ph('profil_gearmanager_2')}
                    className="sm:col-span-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Qté</label>
                    <input
                      type="number" min={1} max={99}
                      value={it.quantity}
                      onChange={(e) => update(it._k, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ajout + sauvegarde */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div className="flex items-center gap-2">
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {GEAR_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
          <button onClick={addItem} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
            + Ajouter
          </button>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Enregistré</span>}
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors">
            {saving ? 'Enregistrement…' : 'Enregistrer mon matériel'}
          </button>
        </div>
      </div>
    </div>
  )
}
