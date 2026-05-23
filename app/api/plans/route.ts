import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PLAN_SEEDS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  let plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  // Auto-seed if empty
  if (plans.length === 0) {
    await prisma.plan.createMany({ data: DEFAULT_PLAN_SEEDS })
    plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

  return NextResponse.json(plans.map((p) => ({
    ...p,
    storageGb: Number(p.storageGb),
    priceMonthly: p.priceMonthly !== null ? Number(p.priceMonthly) : null,
  })))
}
