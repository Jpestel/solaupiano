'use client'

import { useState } from 'react'
import { ph } from '@/lib/placeholders'

interface Variable { key: string; description: string }
interface Schedule { enabled: boolean; days: number; direction: 'BEFORE' | 'AFTER'; time: string }
interface Template {
  key: string
  name: string
  description: string
  defaultSubject: string
  defaultIntro: string
  defaultOutro: string
  subject: string
  intro: string
  outro: string
  variables: Variable[]
  customized: boolean
  schedule: Schedule | null
}

export function EmailsManager({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initial)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [form, setForm] = useState({ subject: '', intro: '', outro: '' })
  const [sched, setSched] = useState<Schedule | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const openEdit = (tpl: Template) => {
    setEditKey(tpl.key)
    setForm({ subject: tpl.subject, intro: tpl.intro, outro: tpl.outro })
    setSched(tpl.schedule ? { ...tpl.schedule } : null)
    setSaved(false)
  }

  const close = () => { setEditKey(null); setSaved(false) }

  const save = async () => {
    if (!editKey) return
    setSaving(true)
    const res = await fetch(`/api/admin/email-templates/${editKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    // Planification (mails événementiels)
    if (sched) {
      await fetch(`/api/admin/email-schedules/${editKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sched),
      })
    }
    setSaving(false)
    if (res.ok) {
      setTemplates(prev => prev.map(t => t.key === editKey
        ? { ...t, ...form, schedule: sched, customized: true }
        : t
      ))
      setSaved(true)
    }
  }

  const reset = async (key: string) => {
    if (!confirm('Remettre ce template aux textes par défaut ?')) return
    const tpl = templates.find(t => t.key === key)
    if (!tpl) return
    await fetch(`/api/admin/email-templates/${key}`, { method: 'DELETE' })
    setTemplates(prev => prev.map(t => t.key === key
      ? { ...t, subject: t.defaultSubject, intro: t.defaultIntro, outro: t.defaultOutro, customized: false }
      : t
    ))
    if (editKey === key) {
      setForm({ subject: tpl.defaultSubject, intro: tpl.defaultIntro, outro: tpl.defaultOutro })
      setSaved(false)
    }
  }

  const insertVar = (field: 'subject' | 'intro' | 'outro', varKey: string) => {
    setForm(f => ({ ...f, [field]: f[field] + `{{${varKey}}}` }))
  }

  const editing = templates.find(t => t.key === editKey)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Liste */}
      <div className="space-y-2">
        {templates.map(tpl => (
          <button
            key={tpl.key}
            onClick={() => openEdit(tpl)}
            className={`w-full text-left rounded-2xl border p-4 transition-all ${
              editKey === tpl.key
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
                  {tpl.customized && (
                    <span className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                      Personnalisé
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{tpl.description}</p>
              </div>
              <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${editKey === tpl.key ? 'text-indigo-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono truncate">
              Sujet : {tpl.subject}
            </p>
          </button>
        ))}
      </div>

      {/* Éditeur */}
      <div className="lg:sticky lg:top-6">
        {editing ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{editing.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editing.description}</p>
              </div>
              <button onClick={close} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Planification (mails événementiels) */}
            {sched && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">⏰ Planification de l&apos;envoi</p>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 cursor-pointer">
                    <input type="checkbox" checked={sched.enabled} onChange={(e) => setSched({ ...sched, enabled: e.target.checked })} className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                    Activé
                  </label>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-sm text-amber-900">
                  <span>Envoyer</span>
                  <input
                    type="number" min={0} max={60} value={sched.days}
                    onChange={(e) => setSched({ ...sched, days: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 rounded-lg border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span>jour(s)</span>
                  <select
                    value={sched.direction}
                    onChange={(e) => setSched({ ...sched, direction: e.target.value as 'BEFORE' | 'AFTER' })}
                    className="rounded-lg border border-amber-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="BEFORE">avant</option>
                    <option value="AFTER">après</option>
                  </select>
                  <span>l&apos;événement, à</span>
                  <input
                    type="time" value={sched.time}
                    onChange={(e) => setSched({ ...sched, time: e.target.value })}
                    className="rounded-lg border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-amber-600 mt-2">L&apos;événement = la répétition ou le concert concerné. Le mail part une fois, à l&apos;heure choisie.</p>
              </div>
            )}

            {/* Variables disponibles */}
            {editing.variables.length > 0 && (
              <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Variables disponibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {editing.variables.map(v => (
                    <button
                      key={v.key}
                      title={`Insérer dans le sujet : ${v.description}`}
                      className="group relative inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2 py-1 text-xs font-mono text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{'{{'}{ v.key }{'}}'}</span>
                      <span className="text-gray-400 text-[10px] font-sans">— {v.description}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Copiez-collez ces variables dans les champs ci-dessous.</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Sujet */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Sujet de l&apos;email</label>
                  {form.subject !== editing.defaultSubject && (
                    <button onClick={() => setForm(f => ({ ...f, subject: editing.defaultSubject }))} className="text-[10px] text-gray-400 hover:text-indigo-600 transition-colors">
                      Remettre par défaut
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Intro */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Introduction
                    <span className="ml-1 text-xs text-gray-400 font-normal">(avant les données)</span>
                  </label>
                  {form.intro !== editing.defaultIntro && (
                    <button onClick={() => setForm(f => ({ ...f, intro: editing.defaultIntro }))} className="text-[10px] text-gray-400 hover:text-indigo-600 transition-colors">
                      Remettre par défaut
                    </button>
                  )}
                </div>
                <textarea
                  value={form.intro}
                  onChange={e => setForm(f => ({ ...f, intro: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={ph('admin_emails_emailsmanager_1')}
                />
                <p className="text-[10px] text-gray-400 mt-1">Double saut de ligne = nouveau paragraphe.</p>
              </div>

              {/* Outro */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Conclusion
                    <span className="ml-1 text-xs text-gray-400 font-normal">(après les données)</span>
                  </label>
                  {form.outro !== editing.defaultOutro && (
                    <button onClick={() => setForm(f => ({ ...f, outro: editing.defaultOutro }))} className="text-[10px] text-gray-400 hover:text-indigo-600 transition-colors">
                      Remettre par défaut
                    </button>
                  )}
                </div>
                <textarea
                  value={form.outro}
                  onChange={e => setForm(f => ({ ...f, outro: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={ph('admin_emails_emailsmanager_2')}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
              {editing.customized && (
                <button
                  onClick={() => reset(editing.key)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Tout remettre par défaut
                </button>
              )}
              <div className="flex-1" />
              {saved && <span className="text-xs text-green-600 font-medium">✓ Sauvegardé</span>}
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-3xl mb-3">✉️</p>
            <p className="text-sm text-gray-500">Sélectionnez un email dans la liste pour le personnaliser.</p>
          </div>
        )}
      </div>
    </div>
  )
}
