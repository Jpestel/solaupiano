import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolvePermissions } from '@/lib/permissions'

// PATCH — update chef permissions (founder only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true },
  })

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Only the founder (or site admin) can update permissions
  if (!isAdmin && group.createdBy !== userId) {
    return NextResponse.json({ error: 'Réservé au fondateur du groupe.' }, { status: 403 })
  }

  const body = await req.json()
  // Validate and sanitize — resolvePermissions normalizes the input
  const sanitized = resolvePermissions(body)

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { chefPermissions: sanitized as any },
    select: { chefPermissions: true },
  })

  return NextResponse.json(updated.chefPermissions)
}
