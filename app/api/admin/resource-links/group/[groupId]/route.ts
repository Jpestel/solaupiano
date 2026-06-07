import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveResourceLinks } from '@/lib/resource-links-server'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function GET(_req: NextRequest, { params }: { params: { groupId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const links = await getEffectiveResourceLinks(Number(params.groupId))
  return NextResponse.json(links)
}

// Définit l'état d'un lien pour ce groupe. active = true|false (surcharge), null = retour au défaut.
export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const groupId = Number(params.groupId)
  const { linkId, active } = await req.json()
  if (!linkId) return NextResponse.json({ error: 'linkId requis.' }, { status: 400 })

  if (active === null) {
    await prisma.groupResourceLink.deleteMany({ where: { groupId, resourceLinkId: Number(linkId) } })
  } else {
    await prisma.groupResourceLink.upsert({
      where: { groupId_resourceLinkId: { groupId, resourceLinkId: Number(linkId) } },
      update: { active: !!active },
      create: { groupId, resourceLinkId: Number(linkId), active: !!active },
    })
  }
  return NextResponse.json({ ok: true })
}
