import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) {
  return session?.user?.siteRole === 'ADMIN'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { label, emoji, hint, isActive, sortOrder } = await req.json()
  const cat = await prisma.annonceCategorie.update({
    where: { id: Number(params.id) },
    data: {
      ...(label !== undefined && { label }),
      ...(emoji !== undefined && { emoji }),
      ...(hint !== undefined && { hint }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })
  return NextResponse.json(cat)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.annonceCategorie.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
