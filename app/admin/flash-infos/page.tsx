'use client'

import { useState, useEffect, useCallback } from 'react'
import { ph } from '@/lib/placeholders'

interface Flash {
  id: number
  type: string
  title: string
  content: string
  ctaLabel: string | null
  ctaUrl: string | null
  active: boolean
  startAt: string | null
  endAt: string | null
  recurring: boolean
  intervalValue: number
  intervalUnit: string
  maxDisplays: number | null
  priority: number
  _count?: { views: number }
}

const TYPE_META: Record<string, { label: string; icon: string; cls: string }> = {
  INFO: { label: 'Info', icon: 'ℹ️', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ASTUCE: { label: 'Astuce', icon: '💡', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  NEWS: { label: 'News', icon: '📣', cls: 'bg-green-50 text-green-700 border-green-200' },
  ALERTE: { label: 'Alerte', icon: '⚠️', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}
const UNIT_LABEL: Record<string, string> = { HOUR: 'heure(s)', DAY: 'jour(s)', WEEK: 'semaine(s)', MONTH: 'mois' }

const EMPTY = {
  type: 'INFO', title: '', content: '', ctaLabel: '', ctaUrl: '', active: true,
  startAt: '', endAt: '', recurring: false, intervalValue: 1, intervalUnit: 'DAY',
  maxDisplays: '', priority: 0,
}
type Form = typeof EMPTY

function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function AdminFlashInfosPage() {
  const [items, setItems] = useState<Flash[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/flash-infos')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k: keyof Form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const startCreate = () => { setForm(EMPTY); setEditId(null); setError(''); setOpen(true) }
  const startEdit = (f: Flash) => {
    setForm({
      type: f.type, title: f.title, content: f.content, ctaLabel: f.ctaLabel || '', ctaUrl: f.ctaUrl || '',
      active: f.active, startAt: toLocalInput(f.startAt), endAt: toLocalInput(f.endAt),
      recurring: f.recurring, intervalValue: f.intervalValue, intervalUnit: f.intervalUnit,
      maxDisplays: f.maxDisplays != null ? String(f.maxDisplays) : '', priority: f.priority,
    })
    setEditId(f.id); setError(''); setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { setError('Titre et contenu obligatoires.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
      maxDisplays: form.maxDisplays || null,
    }
    const res = await fetch(editId ? `/api/admin/flash-infos/${editId}` : '/api/admin/flash-infos', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    setOpen(false); load()
  }

  const toggleActive = async (f: Flash) => {
    await fetch(`/api/admin/flash-infos/${f.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !f.active }),
    })
    load()
  }
  const del = async (f: Flash) => {
    if (!confirm(`Supprimer le flash « ${f.title} » ?`)) return
    await fetch(`/api/admin/flash-infos/${f.id}`, { method: 'DELETE' }); load()
  }
  const resetViews = async (f: Flash) => {
    if (!confirm('Réinitialiser les vues ? Le flash sera re-proposé à tous les utilisateurs.')) return
    await fetch(`/api/admin/flash-infos/${f.id}`, { method: 'POST' }); load()
  }

  const recurrenceText = (f: Flash) =>
    f.recurring ? `tous les ${f.intervalValue} ${UNIT_LABEL[f.intervalUnit]}${f.maxDisplays ? ` (max ${f.maxDisplays}×)` : ''}` : 'une seule fois'

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flash infos</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Astuces / news / infos affichées en pop-up aux utilisateurs (à la connexion, au retour sur l'app, ou
            après inactivité). Programmables par date et récurrence.
          </p>
        </div>
        <button onClick={startCreate} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2">
          ➕ Nouveau flash
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 rounded-xl border border-dashed border-gray-200">
          <p className="text-4xl mb-2">📣</p>
          <p className="font-medium text-gray-500">Aucun flash info pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((f) => {
            const m = TYPE_META[f.type] || TYPE_META.INFO
            return (
              <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.icon} {m.label}</span>
                    <span className="font-semibold text-gray-900">{f.title}</span>
                    {!f.active && <span className="text-[11px] rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">inactif</span>}
                    {f.priority !== 0 && <span className="text-[11px] text-gray-400">priorité {f.priority}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{f.content}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {recurrenceText(f)}
                    {f.startAt && ` · dès ${new Date(f.startAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
                    {f.endAt && ` · jusqu'au ${new Date(f.endAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
                    {` · ${f._count?.views ?? 0} vue(s)`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(f)} className="text-xs text-gray-500 hover:text-gray-800">{f.active ? 'Désactiver' : 'Activer'}</button>
                  <button onClick={() => startEdit(f)} className="text-xs text-indigo-600 hover:text-indigo-800">Éditer</button>
                  <button onClick={() => resetViews(f)} className="text-xs text-amber-600 hover:text-amber-800">Réinit. vues</button>
                  <button onClick={() => del(f)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{editId ? 'Modifier le flash' : 'Nouveau flash'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priorité</label>
                <input type="number" value={form.priority} onChange={(e) => set('priority', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={191} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contenu *</label>
              <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bouton — libellé (optionnel)</label>
                <input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder={ph('admin_flash_infos_1')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bouton — lien (optionnel)</label>
                <input value={form.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} placeholder={ph('admin_flash_infos_2')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-1">
              Lien interne (`/calendrier`, `/aide`…) ou externe (`https://…`). Astuce : utilisez{' '}
              <code className="bg-gray-100 rounded px-1">{'{groupId}'}</code> pour pointer vers <strong>un groupe du membre</strong>{' '}
              (ex. <code className="bg-gray-100 rounded px-1">/groupes/{'{groupId}'}/disponibilites</code>). S'il a plusieurs groupes, on lui demandera lequel.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Début (optionnel)</label>
                <input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fin (optionnel)</label>
                <input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.recurring} onChange={(e) => set('recurring', e.target.checked)} />
                Réafficher périodiquement
              </label>
              {form.recurring ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Toutes les</label>
                    <input type="number" min={1} value={form.intervalValue} onChange={(e) => set('intervalValue', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unité</label>
                    <select value={form.intervalUnit} onChange={(e) => set('intervalUnit', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      {Object.entries(UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max / pers.</label>
                    <input type="number" min={1} value={form.maxDisplays} onChange={(e) => set('maxDisplays', e.target.value)} placeholder={ph('admin_flash_infos_3')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Le flash s'affiche une seule fois par utilisateur.</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Actif
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 disabled:opacity-50">
                {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Créer'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
