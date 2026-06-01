// ─── DB Plan type (matches Prisma Plan model) ───────────────────────────────

export interface DbPlan {
  id: number
  key: string
  label: string
  description: string | null
  priceMonthly: number | null
  isActive: boolean
  sortOrder: number
  storageGb: number
  maxGroups: number
  maxMembersPerGroup: number | null
  maxSongsPerGroup: number | null
  maxSetlists: number | null
  maxConcerts: number | null
  maxCharts: number | null
  maxFilesPerSong: number | null
  hasGrilles: boolean
  hasConcerts: boolean
  hasSetlists: boolean
  hasFicheTechnique: boolean
  hasMaPage: boolean
  hasCoChefs: boolean
  hasPrioritySupport: boolean
  hasStats: boolean
  hasFileSubmissions: boolean
  hasMetronome: boolean
  hasParoles: boolean
  hasSequences: boolean
  hasEvaluations: boolean
  color: string
  stripePriceId: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Kept for backward compatibility (admin/groupes, etc.) ──────────────────

export type GroupPlan = string

export const PLANS: Record<string, {
  label: string
  storageBytes: number
  storageLabel: string
  priceMonthly: number | null
  maxGroups: number
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  features: string[]
}> = {
  FREE: {
    label: 'Gratuit',
    storageBytes: 1 * 1024 * 1024 * 1024,
    storageLabel: '1 Go',
    priceMonthly: null,
    maxGroups: 1,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    features: [
      '1 groupe créé et géré',
      '1 Go de stockage partagé avec les membres',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
    ],
  },
  PRO: {
    label: 'Pro',
    storageBytes: 5 * 1024 * 1024 * 1024,
    storageLabel: '5 Go',
    priceMonthly: 5.99,
    maxGroups: 5,
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    features: [
      "Jusqu'à 5 groupes créés et gérés",
      '5 Go de stockage partagé avec les membres',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
      'Support prioritaire',
    ],
  },
  PREMIUM: {
    label: 'Premium',
    storageBytes: 10 * 1024 * 1024 * 1024,
    storageLabel: '10 Go',
    priceMonthly: 9.90,
    maxGroups: 5,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    features: [
      "Jusqu'à 5 groupes créés et gérés",
      '10 Go de stockage partagé avec les membres',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
      'Support prioritaire',
      'Statistiques avancées',
    ],
  },
}

// ─── Color map for dynamic plan theming ─────────────────────────────────────

export const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   dot: 'bg-gray-400'   },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  green:  { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  dot: 'bg-green-500'  },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-300',   text: 'text-rose-700',   dot: 'bg-rose-500'   },
}

export function getColorClasses(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.gray
}

// ─── Storage label helper ────────────────────────────────────────────────────

export function storageLabel(storageGb: number): string {
  return storageGb >= 1 ? `${storageGb} Go` : `${Math.round(storageGb * 1024)} Mo`
}

// ─── Plan icon (for display cards) ──────────────────────────────────────────

export function planIcon(p: DbPlan): string {
  const ICONS: Record<string, string> = { FREE: '🆓', PRO: '⭐', PREMIUM: '👑' }
  if (ICONS[p.key]) return ICONS[p.key]
  if (p.priceMonthly === null) return '🆓'
  return p.sortOrder <= 1 ? '⭐' : '👑'
}

// ─── Generate feature list from a DbPlan ────────────────────────────────────

