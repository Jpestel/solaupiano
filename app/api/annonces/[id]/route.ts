import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// ── GET /api/annonces/[id] ──────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const annonce = await prisma.annonce.findUnique({
    where: { id: Number(params.id) },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
  if (!annonce || annonce.status === 'MASQUEE') {
    return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })
  }

  // Contact info masqué si non connecté
  const result: any = { ...annonce }
  if (!session) {
    result.contactEmail = null
    result.contactPhone = null
    result.contactHidden = true
  }

  return NextResponse.json(result)
}

// ── PATCH /api/annonces/[id] ────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonce = await prisma.annonce.findUnique({ where: { id: Number(params.id) } })
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  const isOwner = annonce.userId === Number(session.user.id)
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json()
  const { status, title, description, price, location, contactEmail, contactPhone } = body

  const updated = await prisma.annonce.update({
    where: { id: Number(params.id) },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(location !== undefined && { location }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
    },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/annonces/[id] ───────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonce = await prisma.annonce.findUnique({ where: { id: Number(params.id) } })
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  const isOwner = annonce.userId === Number(session.user.id)
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  // Supprimer la photo si elle existe
  if (annonce.photoPath) {
    const fullPath = `./public${annonce.photoPath}`
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  }

  await prisma.annonce.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
