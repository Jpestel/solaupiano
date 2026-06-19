import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { PublicNav } from '../PublicNav'
import { GroupCard } from '@/components/GroupCard'

export const dynamic = 'force-dynamic'

const PER_PAGE = 24

export default async function GroupesInscritsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string }
}) {
  const session = await getServerSession(authOptions)
  const isLoggedIn = !!session?.user
  const q = (searchParams?.q ?? '').trim()
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1)

  // MySQL : la collation _ci compare déjà sans casse (ne PAS utiliser mode:'insensitive').
  const where = {
    isHidden: false,
    archivedAt: null,
    isTest: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { style: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, groups, siteSettings] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        style: true,
        coverUrl: true,
        isPublic: true,
        lookingFor: true,
        _count: { select: { members: true } },
        groupPage: { select: { slug: true, published: true, showContact: true } },
      },
      orderBy: [{ isPublic: 'desc' }, { lookingForSince: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    getSiteSettings(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const pageUrl = (p: number) => `/groupes-inscrits?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">{siteSettings.siteIcon}</span>
            </div>
            <span className="font-bold text-indigo-900 text-lg">Sol au piano</span>
          </Link>
          <PublicNav isLoggedIn={isLoggedIn} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-indigo-600">Accueil</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{siteSettings.groupCardSectionTitle}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">🔍</span>
          {siteSettings.groupCardSectionTitle}
          <span className="text-base font-medium text-gray-400">({total})</span>
        </h1>

        {/* Recherche */}
        <form method="GET" className="mt-5 flex gap-2 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un groupe, un style…"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Rechercher
          </button>
          {q && (
            <Link href="/groupes-inscrits" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 self-stretch flex items-center">
              ✕
            </Link>
          )}
        </form>

        {/* Résultats */}
        {groups.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-gray-200 px-5 py-12 text-center bg-white">
            <p className="text-3xl mb-3">🎸</p>
            <p className="text-sm text-gray-500">
              {q ? `Aucun groupe ne correspond à « ${q} ».` : 'Aucun groupe à afficher pour l’instant.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} settings={siteSettings} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {page > 1 && (
                  <Link href={pageUrl(page - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">← Précédent</Link>
                )}
                <span className="px-3 py-2 text-sm text-gray-500">Page {page} / {totalPages}</span>
                {page < totalPages && (
                  <Link href={pageUrl(page + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Suivant →</Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