export function generateFeatureList(p: DbPlan): string[] {
  const f: string[] = []

  // Groups
  if (p.maxGroups === 1) f.push('1 groupe créé et géré')
  else f.push(`Jusqu'à ${p.maxGroups} groupes créés et gérés`)

  // Storage / file sharing
  if (p.hasFileSubmissions) {
    f.push(`${storageLabel(p.storageGb)} de stockage${p.maxGroups > 1 ? ' partagé entre tous vos groupes' : ''}`)
  } else {
    f.push('Sans stockage de fichiers partagés')
  }

  // Core
  f.push('Répétitions illimitées')
  f.push('Suivi des présences')

  // Member / song limits
  if (p.maxMembersPerGroup !== null) f.push(`${p.maxMembersPerGroup} membre${p.maxMembersPerGroup !== 1 ? 's' : ''} max par groupe`)
  else f.push('Membres illimités par groupe')

  if (p.maxSongsPerGroup !== null) f.push(`Répertoire limité à ${p.maxSongsPerGroup} morceaux`)
  else f.push('Répertoire illimité')

  // Optional quotas (only when set)
  if (p.maxCharts !== null) f.push(`${p.maxCharts} grille${p.maxCharts !== 1 ? 's' : ""} d'accords max`)
  if (p.maxSetlists !== null) f.push(`${p.maxSetlists} setlist${p.maxSetlists !== 1 ? 's' : ''} max`)
  if (p.maxConcerts !== null) f.push(`${p.maxConcerts} concert${p.maxConcerts !== 1 ? 's' : ''} max`)
  if (p.maxFilesPerSong !== null) f.push(`${p.maxFilesPerSong} fichier${p.maxFilesPerSong !== 1 ? 's' : ''} max par morceau`)

  // Feature modules
  if (p.hasParoles) f.push('Paroles & prompteur')
  if (p.hasMetronome) f.push('Métronome par morceau')
  if (p.hasSequences) f.push('Lecteur de séquences (audio & MIDI)')
  if (p.hasEvaluations) f.push('Auto-évaluation (répétitions & concerts)')
  if (p.hasGrilles) f.push("Grilles d'accords")
  if (p.hasSetlists) f.push('Setlists')
  if (p.hasConcerts) f.push('Concerts')
  if (p.hasFicheTechnique) f.push('Fiche technique')
  if (p.hasMaPage) f.push('Page publique du groupe')
  if (p.hasCoChefs) f.push('Co-chefs avec permissions')
  if (p.hasPrioritySupport) f.push('Support prioritaire')
  if (p.hasStats) f.push('Statistiques avancées')

  return f
}

// ─── Build plan card feature rows (for tarifs page) ─────────────────────────
// Returns { ok, label } pairs — max ~7 items for visual cards

export interface PlanFeatureRow { ok: boolean; label: string }

export function buildCardFeatures(p: DbPlan, isFree: boolean): PlanFeatureRow[] {
  const f: PlanFeatureRow[] = []

  f.push({ ok: true, label: isFree ? 'Tout du plan Musicien' : 'Tout du plan Chef gratuit' })

  if (p.maxGroups === 1) f.push({ ok: true, label: '1 groupe à créer et gérer' })
  else f.push({ ok: true, label: `Jusqu'à ${p.maxGroups} groupes` })

  f.push({
    ok: true,
    label: p.maxMembersPerGroup !== null
      ? `Jusqu'à ${p.maxMembersPerGroup} membres / groupe`
      : 'Membres illimités',
  })

  f.push({
    ok: true,
    label: p.maxSongsPerGroup !== null
      ? `Jusqu'à ${p.maxSongsPerGroup} morceaux`
      : 'Répertoire illimité',
  })

  if (p.hasFileSubmissions) {
    f.push({ ok: true, label: `Upload de fichiers — ${storageLabel(p.storageGb)}${p.maxGroups > 1 ? ' (partagé, tous groupes)' : ''}` })
  } else {
    f.push({ ok: false, label: 'Upload de fichiers / partitions' })
  }

  // Condense modules into one line
  const mods: string[] = []
  if (p.hasParoles) mods.push('paroles')
  if (p.hasMetronome) mods.push('métronome')
  if (p.hasSequences) mods.push('séquences')
  if (p.hasEvaluations) mods.push('auto-évaluation')
  if (p.hasGrilles) mods.push('Grilles')
  if (p.hasSetlists) mods.push('setlists')
  if (p.hasFicheTechnique) mods.push('fiche tech.')
  if (p.hasMaPage) mods.push('page publique')
  if (p.hasCoChefs) mods.push('co-chefs')
  if (mods.length > 0) {
    f.push({ ok: true, label: mods.join(', ') })
  } else {
    f.push({ ok: false, label: 'Grilles, setlists, fiche technique…' })
  }

  if (p.hasPrioritySupport) f.push({ ok: true, label: 'Support prioritaire' })
  if (p.hasStats) f.push({ ok: true, label: 'Statistiques avancées' })

  return f
}

// ─── Comparison table row definitions ────────────────────────────────────────

export interface CompRowDef {
  label: string
  musicien: string  // Musicien role (static — user role, not group plan)
  get: (p: DbPlan) => string
}

