import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { blogColor } from '@/lib/blog'
import { BlogLikeShare } from '@/components/BlogLikeShare'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d) : '')

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await prisma.blogPost.findUnique({ where: { slug: params.slug }, select: { title: true, excerpt: true, coverImage: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') return { title: 'Article — Sol au piano' }
  return {
    title: `${post.title} — Sol au piano`,
    description: post.excerpt || undefined,
    openGraph: { title: post.title, description: post.excerpt || undefined, images: post.coverImage ? [`${SITE}${post.coverImage}`] : undefined },
  }
}

export default async function BlogArticle({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    include: {
      category: { select: { name: true, slug: true, color: true } },
      author: { select: { name: true } },
      _count: { select: { likes: true } },
    },
  })
  if (!post || post.status !== 'PUBLISHED') notFound()

  // Vue + like de l'utilisateur (non bloquant)
  prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
  let likedByMe = false
  if (session?.user?.id) {
    const l = await prisma.blogLike.findUnique({ where: { postId_userId: { postId: post.id, userId: Number(session.user.id) } }, select: { id: true } })
    likedByMe = !!l
  }

  const col = post.category ? blogColor(post.category.color) : null
  const url = `${SITE}/blog/${post.slug}`

  // Autres articles
  const more = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', id: { not: post.id } },
    orderBy: { publishedAt: 'desc' }, take: 3,
    select: { id: true, title: true, slug: true, coverImage: true },
  })

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/blog" className="text-sm font-semibold text-gray-500 hover:text-gray-700">← Le blog</Link>
          <Link href={session ? '/tableau-de-bord' : '/connexion'} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">{session ? 'Mon espace →' : 'Connexion →'}</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {post.category && (
          <Link href={`/blog?cat=${post.category.slug}`} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${col!.bg} ${col!.text}`}>{post.category.name}</Link>
        )}
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">{post.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
          <span>{fmtDate(post.publishedAt)}</span>
          {post.author?.name && <span>· par {post.author.name}</span>}
          <span>· {post.viewCount + 1} vues</span>
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-6 w-full rounded-2xl border border-gray-100" />
        )}

        <div className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="mt-10 pt-6 border-t border-gray-100">
          <BlogLikeShare postId={post.id} initialCount={post._count.likes} initialLiked={likedByMe} loggedIn={!!session} url={url} title={post.title} />
        </div>
      </article>

      {more.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">À lire aussi</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {more.map((m) => (
                <Link key={m.id} href={`/blog/${m.slug}`} className="group rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                    {m.coverImage
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.coverImage} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-indigo-100 to-violet-100">🎵</div>}
                  </div>
                  <p className="p-3 text-sm font-semibold text-gray-800 group-hover:text-indigo-700 line-clamp-2">{m.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
