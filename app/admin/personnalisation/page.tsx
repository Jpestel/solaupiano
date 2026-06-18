'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_SETTINGS,
  SITE_ICONS,
  POPUP_TOKENS,
  POPUP_LINE_STYLES,
  POPUP_LINE_STYLE_LABELS,
  defaultPopupLines,
  parsePopupLines,
  type ConcertPopupSettings,
  type PopupLine,
  type PopupLineStyle,
} from '@/lib/site-settings'
import { themeList } from '@/lib/themes'

// Valeurs d'exemple pour l'aperçu (remplacent les jetons).
const PREVIEW_SAMPLE: Record<string, string> = {
  nom_groupe: 'Voodoo Dust',
  date: 'samedi 5 juillet 2026',
  date_courte: 'sam. 5 juil.',
  heure: '20h30',
  adresse: 'Bar cocktail Eden of Persephone, Quai Southampton, 76600 Le Havre',
  lieu: 'Bar cocktail Eden of Persephone',
  ville: 'Le Havre',
}

function renderPreview(text: string) {
  return text.replace(/\{(\w+)\}/g, (_, key) => PREVIEW_SAMPLE[key] ?? '')
}

const STYLE_PREVIEW: Record<PopupLineStyle, { colorKey: keyof ConcertPopupSettings; className: string }> = {
  title: { colorKey: 'concertPopupTitleColor', className: 'text-lg font-extrabold leading-tight' },
  kicker: { colorKey: 'concertPopupTitleColor', className: 'text-sm font-bold' },
  date: { colorKey: 'concertPopupDateColor', className: 'text-base font-extrabold capitalize leading-snug' },
  address: { colorKey: 'concertPopupTextColor', className: 'text-sm leading-relaxed' },
  time: { colorKey: 'concertPopupAccentColor', className: 'text-sm font-extrabold leading-relaxed' },
  normal: { colorKey: 'concertPopupTextColor', className: 'text-sm leading-relaxed' },
}