export const COMP_ROWS: CompRowDef[] = [
  { label: 'Rejoindre des groupes',  musicien: '✓',  get: () => '✓' },
  { label: 'Créer des groupes',      musicien: '—',  get: p => String(p.maxGroups) },
  { label: 'Membres / groupe',       musicien: '—',  get: p => p.maxMembersPerGroup !== null ? `${p.maxMembersPerGroup} max` : 'Illimité' },
  { label: 'Morceaux / groupe',      musicien: '—',  get: p => p.maxSongsPerGroup !== null ? `${p.maxSongsPerGroup} max` : 'Illimité' },
  { label: 'Répétitions',            musicien: '—',  get: () => 'Illimitées' },
  { label: 'Upload de fichiers',     musicien: '—',  get: p => p.hasFileSubmissions ? '✓' : '—' },
  { label: 'Stockage',               musicien: '—',  get: p => p.hasFileSubmissions ? storageLabel(p.storageGb) : '—' },
  { label: 'Paroles & prompteur',    musicien: '—',  get: p => p.hasParoles ? '✓' : '—' },
  { label: 'Métronome',              musicien: '—',  get: p => p.hasMetronome ? '✓' : '—' },
  { label: 'Lecteur de séquences',   musicien: '—',  get: p => p.hasSequences ? '✓' : '—' },
  { label: 'Auto-évaluation',        musicien: '—',  get: p => p.hasEvaluations ? '✓' : '—' },
  { label: "Grilles d'accords",      musicien: '—',  get: p => p.hasGrilles ? '✓' : '—' },
  { label: 'Concerts',               musicien: '✓',  get: p => p.hasConcerts ? '✓' : '—' },
  { label: 'Setlists',               musicien: '—',  get: p => p.hasSetlists ? '✓' : '—' },
  { label: 'Fiche technique',        musicien: '—',  get: p => p.hasFicheTechnique ? '✓' : '—' },
  { label: 'Page publique',          musicien: '—',  get: p => p.hasMaPage ? '✓' : '—' },
  { label: 'Co-chefs',               musicien: '—',  get: p => p.hasCoChefs ? '✓' : '—' },
  { label: 'Support prioritaire',    musicien: '—',  get: p => p.hasPrioritySupport ? '✓' : '—' },
  { label: 'Statistiques avancées',  musicien: '—',  get: p => p.hasStats ? '✓' : '—' },
]

// ─── Default plans for auto-seed ────────────────────────────────────────────

export const DEFAULT_PLAN_SEEDS = [
  {
    key: 'FREE', label: 'Gratuit', description: 'Idéal pour démarrer et découvrir la plateforme.',
    priceMonthly: null, isActive: true, sortOrder: 0,
    storageGb: 1, maxGroups: 1,
    maxMembersPerGroup: null, maxSongsPerGroup: null, maxSetlists: null,
    maxConcerts: null, maxCharts: null, maxFilesPerSong: null,
    hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
    hasMaPage: true, hasCoChefs: true, hasPrioritySupport: false, hasStats: false,
    hasFileSubmissions: true, hasMetronome: true, hasParoles: true, hasSequences: true, hasEvaluations: true, color: 'gray',
  },
  {
    key: 'PRO', label: 'Pro', description: "Pour les groupes actifs qui veulent aller plus loin.",
    priceMonthly: 5.99, isActive: true, sortOrder: 1,
    storageGb: 5, maxGroups: 5,
    maxMembersPerGroup: null, maxSongsPerGroup: null, maxSetlists: null,
    maxConcerts: null, maxCharts: null, maxFilesPerSong: null,
    hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
    hasMaPage: true, hasCoChefs: true, hasPrioritySupport: true, hasStats: false,
    hasFileSubmissions: true, hasMetronome: true, hasParoles: true, hasSequences: true, hasEvaluations: true, color: 'indigo',
  },
  {
    key: 'PREMIUM', label: 'Premium', description: 'La puissance maximale pour les professionnels.',
    priceMonthly: 9.90, isActive: true, sortOrder: 2,
    storageGb: 10, maxGroups: 5,
    maxMembersPerGroup: null, maxSongsPerGroup: null, maxSetlists: null,
    maxConcerts: null, maxCharts: null, maxFilesPerSong: null,
    hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
    hasMaPage: true, hasCoChefs: true, hasPrioritySupport: true, hasStats: true,
    hasFileSubmissions: true, hasMetronome: true, hasParoles: true, hasSequences: true, hasEvaluations: true, color: 'purple',
  },
]

// ─── Utilities ──────────────────────────────────────────────────────────────

export function formatBytes(bytes: number | bigint): string {
  const n = Number(bytes)
  if (n === 0) return '0 o'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} Mo`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

export function storagePercent(used: number | bigint, storageGb: number): number {
  const usedN = Number(used)
  const totalBytes = storageGb * 1024 * 1024 * 1024
  return Math.min(100, Math.round((usedN / totalBytes) * 100))
}
