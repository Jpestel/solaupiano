'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SETTINGS, SITE_ICONS, type ConcertPopupSettings } from '@/lib/site-settings'
import { themeList } from '@/lib/themes'

export default function PersonnalisationPage() {
  const [siteIcon, setSiteIcon] = useState('🎶')
  const [colorTheme, setColorTheme] = useState('indigo')
  const [concertPopup, setConcertPopup] = useState<ConcertPopupSettings>({
    concertPopupKicker: DEFAULT_SETTINGS.concertPopupKicker,
    concertPopupTimePrefix: DEFAULT_SETTINGS.concertPopupTimePrefix,
    concertPopupMissingTimeText: DEFAULT_SETTINGS.concertPopupMissingTimeText,
    concertPopupButtonLabel: DEFAULT_SETTINGS.concertPopupButtonLabel,
    concertPopupBackgroundColor: DEFAULT_SETTINGS.concertPopupBackgroundColor,
    concertPopupTitleColor: DEFAULT_SETTINGS.concertPopupTitleColor,
    concertPopupTextColor: DEFAULT_SETTINGS.concertPopupTextColor,
    concertPopupAccentColor: DEFAULT_SETTINGS.concertPopupAccentColor,
    concertPopupButtonBgColor: DEFAULT_SETTINGS.concertPopupButtonBgColor,
    concertPopupButtonTextColor: DEFAULT_SETTINGS.concertPopupButtonTextColor,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const setPopupField = (key: keyof ConcertPopupSettings, value: string) => {
    setConcertPopup((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    fetch('/api/admin/personnalisation')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setSiteIcon(d.siteIcon)
          setColorTheme(d.colorTheme)
          setConcertPopup({
            concertPopupKicker: d.concertPopupKicker,
            concertPopupTimePrefix: d.concertPopupTimePrefix,
            concertPopupMissingTimeText: d.concertPopupMissingTimeText,
            concertPopupButtonLabel: d.concertPopupButtonLabel,
            concertPopupBackgroundColor: d.concertPopupBackgroundColor,
            concertPopupTitleColor: d.concertPopupTitleColor,
            concertPopupTextColor: d.concertPopupTextColor,
            concertPopupAccentColor: d.concertPopupAccentColor,
            concertPopupButtonBgColor: d.concertPopupButtonBgColor,
            concertPopupButtonTextColor: d.concertPopupButtonTextColor,
          })
        }
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    await fetch('/api/admin/personnalisation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteIcon, colorTheme, ...concertPopup }),
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); window.location.reload() }, 1200)
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
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Texte sous le nom du groupe"
                  value={concertPopup.concertPopupKicker}
                  onChange={(value) => setPopupField('concertPopupKicker', value)}
                />
                <TextField
                  label="Préfixe de l'heure"
                  value={concertPopup.concertPopupTimePrefix}
                  onChange={(value) => setPopupField('concertPopupTimePrefix', value)}
                />
                <TextField
                  label="Libellé du bouton"
                  value={concertPopup.concertPopupButtonLabel}
                  onChange={(value) => setPopupField('concertPopupButtonLabel', value)}
                />
                <TextField
                  label="Texte si l'heure manque"
                  value={concertPopup.concertPopupMissingTimeText}
                  onChange={(value) => setPopupField('concertPopupMissingTimeText', value)}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Couleurs</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField label="Fond" value={concertPopup.concertPopupBackgroundColor} onChange={(value) => setPopupField('concertPopupBackgroundColor', value)} />
                  <ColorField label="Titre" value={concertPopup.concertPopupTitleColor} onChange={(value) => setPopupField('concertPopupTitleColor', value)} />
                  <ColorField label="Texte adresse" value={concertPopup.concertPopupTextColor} onChange={(value) => setPopupField('concertPopupTextColor', value)} />
                  <ColorField label="Texte heure" value={concertPopup.concertPopupAccentColor} onChange={(value) => setPopupField('concertPopupAccentColor', value)} />
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
                <p className="font-extrabold" style={{ color: concertPopup.concertPopupTitleColor }}>Voodoo Dust</p>
                <p className="mt-5 text-sm font-bold" style={{ color: concertPopup.concertPopupTitleColor }}>{concertPopup.concertPopupKicker}</p>
                <p className="mt-5 text-sm leading-relaxed" style={{ color: concertPopup.concertPopupTextColor }}>
                  Bar cocktail Eden of Persephone, Quai Southampton, 76600 Le Havre
                </p>
                <p className="mt-5 text-sm font-extrabold leading-relaxed" style={{ color: concertPopup.concertPopupAccentColor }}>
                  {concertPopup.concertPopupMissingTimeText}
                </p>
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
