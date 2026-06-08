import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function isMember(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return true
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return !!m
}

// POST — créer une catégorie (tout membre)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!(await isMember(userId, groupId, isAdmin))) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'Nom de catégorie requis.' }, { status: 400 })

  try {
    const cat = await prisma.galleryCategory.create({ data: { groupId, name }, select: { id: true, name: true } })
    return NextResponse.json(cat, { status: 201 })
  } catch (e: unknown) {
    // Doublon (unique groupId+name)
    if (typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === 'P2002') {
      const existing = await prisma.galleryCategory.findFirst({ where: { groupId, name }, select: { id: true, name: true } })
      if (existing) return NextResponse.json(existing, { status: 200 })
    }
    return NextResponse.json({ error: 'Impossible de créer la catégorie.' }, { status: 500 })
  }
}
