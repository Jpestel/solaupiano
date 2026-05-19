'use client'

import { useState } from 'react'

const PRESETS = ['Bassiste', 'Batteur', 'Guitariste', 'Chanteur', 'Pianiste', 'Violoniste', 'Saxophoniste', 'Trompettiste', 'Accordéoniste', 'Contrebassiste']

interface Props {
  value: string[]
  onChange: (v: string[]) => void
}

export function LookingForSelector({ value, onChange }: Props) {
  const [custom, setCustom] = useState('')

  const toggle = (item: string) => {
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item])
  }

  const addCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed || value.includes(trimmed)) { setCustom(''); return }
    onChange([...value, trimmed])
    setCustom('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              value.includes(p)
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {value.filter((v) => !PRESETS.includes(v)).map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-indigo-600 border border-indigo-600 text-white mr-2">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="ml-0.5 text-indigo-200 hover:text-white">×</button>
        </span>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          className="form-input flex-1 text-sm"
          placeholder="Autre instrument..."
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}
