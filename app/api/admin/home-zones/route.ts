import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseHomeZones, HOME_ZONES } from '@/lib/home-zones'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) { return session?.user?.siteRole === 'ADMIN' }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const row = await prisma.siteSetting.findUnique({ where: { key: 'home_zones' } })
  return NextResponse.json({ zones: parseHomeZones(row?.value), defs: HOME_ZONES })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  // Normalise : ne garde que les clés connues, dédoublonne, complète les manquantes.
  const zones = parseHomeZones(JSON.stringify(body.zones ?? []))
  await prisma.siteSetting.upsert({
    where: { key: 'home_zones' },
    create: { key: 'home_zones', value: JSON.stringify(zones) },
    update: { value: JSON.stringify(zones) },
  })
  return NextResponse.json({ success: true, zones })
}
