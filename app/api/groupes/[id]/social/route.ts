import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function canPost(groupId: number, userId: number, isAdmin: boolean) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
  if (!group) return false
  return coChefCanDo({ createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null }, userId, isAdmin, 'social', 'post')
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  if (!(await canPost(groupId, Number(session.user.id), session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const [posts, members] = await Promise.all([
    prisma.socialPost.findMany({
      where: { groupId }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, caption: true, images: true, taggedUserIds: true, createdAt: true, author: { select: { name: true } } },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, imageConsent: true, user: { select: { name: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
  ])
  return NextResponse.json({
    posts: posts.map((p) => ({ ...p, images: safeImages(p.images), taggedUserIds: safeIds(p.taggedUserIds) })),
    members: members.map((m) => ({ userId: m.userId, name: m.user.name, consent: m.imageConsent ?? null })),
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  const userId = Number(session.user.id)
  if (!(await canPost(groupId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const caption = String(b.caption || '').slice(0, 5000)
  const images = Array.isArray(b.images) ? b.images.filter((x: unknown) => typeof x === 'string').slice(0, 10) : []
  if (!caption.trim() && images.length === 0) {
    return NextResponse.json({ error: 'Ajoutez du texte ou au moins une image.' }, { status: 400 })
  }

  // Droit à l'image : les membres identifiés sur ce post doivent avoir consenti.
  const taggedIds: number[] = Array.isArray(b.taggedUserIds)
    ? Array.from(new Set(b.taggedUserIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n))))
    : []
  if (taggedIds.length > 0) {
    const tagged = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: taggedIds } },
      select: { userId: true, imageConsent: true, user: { select: { name: true } } },
    })
    const knownIds = new Set(tagged.map((m) => m.userId))
    const unknown = taggedIds.filter((id) => !knownIds.has(id))
    if (unknown.length > 0) {
      return NextResponse.json({ error: 'Un membre identifié ne fait pas partie du groupe.' }, { status: 400 })
    }
    const notConsented = tagged.filter((m) => m.imageConsent !== true)
    if (notConsented.length > 0) {
      return NextResponse.json({
        error: `Droit à l'image manquant : ${notConsented.map((m) => m.user.name).join(', ')} n'a pas accepté la diffusion de son visage. Retirez-le(s) ou attendez son accord.`,
      }, { status: 403 })
    }
  }

  const post = await prisma.socialPost.create({
    data: { groupId, authorId: userId, caption, images: JSON.stringify(images), taggedUserIds: JSON.stringify(taggedIds) },
    select: { id: true, caption: true, images: true, taggedUserIds: true, createdAt: true, author: { select: { name: true } } },
  })
  return NextResponse.json({ ...post, images: safeImages(post.images), taggedUserIds: safeIds(post.taggedUserIds) }, { status: 201 })
}

function safeImages(s: string): string[] {
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : [] } catch { return [] }
}

function safeIds(s: string | null): number[] {
  if (!s) return []
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((x) => Number.isInteger(x)) : [] } catch { return [] }
}
