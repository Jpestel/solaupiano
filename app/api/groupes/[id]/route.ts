import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (!membership && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            include: {
              instruments: { include: { instrument: true } },
            },
          },
        },
      },
    },
  })

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  return NextResponse.json(group)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (session.user.siteRole !== 'ADMIN' && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      name: body.name,
      description: body.description,
      ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
      lookingFor: body.lookingFor ?? null,
      ...('lookingFor' in body && {
        lookingForSince: (() => {
          if (!body.lookingFor) return null
          try { const arr = JSON.parse(body.lookingFor); return arr.length > 0 ? new Date() : null } catch { return null }
        })(),
      }),
    },
  })

  return NextResponse.json(group)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const groupId = Number(params.id)
  await prisma.group.delete({ where: { id: groupId } })

  return NextResponse.json({ success: true })
}
