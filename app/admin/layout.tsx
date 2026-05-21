import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import Link from 'next/link'

const adminNav = [
  { href: '/admin', label: 'Vue d\'ensemble' },
  { href: '/admin/instruments', label: 'Instruments' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs' },
  { href: '/admin/groupes', label: 'Groupes' },
  { href: '/admin/rappels', label: 'Rappels' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.siteRole !== 'ADMIN') {
    redirect('/tableau-de-bord')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Admin sub-nav */}
          <div className="flex items-center gap-1 mb-8 border-b border-gray-200 pb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-3">Admin</span>
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
