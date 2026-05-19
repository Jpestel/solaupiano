import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default async function AdminPage() {
  const [userCount, groupCount, instrumentCount, rehearsalCount] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.instrument.count(),
    prisma.rehearsal.count(),
  ])

  const stats = [
    { label: 'Utilisateurs', count: userCount, href: '/admin/utilisateurs', icon: '👥', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Groupes', count: groupCount, href: '/admin/groupes', icon: '🎶', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Instruments', count: instrumentCount, href: '/admin/instruments', icon: '🎹', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Répétitions', count: rehearsalCount, href: '#', icon: '📅', color: 'bg-green-50 text-green-700 border-green-200' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la plateforme Sol au Piano.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`border ${stat.color} hover:shadow-md transition-all cursor-pointer`}>
              <div className="text-3xl mb-3">{stat.icon}</div>
              <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