export default function PersonnalisationPage() {
  const [siteIcon, setSiteIcon] = useState('🎶')
  const [colorTheme, setColorTheme] = useState('indigo')
  const [concertPopup, setConcertPopup] = useState<ConcertPopupSettings>({ ...DEFAULT_SETTINGS } as ConcertPopupSettings)
  const [lines, setLines] = useState<PopupLine[]>(defaultPopupLines(DEFAULT_SETTINGS))
  const [focusedLine, setFocusedLine] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const setPopupField = (key: keyof ConcertPopupSettings, value: string) => {
    setConcertPopup((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    fetch('/api/admin/personnalisation')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSiteIcon(d.siteIcon)
          setColorTheme(d.colorTheme)
          setConcertPopup(d)
          const parsed = parsePopupLines(d.concertPopupLines)
          setLines(parsed && parsed.length > 0 ? parsed : defaultPopupLines(d))
        }
      })
  }, [])

  // --- Gestion des lignes ---
  const updateLine = (index: number, patch: Partial<PopupLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }
  const addLine = () => {
    setLines((prev) => [...prev, { text: '', style: 'normal' }])
    setFocusedLine(lines.length)
  }
  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }
  const moveLine = (index: number, dir: -1 | 1) => {
    setLines((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const insertToken = (token: string) => {
    const index = Math.min(focusedLine, lines.length - 1)
    if (index < 0) return
    const input = inputRefs.current[index]
    const current = lines[index].text
    if (input && document.activeElement === input) {
      const start = input.selectionStart ?? current.length
      const end = input.selectionEnd ?? current.length
      const next = current.slice(0, start) + token + current.slice(end)
      updateLine(index, { text: next })
      requestAnimationFrame(() => {
        input.focus()
        const caret = start + token.length
        input.setSelectionRange(caret, caret)
      })
    } else {
      updateLine(index, { text: current + token })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    await fetch('/api/admin/personnalisation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteIcon, colorTheme, ...concertPopup, concertPopupLines: JSON.stringify(lines) }),
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      window.location.reload()
    }, 1200)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Personnalisation</h1>
        <p className="text-gray-500 mt-1">Apparence générale du site.</p>
      </div>

      <div className="max-w-5xl space-y-6">

        {/* Icon */}
        <Card>
          <CardHeader title="Icône du site" />
          <div className="flex flex-wrap gap-3">
            {SITE_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setSiteIcon(icon)}
                className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${
                  siteIcon === icon
                    ? 'border-indigo-600 bg-indigo-50 scale-110 shadow-md'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </Card>

        {/* Color theme */}
        <Card>
          <CardHeader title="Couleur principale" />
          <div className="flex flex-wrap gap-3">
            {themeList.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  colorTheme === theme.id
                    ? 'border-gray-800 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: theme.color }}
                />
                {theme.name}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Aperçu</p>
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: themeList.find((t) => t.id === colorTheme)?.color }}
              >
                Bouton principal
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: themeList.find((t) => t.id === colorTheme)?.color }}
              >
                Lien actif
              </span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: themeList.find((t) => t.id === colorTheme)?.color + '20',
                  color: themeList.find((t) => t.id === colorTheme)?.color,
                }}
              >
                Badge
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Popup de la carte des concerts" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">

              {/* Composition des lignes */}
              <div>
                <p className="text-sm font-semibold text-gray-900">Contenu de la popup</p>
                <p className="text-xs text-gray-500 mb-3">
                  Composez librement chaque ligne, choisissez son style et insérez des données via les jetons ci-dessous.
                </p>

                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveLine(index, -1)}
                          disabled={index === 0}
                          className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          aria-label="Monter"
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveLine(index, 1)}
                          disabled={index === lines.length - 1}
                          className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          aria-label="Descendre"
                        >▼</button>
                      </div>
                      <select
                        value={line.style}
                        onChange={(e) => updateLine(index, { style: e.target.value as PopupLineStyle })}
                        className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
                      >
                        {POPUP_LINE_STYLES.map((style) => (
                          <option key={style} value={style}>{POPUP_LINE_STYLE_LABELS[style]}</option>
                        ))}
                      </select>
                      <input
                        ref={(el) => { inputRefs.current[index] = el }}
                        value={line.text}
                        onFocus={() => setFocusedLine(index)}
                        onChange={(e) => updateLine(index, { text: e.target.value })}
                        placeholder="Texte ou jeton, ex. sera en concert {date}"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="px-2 text-gray-400 hover:text-red-600"
                        aria-label="Supprimer la ligne"
                      >✕</button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
                >
                  + Ajouter une ligne
                </button>

                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Jetons de données (insérés dans la ligne sélectionnée)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPUP_TOKENS.map((t) => (
                      <button
                        key={t.token}
                        type="button"
                        onClick={() => insertToken(t.token)}
                        title={t.label}
                        className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        {t.token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Libellé du bouton"
                  value={concertPopup.concertPopupButtonLabel}
                  onChange={(value) => setPopupField('concertPopupButtonLabel', value)}
                />
                <TextField
                  label="Texte si l'heure manque (jeton {heure})"
                  value={concertPopup.concertPopupMissingTimeText}
                  onChange={(value) => setPopupField('concertPopupMissingTimeText', value)}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Couleurs</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField label="Fond" value={concertPopup.concertPopupBackgroundColor} onChange={(value) => setPopupField('concertPopupBackgroundColor', value)} />
                  <ColorField label="Titre / Sous-titre" value={concertPopup.concertPopupTitleColor} onChange={(value) => setPopupField('concertPopupTitleColor', value)} />
                  <ColorField label="Texte adresse / normal" value={concertPopup.concertPopupTextColor} onChange={(value) => setPopupField('concertPopupTextColor', value)} />
                  <ColorField label="Date" value={concertPopup.concertPopupDateColor} onChange={(value) => setPopupField('concertPopupDateColor', value)} />
                  <ColorField label="Heure" value={concertPopup.concertPopupAccentColor} onChange={(value) => setPopupField('concertPopupAccentColor', value)} />
                  <ColorField label="Fond bouton" value={concertPopup.concertPopupButtonBgColor} onChange={(value) => setPopupField('concertPopupButtonBgColor', value)} />
                  <ColorField label="Texte bouton" value={concertPopup.concertPopupButtonTextColor} onChange={(value) => setPopupField('concertPopupButtonTextColor', value)} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Aperçu</p>
              <div
                className="rounded-2xl p-5 shadow-xl"
                style={{ background: concertPopup.concertPopupBackgroundColor }}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-xs font-black"
                  style={{ background: concertPopup.concertPopupButtonBgColor, color: concertPopup.concertPopupButtonTextColor }}>
                  VD
                </div>
                {lines.map((line, index) => {
                  const text = renderPreview(line.text).trim()
                  if (!text) return null
                  const meta = STYLE_PREVIEW[line.style] ?? STYLE_PREVIEW.normal
                  return (
                    <p
                      key={index}
                      className={`mt-3 ${meta.className}`}
                      style={{ color: concertPopup[meta.colorKey] }}
                    >
                      {text}
                    </p>
                  )
                })}
                <span
                  className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-extrabold"
                  style={{
                    background: concertPopup.concertPopupButtonBgColor,
                    color: concertPopup.concertPopupButtonTextColor,
                  }}
                >
                  {concertPopup.concertPopupButtonLabel}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          {success && <span className="text-sm text-green-600 font-medium">✓ Sauvegardé — rechargement...</span>}
        </div>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded border-0 bg-transparent p-0" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-gray-700">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full border-0 p-0 text-xs text-gray-500 focus:outline-none"
        />
      </span>
    </label>
  )
}
