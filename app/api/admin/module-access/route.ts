import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/module-access
// Body: { moduleKey, planKey, enabled }
// Toggle plan-level access for a module
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleKey, planKey, enabled } = await req.json()
  if (!moduleKey || !planKey || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const record = await prisma.moduleAccess.upsert({
    where: { moduleKey_planKey: { moduleKey, planKey } },
    create: { moduleKey, planKey, enabled },
    update: { enabled },
  })

  return NextResponse.json(record)
}

// DELETE /api/admin/module-access
// Body: { moduleKey, planKey }
// Remove a plan-level rule (revert to default)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleKey, planKey } = await req.json()
  if (!moduleKey || !planKey) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await prisma.moduleAccess.deleteMany({
    where: { moduleKey, planKey },
  })

  return NextResponse.json({ ok: true })
}
