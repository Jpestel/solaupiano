import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const instruments = await prisma.instrument.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(instruments)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
