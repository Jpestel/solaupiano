export type ThemeId = 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber'

export const themeList: { id: ThemeId; name: string; color: string }[] = [
  { id: 'indigo',  name: 'Indigo',    color: '#4f46e5' },
  { id: 'violet',  name: 'Violet',    color: '#7c3aed' },
  { id: 'blue',    name: 'Bleu',      color: '#2563eb' },
  { id: 'emerald', name: 'Émeraude',  color: '#059669' },
  { id: 'rose',    name: 'Rose',      color: '#e11d48' },
  { id: 'amber',   name: 'Ambre',     color: '#d97706' },
]

const palettes: Record<ThemeId, { s: Record<number, string>; gradFrom: string; gradTo: string }> = {
  indigo: {
    s: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' },
    gradFrom: '#eef2ff', gradTo: '#f5f3ff',
  },
  violet: {
    s: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#4c1d95' },
    gradFrom: '#f5f3ff', gradTo: '#fdf4ff',
  },
  blue: {
    s: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
    gradFrom: '#eff6ff', gradTo: '#f0f9ff',
  },
  emerald: {
    s: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b' },
    gradFrom: '#ecfdf5', gradTo: '#f0fdf4',
  },
  rose: {
    s: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337' },
    gradFrom: '#fff1f2', gradTo: '#fdf2f8',
  },
  amber: {
    s: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f' },
    gradFrom: '#fffbeb', gradTo: '#fff7ed',
  },
}

export function getThemeCss(themeId: ThemeId): string {
  if (themeId === 'indigo') return ''
  const { s, gradFrom, gradTo } = palettes[themeId]
  const lines: string[] = []
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

  for (const n of shades) {
    const c = s[n]
    lines.push(
      `.bg-indigo-${n}{background-color:${c}!important}`,
      `.text-indigo-${n}{color:${c}!important}`,
      `.border-indigo-${n}{border-color:${c}!important}`,
      `.ring-indigo-${n}{--tw-ring-color:${c}!important}`,
      `.from-indigo-${n}{--tw-gradient-from:${c}!important}`,
      `.to-indigo-${n}{--tw-gradient-to:${c}!important}`,
    )
  }

  // hover/focus variants
  for (const n of [50, 100, 200, 500, 600, 700]) {
    const c = s[n]
    lines.push(
      `.hover\\:bg-indigo-${n}:hover{background-color:${c}!important}`,
      `.hover\\:text-indigo-${n}:hover{color:${c}!important}`,
      `.hover\\:border-indigo-${n}:hover{border-color:${c}!important}`,
      `.focus\\:ring-indigo-${n}:focus{--tw-ring-color:${c}!important}`,
    )
  }

  // auth page gradient (to-purple-50)
  lines.push(`.to-purple-50{--tw-gradient-to:${gradTo}!important}`)
  lines.push(`.from-indigo-50{--tw-gradient-from:${gradFrom}!important}`)

  return lines.join('\n')
}
