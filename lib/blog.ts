// Helpers blog (partagés client/serveur — pas d'import serveur ici).

export function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'article'
}

// Couleurs de catégories (chips)
export const BLOG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: '#6366f1' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: '#f43f5e' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: '#f59e0b' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: '#10b981' },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: '#0ea5e9' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: '#8b5cf6' },
  fuchsia:{ bg: 'bg-fuchsia-50',text: 'text-fuchsia-700',border: 'border-fuchsia-200',dot: '#d946ef' },
  gray:   { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',   dot: '#9ca3af' },
}
export const BLOG_COLOR_KEYS = Object.keys(BLOG_COLORS)

export function blogColor(c?: string | null) {
  return BLOG_COLORS[c || 'indigo'] || BLOG_COLORS.indigo
}

// Convertit un contenu en HTML : si pas de balise détectée, on transforme les paragraphes.
export function toBlogHtml(raw: string): string {
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return raw.split(/\n{2,}/).filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')
}

// Extrait un résumé texte depuis du HTML
export function htmlExcerpt(html: string, max = 180): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
