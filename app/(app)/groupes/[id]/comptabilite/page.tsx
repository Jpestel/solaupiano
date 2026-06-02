'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Member { userId: number; name: string }
interface Share { id: number; userId: number; amount: number; paid: boolean; paidAt: string | null; user: { id: number; name: string } }
interface Expense {
  id: number; title: string; description: string | null; amount: number; date: string; period: string | null; category: string | null
  paidById: number | null; paidBy: { id: number; name: string } | null; shares: Share[]
}
interface Summary {
  totalExpenses: number; totalCollected: number; totalOutstanding: number
  balance: { userId: number; name: string; advanced: number; owedOutstanding: number }[]
}

const eur = (n: number) => `${n.toFixed(2)} €`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ComptabilitePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id
  const myId = Number(session?.user?.id)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isChef, setIsChef] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', amount: '', date: new Date().toISOString().slice(0, 10), period: '', category: '', paidById: '' })
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [customShares, setCustomShares] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    if (!session) return
    const [cRes, gRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/comptabilite`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (cRes.ok) { const d = await cRes.json(); setExpenses(d.expenses); setMembers(d.members); setSummary(d.summary); setIsChef(d.isChef) }
    if (gRes.ok) { const g = await gRes.json(); setGroupName(g.name || '') }
    setLoading(false)
  }, [session, groupId])
  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm({ title: '', amount: '', date: new Date().toISOString().slice(0, 10), period: '', category: '', paidById: '' })
    setSplitMode('equal'); setSelectedIds(members.map((m) => m.userId)); setCustomShares({}); setError(''); setOpen(true)
  }
  const toggleMember = (uid: number) => setSelectedIds((s) => s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const body: any = {
      title: form.title, amount: form.amount, date: form.date, period: form.period, category: form.category,
      paidById: form.paidById ? Number(form.paidById) : null, splitMode,
    }
    if (splitMode === 'equal') body.memberIds = selectedIds
    else body.customShares = Object.entries(customShares).map(([userId, amount]) => ({ userId: Number(userId), amount })).filter((s) => Number(s.amount) > 0)
    const res = await fetch(`/api/groupes/${groupId}/comptabilite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur.'); return }
    setOpen(false); load()
  }

  const togglePaid = async (expenseId: number, userId: number, paid: boolean) => {
    await fetch(`/api/comptabilite/${expenseId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, paid }) })
    load()
  }
  const del = async (id: number) => { if (!confirm('Supprimer cette dépense ?')) return; await fetch(`/api/comptabilite/${id}`, { method: 'DELETE' }); load() }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>

  const equalPreview = splitMode === 'equal' && selectedIds.length > 0 && Number(form.amount) > 0
    ? (Math.floor((Number(form.amount) / selectedIds.length) * 100) / 100).toFixed(2) : null

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link><span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600 truncate max-w-[160px]">{groupName}</Link>
        <span>/</span><span className="text-gray-900">Comptabilité</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">💶 Comptabilité</h1>
          <p className="text-sm text-gray-500 mt-1">Dépenses partagées (salle, matériel…), qui a avancé, et qui a remboursé sa part.</p>
        </div>
        {isChef && <button onClick={openCreate} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2">➕ Nouvelle dépense</button>}
      </div>

      {/* Synthèse */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-xs text-gray-400">Total dépenses</p><p className="text-lg font-bold text-gray-900">{eur(summary.totalExpenses)}</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-xs text-gray-400">Recouvré</p><p className="text-lg font-bold text-green-700">{eur(summary.totalCollected)}</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-xs text-gray-400">Reste dû</p><p className="text-lg font-bold text-amber-600">{eur(summary.totalOutstanding)}</p></div>
        </div>
      )}

      {/* Bilan par membre */}
      {summary && summary.balance.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Bilan par membre</h2>
          <div className="space-y-1.5">
            {summary.balance.map((b) => (
              <div key={b.userId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{b.name}{b.userId === myId ? ' (moi)' : ''}</span>
                <span className="flex items-center gap-3">
                  {b.advanced > 0 && <span className="text-blue-600" title="A avancé pour le groupe">avancé {eur(b.advanced)}</span>}
                  {b.owedOutstanding > 0
                    ? <span className="font-semibold text-amber-600" title="Reste à régler">doit {eur(b.owedOutstanding)}</span>
                    : <span className="text-green-600 text-xs">à jour ✓</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dépenses */}
      {expenses.length === 0 ? (
        <div className="text-center py-14 text-gray-400 rounded-xl border border-dashed border-gray-200">
          <p className="text-4xl mb-2">💶</p><p className="font-medium text-gray-500">Aucune dépense enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const collected = e.shares.filter((s) => s.paid).reduce((a, s) => a + s.amount, 0)
            const isOpen = expanded.has(e.id)
            const paidCount = e.shares.filter((s) => s.paid).length
            return (
              <div key={e.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button onClick={() => setExpanded((s) => { const n = new Set(s); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n })}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{e.title}
                        {e.period && <span className="ml-2 text-[11px] rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5">{e.period}</span>}
                        {e.category && <span className="ml-1 text-[11px] rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">{e.category}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(e.date)} · {e.paidBy ? `avancé par ${e.paidBy.name}` : 'caisse commune'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{eur(e.amount)}</p>
                      <p className="text-[11px] text-gray-400">{paidCount}/{e.shares.length} payé · {eur(collected)} recouvré</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {e.description && <p className="text-xs text-gray-500 italic mb-2">{e.description}</p>}
                    <div className="space-y-1.5">
                      {e.shares.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-700">{s.user.name}{s.userId === myId ? ' (moi)' : ''}{e.paidById === s.userId ? <span className="text-blue-500 text-[10px]"> (a avancé)</span> : ''}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-gray-600 tabular-nums">{eur(s.amount)}</span>
                            {isChef ? (
                              <button onClick={() => togglePaid(e.id, s.userId, !s.paid)}
                                className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${s.paid ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                                {s.paid ? '✓ Payé' : 'À payer'}
                              </button>
                            ) : (
                              <span className={`text-xs font-semibold ${s.paid ? 'text-green-600' : 'text-amber-600'}`}>{s.paid ? '✓ Payé' : 'À payer'}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {isChef && (
                      <div className="mt-3 text-right">
                        <button onClick={() => del(e.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer la dépense</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <form onClick={(ev) => ev.stopPropagation()} onSubmit={create} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Nouvelle dépense</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Intitulé *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex : Location salle" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Montant total (€) *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Période (optionnel)</label>
                <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="ex : Juin 2026" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Catégorie (optionnel)</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Salle, Matériel…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qui a avancé l'argent ?</label>
              <select value={form.paidById} onChange={(e) => setForm({ ...form, paidById: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="">Caisse commune (personne n'a avancé)</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Si un membre a avancé, sa propre part est marquée payée automatiquement ; les autres lui doivent leur part.</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-gray-600">Répartition :</span>
                <label className="text-xs flex items-center gap-1"><input type="radio" checked={splitMode === 'equal'} onChange={() => setSplitMode('equal')} /> Égalitaire</label>
                <label className="text-xs flex items-center gap-1"><input type="radio" checked={splitMode === 'custom'} onChange={() => setSplitMode('custom')} /> Montants personnalisés</label>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
                    {splitMode === 'equal' ? (
                      <label className="flex items-center gap-2 flex-1">
                        <input type="checkbox" checked={selectedIds.includes(m.userId)} onChange={() => toggleMember(m.userId)} />
                        <span className="text-gray-700">{m.name}</span>
                      </label>
                    ) : (
                      <span className="text-gray-700 flex-1">{m.name}</span>
                    )}
                    {splitMode === 'equal'
                      ? (selectedIds.includes(m.userId) && equalPreview && <span className="text-xs text-gray-400">{equalPreview} €</span>)
                      : <input type="number" step="0.01" min="0" value={customShares[m.userId] || ''} onChange={(e) => setCustomShares((c) => ({ ...c, [m.userId]: e.target.value }))} placeholder="0" className="w-24 rounded border border-gray-200 px-2 py-1 text-xs text-right" />}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Créer la dépense'}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
