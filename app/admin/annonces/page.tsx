import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AdminAnnonceActions } from './AdminAnnonceActions'
import { CategoriesManager } from './CategoriesManager'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE:  'bg-green-100 text-green-700',
  VENDUE:  'bg-red-100 text-red-600',
  EXPIREE: 'bg-gray-100 text-gray-500',
  MASQUEE: 'bg-orange-100 text-orange-600',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ACTIVE:  'Active',
  VENDUE:  'Vendu/Pourvu',
  EXPIREE: 'Expirée',
  MASQUEE: 'Masquée',
}

export default async function AdminAnnoncesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') redirect('/tableau-de-bord')

  const tab = searchParams.tab === 'categories' ? 'categories' : 'annonces'

  const [annonces, categories] = await Promise.all([
    prisma.annonce.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.annonceCategorie.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  // Catégorie label lookup
  const catMap = Object.fromEntries(categories.map(c => [c.key, c]))

  const stats = {
    pending: annonces.filter(a => a.status === 'PENDING').length,
    active:  annonces.filter(a => a.status === 'ACTIVE').length,
    total:   annonces.length,
    masquee: annonces.filter(a => a.status === 'MASQUEE').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Annonces</h1>
        <Link href="/annonces" target="_blank" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          Voir la page publique →
        </Link>
      </div>

      {/* Alerte pending */}
      {stats.pending > 0 && (
        <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <p className="text-sm text-amber-800 font-medium">
            {stats.pending} annonce{stats.pending > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'En attente', value: stats.pending, color: 'text-amber-600' },
          { label: 'Actives', value: stats.active, color: 'text-green-600' },
          { label: 'Masquées', value: stats.masquee, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        <Link
          href="/admin/annonces"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'annonces' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Annonces {stats.pending > 0 && <span className="ml-1.5 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5">{stats.pending}</span>}
        </Link>
        <Link
          href="/admin/annonces?tab=categories"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'categories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Catégories ({categories.length})
        </Link>
      </div>

      {tab === 'categories' ? (
        <CategoriesManager initial={categories} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Annonce</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Auteur</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Statut</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {annonces.map(annonce => {
                const cat = catMap[annonce.category] ?? { emoji: '📌', label: annonce.category }
                const isPending = annonce.status === 'PENDING'
                return (
                  <tr key={annonce.id} className={`hover:bg-gray-50 transition-colors ${isPending ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {annonce.photoPath && (
                          <img src={annonce.photoPath} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/annonces/${annonce.id}`} target="_blank" className="font-medium text-gray-900 hover:text-indigo-600 line-clamp-1">
                            {annonce.title}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {cat.emoji} {cat.label}
                            {annonce.price != null ? ` · ${annonce.price.toFixed(0)} €` : ''}
                            {annonce.location ? ` · ${annonce.location}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-gray-700 font-medium">{annonce.user.name}</p>
                      <p className="text-xs text-gray-400">{annonce.user.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-gray-500">{format(new Date(annonce.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                      <p className="text-xs text-orange-400">Exp. {format(new Date(annonce.expiresAt), 'd MMM yyyy', { locale: fr })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[annonce.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[annonce.status] ?? annonce.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminAnnonceActions id={annonce.id} status={annonce.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {annonces.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">Aucune annonce pour l&apos;instant</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
