import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPerfAlert } from '@/lib/email'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  // Métriques
  const cpus = os.cpus().length || 1
  const loadPercent = Math.round((os.loadavg()[0] / cpus) * 100)
  const memPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)

  let diskPercent = 0
  try {
    const st: any = await (fs.promises as any).statfs(process.cwd())
    const total = st.blocks * st.bsize
    diskPercent = total > 0 ? Math.round(((total - st.bavail * st.bsize) / total) * 100) : 0
  } catch {}

  let dbPingMs = 0
  try { const t = Date.now(); await prisma.$queryRaw`SELECT 1`; dbPingMs = Date.now() - t } catch {}

  let eventLoopLagMs = 0
  { const s = process.hrtime.bigint(); await new Promise((r) => setTimeout(r, 25)); eventLoopLagMs = Math.max(0, Math.round(Number(process.hrtime.bigint() - s) / 1e6 - 25)) }

  await prisma.perfSnapshot.create({ data: { loadPercent, memPercent, diskPercent, dbPingMs, eventLoopLagMs } })

  // Purge > 7 jours
  await prisma.perfSnapshot.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })

  // Alerte si seuil critique (throttle 1 h)
  const alerts: string[] = []
  if (loadPercent >= 90) alerts.push(`CPU ${loadPercent}%`)
  if (memPercent >= 90) alerts.push(`Mémoire ${memPercent}%`)
  if (diskPercent >= 90) alerts.push(`Disque ${diskPercent}%`)
  if (dbPingMs >= 1000) alerts.push(`Latence BDD ${dbPingMs} ms`)

  let alerted = false
  if (alerts.length > 0) {
    const last = await prisma.siteSetting.findUnique({ where: { key: 'perf_last_alert_at' } })
    const lastMs = last ? Number(last.value) : 0
    if (Date.now() - lastMs > 60 * 60 * 1000) {
      const admin = await prisma.user.findFirst({ where: { siteRole: 'ADMIN' }, select: { email: true } })
      if (admin?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
        await sendPerfAlert(admin.email, alerts.join(', '), `CPU ${loadPercent}% · Mémoire ${memPercent}% · Disque ${diskPercent}% · BDD ${dbPingMs} ms`, baseUrl).catch(() => {})
        await prisma.siteSetting.upsert({ where: { key: 'perf_last_alert_at' }, create: { key: 'perf_last_alert_at', value: String(Date.now()) }, update: { value: String(Date.now()) } })
        alerted = true
      }
    }
  }

  return NextResponse.json({ ok: true, loadPercent, memPercent, diskPercent, dbPingMs, eventLoopLagMs, alerts, alerted })
}
