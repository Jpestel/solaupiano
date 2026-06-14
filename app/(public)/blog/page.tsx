import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { blogColor } from '@/lib/blog'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Blog — Sol au piano',
  description: 'Actualités, conseils et coulisses pour les musiciens en groupe.',
}

const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d) : '')

export default async function BlogIndex({ searchParams }: { searchParams: { cat?: string } }) {
  const session = await getServerSession(authOptions)
  const cat = searchParams.cat || null

  const [categories, posts] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, color: true } }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', ...(cat ? { category: { slug: cat } } : {}) },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true,
        category: { select: { name: true, slug: true, color: true } },
        _count: { select: { likes: true } },
      },
    }),
  ])

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-indigo-900">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm">🎶</span>
            Sol au piano
          </Link>
          <Link href={session ? '/tableau-de-bord' : '/connexion'} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {session ? 'Mon espace →' : 'Connexion →'}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-indigo-200 font-semibold text-sm mb-2">LE BLOG</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Le journal des musiciens</h1>
          <p className="mt-3 text-indigo-100 max-w-xl">Actualités, conseils de répétition, coulisses et nouveautés de Sol au piano.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filtres catégories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link href="/blog" className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!cat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>Tout</Link>
            {categories.map((c) => {
              const col = blogColor(c.color)
              const active = cat === c.slug
              return (
                <Link key={c.id} href={`/blog?cat=${c.slug}`} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border ${active ? 'bg-indigo-600 text-white border-indigo-600' : `bg-white ${col.text} ${col.border} hover:opacity-80`}`}>
                  {c.name}
                </Link>
              )
            })}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-2">✍️</p>
            <p className="font-medium text-gray-500">Aucun article pour l’instant.</p>
          </div>
        ) : (
          <>
            {/* Article à la une */}
            {featured && !cat && (
              <Link href={`/blog/${featured.slug}`} className="group block rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow mb-10">
                <div className="grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-gray-100 overflow-hidden">
                    {featured.coverImage
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={featured.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                      : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-indigo-100 to-violet-100">🎼</div>}
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    {featured.category && <CategoryChip name={featured.category.name} color={featured.category.color} />}
                    <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 group-hover:text-indigo-700 transition-colors">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-2 text-gray-500 line-clamp-3">{featured.excerpt}</p>}
                    <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
                      <span>{fmtDate(featured.publishedAt)}</span>
                      <span>· ❤️ {featured._count.likes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grille */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(cat ? posts : rest).map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                    {p.coverImage
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-100 to-violet-100">🎵</div>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {p.category && <CategoryChip name={p.category.name} color={p.category.color} />}
                    <h3 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">{p.title}</h3>
                    {p.excerpt && <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{p.excerpt}</p>}
                    <div className="mt-auto pt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span>{fmtDate(p.publishedAt)}</span>
                      <span>· ❤️ {p._count.likes}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CategoryChip({ name, color }: { name: string; color: string }) {
  const c = blogColor(color)
  return <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>{name}</span>
}
