'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SITE_ICONS } from '@/lib/site-settings'
import { themeList } from '@/lib/themes'

export default function PersonnalisationPage() {
  const [siteIcon, setSiteIcon] = useState('🎶')
  const [colorTheme, setColorTheme] = useState('indigo')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/personnalisation')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setSiteIcon(d.siteIcon); setColorTheme(d.colorTheme) } })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    await fetch('/api/admin/personnalisation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteIcon, colorTheme }),
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

      <div className="max-w-xl space-y-6">

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
