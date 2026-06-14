import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Préférence personnelle : afficher ou masquer les bulles d'aide.
// hidden === true  → l'utilisateur a choisi de masquer les bulles.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ hidden: false })
  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: { helpBubblesOptOut: true } })
  return NextResponse.json({ hidden: !!user?.helpBubblesOptOut })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (typeof b.hidden !== 'boolean') return NextResponse.json({ error: 'Valeur invalide.' }, { status: 400 })
  await prisma.user.update({ where: { id: Number(session.user.id) }, data: { helpBubblesOptOut: b.hidden } })
  return NextResponse.json({ hidden: b.hidden })
}
