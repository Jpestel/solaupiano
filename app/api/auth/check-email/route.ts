import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ unverified: false })

  const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } })
  return NextResponse.json({ unverified: user ? !user.emailVerified : false })
}
