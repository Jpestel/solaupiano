'use client'

import { useState, useEffect } from 'react'
import { ph } from '@/lib/placeholders'

interface Newsletter {
  id: number
  subject: string
  content: string
  status: string
  sentAt: string | null
  recipientCount: number
  createdAt: string
}

interface Recipient { subscriberId: number; email: string; sentAt: string }
interface MissingSub { id: number; email: string; createdAt: string }
interface NewsletterDetail {
  newsletter: { id: number; subject: string; status: string }
  recipients: Recipient[]
  missing: MissingSub[]
}

// Même conversion que l'API : si pas de HTML, transforme les retours à la ligne en paragraphes.
function toPreviewHtml(raw: string): string {
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return raw.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">${p.replace(/\n/g, '<br>')}</p>`).join('')
}

export default function AdminNewsletterPage() {
  const [activeCount, setActiveCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(false)

  // Gestion des destinataires d'une newsletter envoyée
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<NewsletterDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [resending, setResending] = useState(false)
  const [detailMsg, setDetailMsg] = useState('')

  const loadDetail = async (id: number) => {
    setDetailLoading(true)
    const res = await fetch(`/api/admin/newsletter/${id}`)
    setDetailLoading(false)
    if (res.ok) setDetail(await res.json())
    else setDetailMsg('Impossible de charger les destinataires.')
  }

  const openDetail = async (n: Newsletter) => {
    if (detailId === n.id) { setDetailId(null); setDetail(null); return }
    setDetailId(n.id); setDetail(null); setSelected(new Set()); setDetailMsg('')
    await loadDetail(n.id)
  }

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const resend = async (subscriberIds?: number[]) => {
    if (!detailId) return
    const n = subscriberIds ? subscriberIds.length : (detail?.missing.length ?? 0)
    if (n === 0) { setDetailMsg('Aucun destinataire sélectionné.'); return }
    if (!confirm(`Renvoyer cette newsletter à ${n} destinataire${n > 1 ? 's' : ''} ?`)) return
    setResending(true); setDetailMsg('')
    const res = await fetch(`/api/admin/newsletter/${detailId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriberIds ? { subscriberIds } : {}),
    })
    setResending(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setDetailMsg(d.error || 'Erreur.'); return }
    setDetailMsg(`✓ Renvoyée à ${d.sent} destinataire(s).`)
    setSelected(new Set())
    // Recharge le détail (qui a reçu / manquants) et la liste (compteurs).
    await loadDetail(detailId)
    load()
  }

  // Marque les manquants comme « déjà reçus » sans envoyer d'email
  // (pour les news envoyées avant la mise en place du suivi).
  const markReceived = async () => {
    if (!detailId || !detail) return
    const n = detail.missing.length
    if (n === 0) return
    if (!confirm(`Marquer ces ${n} abonné${n > 1 ? 's' : ''} comme ayant déjà reçu cette newsletter ? Aucun email ne sera envoyé.`)) return
    setResending(true); setDetailMsg('')
    const res = await fetch(`/api/admin/newsletter/${detailId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markReceived: true }),
    })
    setResending(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setDetailMsg(d.error || 'Erreur.'); return }
    setDetailMsg(`✓ ${d.marked} abonné(s) marqué(s) comme déjà reçus (sans envoi).`)
    setSelected(new Set())
    await loadDetail(detailId)
    load()
  }

  const loadDraft = (n: Newsletter) => {
    setSubject(n.subject)
    setContent(n.content)
    setPreview(false)
    setMsg(n.status === 'SENT' ? '✓ Newsletter chargée (déjà envoyée — vous pouvez la dupliquer).' : '✓ Brouillon chargé dans l\'éditeur.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const load = async () => {
    const res = await fetch('/api/admin/newsletter')
    if (res.ok) {
      const d = await res.json()
      setActiveCount(d.activeCount); setTotalCount(d.totalCount); setNewsletters(d.newsletters)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const submit = async (send: boolean) => {
    if (!subject.trim() || !content.trim()) { setMsg('Sujet et contenu requis.'); return }
    if (send && !confirm(`Envoyer cette newsletter à ${activeCount} abonné${activeCount > 1 ? 's' : ''} ?`)) return
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, content, send }),
    })
    setBusy(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(d.error || 'Erreur.'); return }
    setMsg(send ? `✓ Envoyée à ${d.sent} abonné(s).` : '✓ Brouillon enregistré.')
    setSubject(''); setContent(''); load()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
        <p className="text-gray-500 mt-1">
          <strong className="text-gray-700">{activeCount}</strong> abonné{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
          {totalCount > activeCount && <span className="text-gray-400"> · {totalCount - activeCount} désinscrit{totalCount - activeCount > 1 ? 's' : ''}</span>}
        </p>
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Composer une newsletter</h3>
        {msg && <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-700">{msg}</div>}
        <div>
          <label className="form-label">Sujet</label>
          <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={ph('admin_newsletter_1')} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">Contenu</label>
            <div className="inline-flex rounded-lg bg-gray-100 border border-gray-200 p-0.5 text-xs">
              <button type="button" onClick={() => setPreview(false)} className={`rounded-md px-2.5 py-1 font-semibold ${!preview ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>✏️ Éditer</button>
              <button type="button" onClick={() => setPreview(true)} className={`rounded-md px-2.5 py-1 font-semibold ${preview ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>👁 Aperçu</button>
            </div>
          </div>
          {preview ? (
            content.trim()
              ? <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-[480px] overflow-auto" dangerouslySetInnerHTML={{ __html: toPreviewHtml(content) }} />
              : <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">Rien à prévisualiser.</div>
          ) : (
            <textarea className="form-input font-mono text-sm" rows={14} value={content} onChange={(e) => setContent(e.target.value)} placeholder={ph('newsletter_compose')} />
          )}
          <p className="text-xs text-gray-400 mt-1">Le HTML est accepté. En-tête, pied de page et lien de désinscription sont ajoutés automatiquement à chaque email.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => submit(true)} disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
            {busy ? 'Envoi…' : `Envoyer à ${activeCount} abonné${activeCount > 1 ? 's' : ''}`}
          </button>
          <button onClick={() => submit(false)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">
            Enregistrer en brouillon
          </button>
        </div>
      </div>

      {/* Historique */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Historique</h3>
          <p className="text-xs text-gray-400 mt-0.5">Cliquez une newsletter pour la charger dans l&apos;éditeur (modifier, prévisualiser ou envoyer).</p>
        </div>
        {newsletters.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune newsletter pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {newsletters.map((n) => (
              <li key={n.id}>
                <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-indigo-50/40 transition-colors">
                  <button onClick={() => loadDraft(n)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.subject}</p>
                    <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.status === 'SENT'
                      ? <span className="text-[10px] font-medium rounded-full bg-green-50 text-green-700 px-2 py-0.5">✓ Envoyée · {n.recipientCount}</span>
                      : <span className="text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">Brouillon</span>}
                    {n.status === 'SENT' && (
                      <button onClick={() => openDetail(n)} className="text-xs font-medium rounded-lg border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-100">
                        {detailId === n.id ? 'Fermer' : 'Destinataires'}
                      </button>
                    )}
                  </div>
                </div>

                {detailId === n.id && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
                    {detailMsg && <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-700">{detailMsg}</div>}
                    {detailLoading || !detail ? (
                      <p className="text-sm text-gray-400">Chargement des destinataires…</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Manquants : abonnés actifs n'ayant pas reçu cette news */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-gray-800">
                              N&apos;ont pas reçu cette news
                              <span className="ml-1 text-gray-400 font-normal">({detail.missing.length})</span>
                            </p>
                            {detail.missing.length > 0 && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={markReceived} disabled={resending} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60" title="Marque ces abonnés comme déjà reçus, sans envoyer d'email">
                                  Marquer comme reçue
                                </button>
                                <button onClick={() => resend()} disabled={resending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                                  {resending ? 'Envoi…' : `Renvoyer aux ${detail.missing.length} manquants`}
                                </button>
                              </div>
                            )}
                          </div>
                          {detail.missing.length === 0 ? (
                            <p className="text-xs text-gray-400">Tous les abonnés actifs ont reçu cette newsletter. 🎉</p>
                          ) : (
                            <>
                              <ul className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-50 max-h-56 overflow-auto">
                                {detail.missing.map((s) => (
                                  <li key={s.id}>
                                    <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                      <span className="text-sm text-gray-700 truncate">{s.email}</span>
                                      <span className="ml-auto text-[10px] text-gray-400 shrink-0">inscrit le {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                              {selected.size > 0 && (
                                <button onClick={() => resend(Array.from(selected))} disabled={resending} className="mt-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                                  {resending ? 'Envoi…' : `Renvoyer à la sélection (${selected.size})`}
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Déjà reçus */}
                        <div>
                          <p className="text-sm font-semibold text-gray-800 mb-2">
                            Ont déjà reçu cette news
                            <span className="ml-1 text-gray-400 font-normal">({detail.recipients.length})</span>
                          </p>
                          {detail.recipients.length === 0 ? (
                            <p className="text-xs text-gray-400">Aucun destinataire tracé pour cet envoi (newsletter envoyée avant la mise en place du suivi).</p>
                          ) : (
                            <ul className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-50 max-h-56 overflow-auto">
                              {detail.recipients.map((r) => (
                                <li key={r.subscriberId} className="flex items-center gap-2.5 px-3 py-2">
                                  <span className="text-green-500 text-xs">✓</span>
                                  <span className="text-sm text-gray-700 truncate">{r.email}</span>
                                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">{new Date(r.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
