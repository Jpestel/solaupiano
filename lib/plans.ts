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

// ─── Generate feature list from a DbPlan ────────────────────────────────────

export function generateFeatureList(p: DbPlan): string[] {
  const f: string[] = []
  if (p.maxGroups === 1) f.push('1 groupe créé et géré')
  else f.push(`Jusqu'à ${p.maxGroups} groupes créés et gérés`)

  const gbLabel = p.storageGb >= 1 ? `${p.storageGb} Go` : `${Math.round(p.storageGb * 1024)} Mo`
  f.push(`${gbLabel} de stockage partagé avec les membres`)

  f.push('Répétitions illimitées')
  f.push('Suivi des présences')

  if (p.maxMembersPerGroup) f.push(`${p.maxMembersPerGroup} membres max par groupe`)
  if (p.maxSongsPerGroup) f.push(`Répertoire limité à ${p.maxSongsPerGroup} morceaux`)
  else f.push('Répertoire illimité')

  if (p.hasGrilles) f.push("Grilles d'accords")
  if (p.hasSetlists) f.push('Setlists')
  if (p.hasConcerts) f.push('Concerts')
  if (p.hasFicheTechnique) f.push('Fiche technique')
  if (p.hasMaPage) f.push('Page publique du groupe')
  if (p.hasCoChefs) f.push('Gestion des co-chefs')
  if (p.hasPrioritySupport) f.push('Support prioritaire')
  if (p.hasStats) f.push('Statistiques avancées')

  return f
}

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
    hasFileSubmissions: true, color: 'gray',
  },
  {
    key: 'PRO', label: 'Pro', description: "Pour les groupes actifs qui veulent aller plus loin.",
    priceMonthly: 5.99, isActive: true, sortOrder: 1,
    storageGb: 5, maxGroups: 5,
    maxMembersPerGroup: null, maxSongsPerGroup: null, maxSetlists: null,
    maxConcerts: null, maxCharts: null, maxFilesPerSong: null,
    hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
    hasMaPage: true, hasCoChefs: true, hasPrioritySupport: true, hasStats: false,
    hasFileSubmissions: true, color: 'indigo',
  },
  {
    key: 'PREMIUM', label: 'Premium', description: 'La puissance maximale pour les professionnels.',
    priceMonthly: 9.90, isActive: true, sortOrder: 2,
    storageGb: 10, maxGroups: 5,
    maxMembersPerGroup: null, maxSongsPerGroup: null, maxSetlists: null,
    maxConcerts: null, maxCharts: null, maxFilesPerSong: null,
    hasGrilles: true, hasConcerts: true, hasSetlists: true, hasFicheTechnique: true,
    hasMaPage: true, hasCoChefs: true, hasPrioritySupport: true, hasStats: true,
    hasFileSubmissions: true, color: 'purple',
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
