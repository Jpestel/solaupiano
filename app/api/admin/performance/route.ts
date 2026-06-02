import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import os from 'os'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function dirSize(dir: string): number {
  let total = 0
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name)
      if (e.isDirectory()) total += dirSize(fp)
      else { try { total += fs.statSync(fp).size } catch {} }
    }
  } catch {}
  return total
}

// Latence de la boucle d'événements (drift de setTimeout)
async function measureEventLoopLag(): Promise<number> {
  let max = 0
  for (let i = 0; i < 4; i++) {
    const s = process.hrtime.bigint()
    await new Promise((r) => setTimeout(r, 25))
    const lag = Number(process.hrtime.bigint() - s) / 1e6 - 25
    if (lag > max) max = lag
  }
  return Math.max(0, Math.round(max * 10) / 10)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const startedAt = Date.now()

  // ── Système ──
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const cpus = os.cpus()
  const load = os.loadavg() // [1m, 5m, 15m]
  const system = {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    cpuModel: cpus[0]?.model?.trim() || 'inconnu',
    cpuCount: cpus.length,
    load1: Math.round(load[0] * 100) / 100,
    load5: Math.round(load[1] * 100) / 100,
    load15: Math.round(load[2] * 100) / 100,
    loadPercent: cpus.length ? Math.round((load[0] / cpus.length) * 100) : 0,
    memTotal: totalMem,
    memUsed: totalMem - freeMem,
    memPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    uptimeSec: Math.round(os.uptime()),
  }

  // ── Application (process Node) ──
  const mem = process.memoryUsage()
  const lag = await measureEventLoopLag()
  const app = {
    nodeVersion: process.version,
    pid: process.pid,
    uptimeSec: Math.round(process.uptime()),
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    eventLoopLagMs: lag,
    tz: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  // ── Base de données ──
  const database: Record<string, unknown> = {}
  try {
    const t0 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    database.pingMs = Date.now() - t0
  } catch (e: any) { database.pingError = String(e?.message || e) }
  try {
    const rows = await prisma.$queryRaw<{ bytes: bigint | number | null }[]>`SELECT SUM(data_length + index_length) AS bytes FROM information_schema.tables WHERE table_schema = DATABASE()`
    database.sizeBytes = Number(rows?.[0]?.bytes ?? 0)
  } catch {}
  try {
    const [users, groups, songs, resources, rehearsals, concerts] = await Promise.all([
      prisma.user.count(), prisma.group.count(), prisma.song.count(),
      prisma.resource.count(), prisma.rehearsal.count(), prisma.concert.count(),
    ])
    database.counts = { users, groups, songs, resources, rehearsals, concerts }
  } catch {}

  // ── Disque / stockage ──
  const disk: Record<string, unknown> = {}
  try {
    const st: any = await (fs.promises as any).statfs(process.cwd())
    const total = st.blocks * st.bsize
    const avail = st.bavail * st.bsize
    disk.total = total
    disk.free = avail
    disk.used = total - st.bfree * st.bsize
    disk.percent = total > 0 ? Math.round(((total - avail) / total) * 100) : 0
  } catch (e: any) { disk.error = String(e?.message || e) }
  try {
    disk.uploadsBytes = dirSize(path.join(process.cwd(), 'public', 'uploads'))
  } catch {}

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    serverComputeMs: Date.now() - startedAt,
    system, app, database, disk,
  })
}
