import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'
import { sendTaskListEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST : le chef envoie par e-mail à chaque membre concerné la liste des tâches qui
// lui sont assignées (utile si le membre ne se connecte pas). Body { onlyPending }
// pour ne notifier que ceux ayant encore des tâches à faire.
export async function POST(req: NextRequest, { params }: { params: { id: string; listId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, groupId, 'feature_tasks'))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const list = await prisma.taskList.findFirst({
    where: { id: Number(params.listId), groupId },
    include: {
      group: { select: { name: true } },
      tasks: {
        include: { assignees: { include: { user: { select: { id: true, email: true, name: true, emailVerified: true } } } } },
      },
    },
  })
  if (!list) return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })

  const onlyPending = (await req.json().catch(() => ({})))?.onlyPending === true
  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  // Regroupe les tâches par membre assigné.
  const byUser = new Map<number, { user: { email: string; name: string; emailVerified: Date | null }; tasks: { label: string; details: string | null; done: boolean }[] }>()
  for (const task of list.tasks) {
    for (const a of task.assignees) {
      if (!byUser.has(a.user.id)) byUser.set(a.user.id, { user: a.user, tasks: [] })
      byUser.get(a.user.id)!.tasks.push({ label: task.label, details: task.details, done: task.done })
    }
  }

  let sent = 0
  let skipped = 0
  await Promise.all(
    Array.from(byUser.values()).map(async ({ user, tasks }) => {
      if (!user.emailVerified) { skipped++; return }
      const relevant = onlyPending ? tasks.filter((t) => !t.done) : tasks
      if (relevant.length === 0) { skipped++; return }
      try {
        await sendTaskListEmail({ email: user.email, name: user.name }, list.group.name, groupId, { title: list.title, dueDate: list.dueDate }, relevant, baseUrl)
        sent++
      } catch (e) {
        console.error('task list email', user.email, e)
        skipped++
      }
    })
  )

  return NextResponse.json({ ok: true, sent, skipped })
}
