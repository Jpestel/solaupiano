import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MODULES } from '@/lib/modules'
import { GROUP_FEATURE_KEYS } from '@/lib/features'

// POST /api/admin/module-access/override
// Body: { moduleKey, type: 'user'|'group', targetId, allowed }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleKey, type, targetId, allowed } = await req.json()
  if (!moduleKey || !type || !targetId || typeof allowed !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  // Une clé inconnue créerait une dérogation que rien ne lit : on la refuse.
  if (!MODULES.some((m) => m.key === moduleKey) && !GROUP_FEATURE_KEYS.has(moduleKey)) {
    return NextResponse.json({ error: 'Module inconnu' }, { status: 400 })
  }

  if (type === 'user') {
    const record = await prisma.moduleUserOverride.upsert({
      where: { moduleKey_userId: { moduleKey, userId: targetId } },
      create: { moduleKey, userId: targetId, allowed },
      update: { allowed },
    })
    return NextResponse.json(record)
  }

  if (type === 'group') {
    const record = await prisma.moduleGroupOverride.upsert({
      where: { moduleKey_groupId: { moduleKey, groupId: targetId } },
      create: { moduleKey, groupId: targetId, allowed },
      update: { allowed },
    })
    return NextResponse.json(record)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
