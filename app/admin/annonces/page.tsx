import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AdminAnnonceActions } from './AdminAnnonceActions'

export const dynamic = 'force-dynamic'

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  MATERIEL: { label: 'Matériel', emoji: '🎸' },
  MUSICIEN: { label: 'Musicien', emoji: '👤' },
  GROUPE:   { label: 'Groupe',   emoji: '🎼' },
  COURS:    { label: 'Cours',    emoji: '📚' },
  AUTRE:    { label: 'Autre',    emoji: '📌' },
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  'bg-green-100 text-green-700',
  VENDUE:  'bg-red-100 text-red-600',
  EXPIREE: 'bg-gray-100 text-gray-500',
  MASQUEE: 'bg-orange-100 text-orange-600',
}

export default async function AdminAnnoncesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') redirect('/tableau-de-bord')

  const annonces = await prisma.annonce.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  const stats = {
    total: annonces.length,
    active: annonces.filter(a => a.status === 'ACTIVE').length,
    vendue: annonces.filter(a => a.status === 'VENDUE').length,
    masquee: annonces.filter(a => a.status === 'MASQUEE').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Modération des annonces</h1>
        <Link href="/annonces" target="_blank" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          Voir la page publique →
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Actives', value: stats.active, color: 'text-green-600' },
          { label: 'Vendues', value: stats.vendue, color: 'text-red-600' },
          { label: 'Masquées', value: stats.masquee, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
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
              const cat = CATEGORIES[annonce.category] ?? { emoji: '📌', label: annonce.category }
              return (
                <tr key={annonce.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {annonce.photoPath && (
                        <img src={annonce.photoPath} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link href={`/annonces/${annonce.id}`} target="_blank" className="font-medium text-gray-900 hover:text-indigo-600 line-clamp-1">
                          {annonce.title}
                        </Link>
                        <p className="text-xs text-gray-400">{cat.emoji} {cat.label}{annonce.price != null ? ` · ${annonce.price.toFixed(0)} €` : ''}{annonce.location ? ` · ${annonce.location}` : ''}</p>
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
                      {annonce.status}
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
    </div>
  )
}

