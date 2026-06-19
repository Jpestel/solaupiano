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
  GROUP_CARD_TOKENS,
  GROUP_CARD_LINE_STYLES,
  GROUP_CARD_LINE_STYLE_LABELS,
  defaultGroupCardLines,
  parseGroupCardLines,
  type ConcertPopupSettings,
  type GroupCardSettings,
  type PopupLine,
  type PopupLineStyle,
  type GroupCardLine,
  type GroupCardLineStyle,
} from '@/lib/site-settings'
import { themeList } from '@/lib/themes'
import { HOME_ZONES, defaultHomeZones, type HomeZone } from '@/lib/home-zones'

const HOME_ZONE_LABELS: Record<string, { label: string; description: string }> = Object.fromEntries(
  HOME_ZONES.map((z) => [z.key, { label: z.label, description: z.description }])
)

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

const GROUP_PREVIEW_SAMPLE: Record<string, string> = {
  nom_groupe: 'Voodoo Dust',
  membres: '4',
  style: 'Fusion',
  cherche: 'guitare, basse',
  description: 'Compo et covers, ambiance rock psychédélique.',
}

function renderGroupPreview(text: string) {
  return text
    .replace(/\{(\w+)\}/g, (_, key) => GROUP_PREVIEW_SAMPLE[key] ?? '')
    .replace(/\s*·\s*·\s*/g, ' · ')
    .replace(/^\s*·\s*/, '')
    .replace(/\s*·\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const GROUP_STYLE_PREVIEW: Record<GroupCardLineStyle, { colorKey: 'groupCardTitleColor' | 'groupCardTextColor' | 'groupCardAccentColor'; className: string }> = {
  title: { colorKey: 'groupCardTitleColor', className: 'text-sm font-semibold leading-tight' },
  subtitle: { colorKey: 'groupCardTextColor', className: 'text-xs' },
  accent: { colorKey: 'groupCardAccentColor', className: 'text-xs font-medium' },
  normal: { colorKey: 'groupCardTextColor', className: 'text-xs leading-snug' },
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
  const [homeZones, setHomeZones] = useState<HomeZone[]>(defaultHomeZones())
  const [groupCard, setGroupCard] = useState<Omit<GroupCardSettings, 'groupCardLines'>>({
    groupCardTitleColor: '#111827',
    groupCardTextColor: '#6b7280',
    groupCardAccentColor: '#d97706',
    groupCardPageLabel: 'Voir la page',
    groupCardContactLabel: 'Contacter',
    groupCardSectionTitle: 'Groupes inscrits',
    groupCardSeeAllLabel: 'Voir tous les groupes',
  })
  const [groupLines, setGroupLines] = useState<GroupCardLine[]>(defaultGroupCardLines())
  const [focusedGroupLine, setFocusedGroupLine] = useState(0)
  const groupInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const setGroupField = (key: keyof Omit<GroupCardSettings, 'groupCardLines'>, value: string) => {
    setGroupCard((prev) => ({ ...prev, [key]: value }))
  }
  const updateGroupLine = (index: number, patch: Partial<GroupCardLine>) => {
    setGroupLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }
  const addGroupLine = () => {
    setGroupLines((prev) => [...prev, { text: '', style: 'normal' }])
    setFocusedGroupLine(groupLines.length)
  }
  const removeGroupLine = (index: number) => {
    setGroupLines((prev) => prev.filter((_, i) => i !== index))
  }
  const moveGroupLine = (index: number, dir: -1 | 1) => {
    setGroupLines((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const insertGroupToken = (token: string) => {
    const index = Math.min(focusedGroupLine, groupLines.length - 1)
    if (index < 0) return
    const input = groupInputRefs.current[index]
    const current = groupLines[index].text
    if (input && document.activeElement === input) {
      const start = input.selectionStart ?? current.length
      const end = input.selectionEnd ?? current.length
      updateGroupLine(index, { text: current.slice(0, start) + token + current.slice(end) })
      requestAnimationFrame(() => { input.focus(); const c = start + token.length; input.setSelectionRange(c, c) })
    } else {
      updateGroupLine(index, { text: current + token })
    }
  }
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const moveZone = (index: number, dir: -1 | 1) => {
    setHomeZones((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const toggleZone = (index: number) => {
    setHomeZones((prev) => prev.map((z, i) => (i === index ? { ...z, visible: !z.visible } : z)))
  }

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
          setGroupCard({
            groupCardTitleColor: d.groupCardTitleColor,
            groupCardTextColor: d.groupCardTextColor,
            groupCardAccentColor: d.groupCardAccentColor,
            groupCardPageLabel: d.groupCardPageLabel,
            groupCardContactLabel: d.groupCardContactLabel,
            groupCardSectionTitle: d.groupCardSectionTitle,
            groupCardSeeAllLabel: d.groupCardSeeAllLabel,
          })
          const gParsed = parseGroupCardLines(d.groupCardLines)
          setGroupLines(gParsed && gParsed.length > 0 ? gParsed : defaultGroupCardLines())
        }
      })
    fetch('/api/admin/home-zones')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.zones) setHomeZones(d.zones) })
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
    setSaveError('')
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/personnalisation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteIcon, colorTheme, ...concertPopup, concertPopupLines: JSON.stringify(lines), ...groupCard, groupCardLines: JSON.stringify(groupLines) }),
        }),
        fetch('/api/admin/home-zones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: homeZones }),
        }),
      ])
      setSaving(false)
      if (!r1.ok || !r2.ok) {
        setSaveError("L'enregistrement a échoué. Réessayez ou rechargez la page.")
        return
      }
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 1200)
    } catch {
      setSaving(false)
      setSaveError("L'enregistrement a échoué (réseau). Réessayez.")
    }
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
          <CardHeader title="Disposition de l'accueil" />
          <p className="text-sm text-gray-500 mb-4">
            Ordonnez les sections de la page d&apos;accueil (de haut en bas) et masquez celles que vous ne voulez pas afficher.
            Le bandeau d&apos;en-tête (hero) et le pied de page restent fixes.
          </p>
          <div className="space-y-2">
            {homeZones.map((zone, index) => {
              const meta = HOME_ZONE_LABELS[zone.key] ?? { label: zone.key, description: '' }
              return (
                <div
                  key={zone.key}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${zone.visible ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveZone(index, -1)}
                      disabled={index === 0}
                      className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      aria-label="Monter"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveZone(index, 1)}
                      disabled={index === homeZones.length - 1}
                      className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      aria-label="Descendre"
                    >▼</button>
                  </div>
                  <span className="w-6 text-center text-xs font-bold text-gray-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${zone.visible ? 'text-gray-900' : 'text-gray-400'}`}>{meta.label}</p>
                    <p className="text-xs text-gray-400 truncate">{meta.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={zone.visible}
                    onClick={() => toggleZone(index)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${zone.visible ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    title={zone.visible ? 'Visible' : 'Masquée'}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${zone.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`w-16 text-right text-xs font-medium ${zone.visible ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {zone.visible ? 'Visible' : 'Masquée'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Cards des groupes (accueil)" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-900">Contenu de la carte</p>
                <p className="text-xs text-gray-500 mb-3">
                  Composez les lignes affichées sur chaque carte de groupe. Les jetons sont remplacés par les données du groupe.
                  <br />Sur une carte avec photo de fond, le texte passe automatiquement en blanc.
                </p>
                <div className="space-y-2">
                  {groupLines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveGroupLine(index, -1)} disabled={index === 0} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Monter">▲</button>
                        <button type="button" onClick={() => moveGroupLine(index, 1)} disabled={index === groupLines.length - 1} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Descendre">▼</button>
                      </div>
                      <select
                        value={line.style}
                        onChange={(e) => updateGroupLine(index, { style: e.target.value as GroupCardLineStyle })}
                        className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
                      >
                        {GROUP_CARD_LINE_STYLES.map((style) => (
                          <option key={style} value={style}>{GROUP_CARD_LINE_STYLE_LABELS[style]}</option>
                        ))}
                      </select>
                      <input
                        ref={(el) => { groupInputRefs.current[index] = el }}
                        value={line.text}
                        onFocus={() => setFocusedGroupLine(index)}
                        onChange={(e) => updateGroupLine(index, { text: e.target.value })}
                        placeholder="Texte ou jeton, ex. {membres} membres · {style}"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <button type="button" onClick={() => removeGroupLine(index)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Supprimer la ligne">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addGroupLine} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-600">
                  + Ajouter une ligne
                </button>
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Jetons de données (insérés dans la ligne sélectionnée)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GROUP_CARD_TOKENS.map((t) => (
                      <button key={t.token} type="button" onClick={() => insertGroupToken(t.token)} title={t.label} className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                        {t.token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Titre de la section" value={groupCard.groupCardSectionTitle} onChange={(v) => setGroupField('groupCardSectionTitle', v)} />
                <TextField label="Libellé « Voir tous »" value={groupCard.groupCardSeeAllLabel} onChange={(v) => setGroupField('groupCardSeeAllLabel', v)} />
                <TextField label="Libellé bouton « Voir la page »" value={groupCard.groupCardPageLabel} onChange={(v) => setGroupField('groupCardPageLabel', v)} />
                <TextField label="Libellé bouton « Contacter »" value={groupCard.groupCardContactLabel} onChange={(v) => setGroupField('groupCardContactLabel', v)} />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Couleurs (cartes sans photo)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ColorField label="Titre" value={groupCard.groupCardTitleColor} onChange={(v) => setGroupField('groupCardTitleColor', v)} />
                  <ColorField label="Texte" value={groupCard.groupCardTextColor} onChange={(v) => setGroupField('groupCardTextColor', v)} />
                  <ColorField label="Accent" value={groupCard.groupCardAccentColor} onChange={(v) => setGroupField('groupCardAccentColor', v)} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Aperçu</p>
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">V</div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {groupLines.map((line, index) => {
                      const text = renderGroupPreview(line.text)
                      if (!text) return null
                      const meta = GROUP_STYLE_PREVIEW[line.style] ?? GROUP_STYLE_PREVIEW.normal
                      return <p key={index} className={meta.className} style={{ color: groupCard[meta.colorKey] }}>{text}</p>
                    })}
                  </div>
                </div>
                <span className="block w-full rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white">Demander à rejoindre</span>
                <div className="flex gap-2">
                  <span className="flex-1 rounded-lg border border-indigo-200 px-3 py-2 text-center text-xs font-semibold text-indigo-700">{groupCard.groupCardPageLabel}</span>
                  <span className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">{groupCard.groupCardContactLabel}</span>
                </div>
              </div>
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
          {saveError && <span className="text-sm text-red-600 font-medium">{saveError}</span>}
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
