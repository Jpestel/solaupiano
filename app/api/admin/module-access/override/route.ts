import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
