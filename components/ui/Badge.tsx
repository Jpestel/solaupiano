import { clsx } from '@/lib/utils'

type BadgeVariant =
  | 'present'
  | 'absent'
  | 'incertain'
  | 'chef'
  | 'membre'
  | 'admin'
  | 'pdf'
  | 'audio'
  | 'image'
  | 'grille'
  | 'autre'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  present: 'bg-green-100 text-green-800 ring-green-600/20',
  absent: 'bg-red-100 text-red-800 ring-red-600/20',
  incertain: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  chef: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20',
  membre: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  admin: 'bg-purple-100 text-purple-800 ring-purple-600/20',
  pdf: 'bg-red-50 text-red-700 ring-red-600/10',
  audio: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  image: 'bg-green-50 text-green-700 ring-green-600/10',
  grille: 'bg-orange-50 text-orange-700 ring-orange-600/10',
  autre: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  default: 'bg-gray-100 text-gray-700 ring-gray-500/10',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function AttendanceBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    PRESENT: { variant: 'present', label: 'Présent' },
    ABSENT: { variant: 'absent', label: 'Absent' },
    INCERTAIN: { variant: 'incertain', label: 'Incertain' },
  }
  const { variant, label } = map[status] || { variant: 'default', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

/**
 * Badge de rôle dans un groupe, distinguant le fondateur des co-chefs.
 * Couleurs littérales (non affectées par le thème du site) :
 * fondateur = orange, co-chef = bleu, membre = blanc/gris.
 */
export function GroupRoleBadge({ groupRole, isFounder }: { groupRole: string; isFounder: boolean }) {
  let cls = 'border-gray-200 bg-white text-gray-600'
  let label = 'Membre'
  let icon = '🎵'
  if (isFounder) {
    cls = 'border-amber-200 bg-amber-100 text-amber-700'
    label = "Chef d'orchestre"
    icon = '👑'
  } else if (groupRole === 'CHEF') {
    cls = 'border-blue-200 bg-blue-100 text-blue-700'
    label = 'Co-chef'
    icon = '⭐'
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span>{icon}</span>{label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    CHEF: { variant: 'chef', label: "Chef d'orchestre" },
    MEMBRE: { variant: 'membre', label: 'Membre' },
    ADMIN: { variant: 'admin', label: 'Admin' },
  }
  const { variant, label } = map[role] || { variant: 'default', label: role }
  return <Badge variant={variant}>{label}</Badge>
}
