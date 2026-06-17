import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getScheduleDef, parseSchedule } from '@/lib/email-schedules'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) { return session?.user?.siteRole === 'ADMIN' }

// PUT — enregistre la planification d'un mail événementiel
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const def = getScheduleDef(params.key)
  if (!def) return NextResponse.json({ error: 'Mail non planifiable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  // On normalise via parseSchedule (validation + bornes)
  const sched = parseSchedule(JSON.stringify(body), def.default)

  await prisma.siteSetting.upsert({
    where: { key: `email_sched_${params.key}` },
    create: { key: `email_sched_${params.key}`, value: JSON.stringify(sched) },
    update: { value: JSON.stringify(sched) },
  })

  return NextResponse.json({ success: true, schedule: sched })
}

// DELETE — remet la planification par défaut
export async function DELETE(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.siteSetting.deleteMany({ where: { key: `email_sched_${params.key}` } })
  return NextResponse.json({ success: true })
}
