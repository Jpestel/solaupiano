import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) {
  return session?.user?.siteRole === 'ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const categories = await prisma.annonceCategorie.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { key, label, emoji, hint, isActive, sortOrder } = await req.json()
  if (!key || !label) return NextResponse.json({ error: 'key et label sont requis.' }, { status: 400 })

  const cat = await prisma.annonceCategorie.create({
    data: {
      key: key.toUpperCase().replace(/\s+/g, '_'),
      label,
      emoji: emoji || '📌',
      hint: hint || null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    },
  })
  return NextResponse.json(cat, { status: 201 })
}
