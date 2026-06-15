import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PREVIEW_COOKIE } from '@/lib/preview'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

// Démarre un aperçu : pose le cookie { groupId, groupName, role }.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { groupId, role } = await req.json().catch(() => ({}))
  const gid = Number(groupId)
  if (!Number.isInteger(gid) || (role !== 'CHEF' && role !== 'MEMBRE')) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  const group = await prisma.group.findUnique({ where: { id: gid }, select: { name: true } })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(PREVIEW_COOKIE, JSON.stringify({ groupId: gid, groupName: group.name, role }), {
    httpOnly: false, // lu aussi côté client pour afficher le bandeau
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2, // garde-fou : 2 h
  })
  return res
}

// Quitte l'aperçu : supprime le cookie.
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PREVIEW_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
