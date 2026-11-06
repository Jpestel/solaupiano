'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface FilterOption { value: string; count: number }

/**
 * Filtre à liste longue : un bouton qui ouvre une petite fenêtre avec un champ de
 * recherche et une liste défilante (valeurs + nombre de partitions). Remplace un
 * menu déroulant interminable.
 */
export function FilterPicker({ label, options, value, onChange }: {
  label: string
  options: FilterOption[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('touchstart', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const shown = useMemo(() => {
    const t = norm(q.trim())
    return options.filter((o) => !t || norm(o.value).includes(t))
  }, [options, q])

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); setQ('') }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${value ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-gray-300 bg-white text-gray-700'}`}>
        <span className="truncate">{value || label}</span>
        {value
          ? <span role="button" aria-label={`Retirer le filtre ${label}`} onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }} className="px-1 text-indigo-700">✕</span>
          : <span className="text-gray-400">▾</span>}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 max-w-[85vw] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {options.length > 6 && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Chercher ${label.toLowerCase()}…`}
              className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400" />
          )}
          <ul className="max-h-64 overflow-y-auto">
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-gray-500">Aucun résultat</li>}
            {shown.map((o) => (
              <li key={o.value}>
                <button type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-indigo-50 ${o.value === value ? 'font-semibold text-indigo-700' : 'text-gray-800'}`}>
                  <span className="truncate">{o.value}</span><span className="shrink-0 text-xs text-gray-400">{o.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
