export type GroupPlan = 'FREE' | 'PRO' | 'PREMIUM'

export const PLANS: Record<GroupPlan, {
  label: string
  storageBytes: number
  storageLabel: string
  priceMonthly: number | null
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  features: string[]
}> = {
  FREE: {
    label: 'Gratuit',
    storageBytes: 1 * 1024 * 1024 * 1024, // 1 Go
    storageLabel: '1 Go',
    priceMonthly: null,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    features: [
      '1 Go de stockage',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
    ],
  },
  PRO: {
    label: 'Pro',
    storageBytes: 5 * 1024 * 1024 * 1024, // 5 Go
    storageLabel: '5 Go',
    priceMonthly: 5.99,
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    features: [
      '5 Go de stockage',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
      'Support prioritaire',
    ],
  },
  PREMIUM: {
    label: 'Premium',
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 Go
    storageLabel: '10 Go',
    priceMonthly: 9.90,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    features: [
      '10 Go de stockage',
      'Répétitions illimitées',
      'Gestion du répertoire',
      'Suivi des présences',
      'Support prioritaire',
      'Statistiques avancées',
    ],
  },
}

export function formatBytes(bytes: number | bigint): string {
  const n = Number(bytes)
  if (n === 0) return '0 o'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} Mo`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

export function storagePercent(used: number | bigint, plan: GroupPlan): number {
  const usedN = Number(used)
  const total = PLANS[plan].storageBytes
  return Math.min(100, Math.round((usedN / total) * 100))
}
