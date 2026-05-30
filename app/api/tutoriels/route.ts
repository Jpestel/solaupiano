import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/tutoriels?moduleKey=tool_accordeur
// Returns published tutorials, optionally filtered by moduleKey
export async function GET(req: NextRequest) {
  const moduleKey = req.nextUrl.searchParams.get('moduleKey') || undefined
  const tutorials = await prisma.tutorial.findMany({
    where: { published: true, ...(moduleKey ? { moduleKey } : {}) },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, title: true, description: true, moduleKey: true, videoPath: true, fileSizeBytes: true },
  })
  return NextResponse.json(tutorials)
}
