import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { getGroupStorageInfo } from '@/lib/storage'

type BarData = { l: string; b: string[]; r: string }
type ChartSound = { bar?: number; label: string; url?: string }

function beatsPerBar(timeSig: string): number {
  const map: Record<string, number> = {
    '4/4': 4,
    '3/4': 3,
    '6/8': 2,
    '2/4': 2,
    '5/4': 5,
    '12/8': 4,
    '2/2': 2,
  }
  return map[timeSig] ?? 4
}

function normalizeCells(raw: unknown, totalBars: number, bpb: number): BarData[] {
  const src = Array.isArray(raw) ? raw : []
  const result: BarData[] = []

  for (let i = 0; i < totalBars; i++) {
    const item = src[i]

    if (item && typeof item === 'object' && !Array.isArray(item) && 'b' in item) {
      const bar = item as any
      const beats = (Array.isArray(bar.b) ? bar.b : []).map((v: any) => typeof v === 'string' ? v : '')
      result.push({
        l: typeof bar.l === 'string' ? bar.l : '',
        b: beats.length < bpb ? [...beats, ...Array(bpb - beats.length).fill('')] : beats.slice(0, bpb),
        r: typeof bar.r === 'string' ? bar.r : '',
      })
    } else if (item && typeof item === 'object' && !Array.isArray(item) && 'chord' in item) {
      const legacy = item as any
      const beats = Array(bpb).fill('')
      beats[0] = typeof legacy.chord === 'string' ? legacy.chord : ''
      result.push({ l: typeof legacy.section === 'string' ? legacy.section : '', b: beats, r: '' })
    } else if (Array.isArray(item)) {
      const beats = item.map((v: any) => typeof v === 'string' ? v : '')
      result.push({ l: '', b: beats.length < bpb ? [...beats, ...Array(bpb - beats.length).fill('')] : beats.slice(0, bpb), r: '' })
    } else if (typeof item === 'string') {
      const beats = Array(bpb).fill('')
      beats[0] = item
      result.push({ l: '', b: beats, r: '' })
    } else {
      result.push({ l: '', b: Array(bpb).fill(''), r: '' })
    }
  }

  return result
}

function parseChartSounds(value: string | null): ChartSound[] {
  const trimmed = value?.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return [{ label: trimmed }]
    return parsed
      .map((item): ChartSound | null => {
        if (!item || typeof item !== 'object') return null
        const label = typeof item.label === 'string' ? item.label.trim() : ''
        const url = typeof item.url === 'string' ? item.url.trim() : undefined
        const bar = Number.isFinite(Number(item.bar)) ? Number(item.bar) : undefined
        if (!label && !url) return null
        return { bar, label: label || url || 'Son', url }
      })
      .filter((item): item is ChartSound => Boolean(item))
  } catch {
    return [{ label: trimmed }]
  }
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .toLowerCase() || 'grille'
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: string, stroke: string) {
  doc.setFillColor(fill)
  doc.setDrawColor(stroke)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD')
}

function generateChartPdf(chart: any, textSize: number) {
  const bpb = beatsPerBar(chart.timeSignature)
  const bpr = Math.max(1, Number(chart.barsPerRow) || 4)
  const cells = normalizeCells(chart.cells, chart.totalBars, bpb)
  const sounds = parseChartSounds(chart.sons)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - margin * 2
  const cellW = contentW / bpr
  const barHeaderH = 6
  const beatH = 16
  const rowH = barHeaderH + beatH
  const rowGap = 4
  const footerBottom = pageH - margin

  const drawHeader = () => {
    doc.setTextColor(17, 24, 39)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(chart.title, margin, 18, { maxWidth: contentW * 0.7 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    const meta = [
      chart.song?.title ? `Morceau : ${chart.song.title}` : null,
      chart.tempo ? `Tempo : ${chart.tempo}` : null,
      chart.keySignature ? `Tonalite : ${chart.keySignature}` : null,
      chart.timeSignature,
      `${chart.totalBars} mesures`,
    ].filter(Boolean).join('  |  ')
    doc.text(meta, margin, 25, { maxWidth: contentW })
  }

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text('Genere depuis Sol au piano', margin, pageH - 6)
  }

  drawHeader()
  drawFooter()
  let y = 33

  for (let i = 0; i < cells.length; i += bpr) {
    if (y + rowH > footerBottom - 8) {
      doc.addPage()
      drawHeader()
      drawFooter()
      y = 33
    }

    const rowIndex = Math.floor(i / bpr)
    for (let j = 0; j < bpr; j++) {
      const barIdx = i + j
      const bar = cells[barIdx]
      const x = margin + j * cellW
      if (!bar) continue

      drawRoundedRect(doc, x, y, cellW, rowH, rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb', '#d1d5db')
      doc.setDrawColor('#e5e7eb')
      doc.line(x, y + barHeaderH, x + cellW, y + barHeaderH)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(156, 163, 175)
      doc.text(String(barIdx + 1), x + 1.8, y + 4.2)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(67, 56, 202)
      if (bar.l) doc.text(bar.l, x + 8, y + 4.4, { maxWidth: cellW * 0.35 })
      if (bar.r) doc.text(bar.r, x + cellW - 2, y + 4.4, { align: 'right', maxWidth: cellW * 0.35 })

      for (let beatIdx = 0; beatIdx < bpb; beatIdx++) {
        const beatX = x + (cellW / bpb) * beatIdx
        if (beatIdx > 0) {
          doc.setDrawColor('#eeeeee')
          doc.line(beatX, y + barHeaderH, beatX, y + rowH)
        }
        const beat = bar.b[beatIdx] || ''
        if (!beat.trim()) continue
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(textSize)
        doc.setTextColor(17, 24, 39)
        const parts = beat.trim().split(/\s+/).slice(0, 3)
        const centerX = beatX + cellW / bpb / 2
        const baseY = y + barHeaderH + 7
        parts.forEach((part, index) => {
          doc.text(part, centerX, baseY + index * Math.max(4, textSize * 0.38), { align: 'center', maxWidth: cellW / bpb - 2 })
        })
      }
    }
    y += rowH + rowGap
  }

  if (sounds.length > 0) {
    if (y + 24 > footerBottom) {
      doc.addPage()
      drawHeader()
      drawFooter()
      y = 33
    }
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(55, 65, 81)
    doc.text('SONS :', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    sounds.forEach((sound) => {
      const line = `${sound.bar ? `Mesure ${sound.bar} - ` : ''}${sound.label}${sound.url ? ` - ${sound.url}` : ''}`
      const wrapped = doc.splitTextToSize(line, contentW)
      if (y + wrapped.length * 4 > footerBottom) {
        doc.addPage()
        drawHeader()
        drawFooter()
        y = 33
      }
      doc.text(wrapped, margin, y)
      y += wrapped.length * 4 + 1
    })
  }

  return Buffer.from(doc.output('arraybuffer'))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })

  const chartId = Number(params.id)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const body = await req.json().catch(() => ({}))
  const textSize = Math.max(9, Math.min(22, Number(body.textSize) || 12))

  const chart = await prisma.chordChart.findUnique({
    where: { id: chartId },
    include: {
      group: { select: { id: true, createdBy: true, chefPermissions: true } },
      song: { select: { id: true, title: true, groupId: true } },
    },
  })
  if (!chart) return NextResponse.json({ error: 'Grille introuvable.' }, { status: 404 })
  if (!chart.songId || !chart.song) {
    return NextResponse.json({ error: 'Cette grille doit d’abord etre liee a un morceau pour creer une ressource PDF.' }, { status: 400 })
  }

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: chart.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })

  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Seul un chef peut ajouter une ressource au morceau.' }, { status: 403 })
  }
  if (!isAdmin && !coChefCanDo(chart.group, userId, isAdmin, 'ressources', 'create')) {
    return NextResponse.json({ error: 'Action non autorisee par le fondateur du groupe.' }, { status: 403 })
  }

  const pdf = generateChartPdf(chart, textSize)
  const storageInfo = await getGroupStorageInfo(chart.groupId)
  if (storageInfo.limitBytes <= 0) {
    return NextResponse.json({ error: "L'ajout de fichiers n'est pas disponible avec ce plan.", code: 'PLAN_FEATURE_LOCKED' }, { status: 403 })
  }
  if (storageInfo.usedBytes + pdf.length > storageInfo.limitBytes) {
    return NextResponse.json({ error: 'Quota de stockage depasse.', code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
  }

  const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
  fs.mkdirSync(uploadDir, { recursive: true })
  const fileName = `${Date.now()}-grille-${sanitizeFileName(chart.title)}.pdf`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, pdf)
  const relativePath = filePath.startsWith('./public')
    ? filePath.replace('./public', '')
    : `/uploads/${path.basename(filePath)}`

  const resourceName = `Grille - ${chart.title}`
  const [resource] = await prisma.$transaction([
    prisma.resource.create({
      data: {
        songId: chart.songId,
        name: resourceName,
        type: 'PDF',
        filePath: relativePath,
        fileSize: pdf.length,
        uploadedById: userId,
      },
    }),
    prisma.group.update({
      where: { id: chart.groupId },
      data: { storageUsedBytes: { increment: BigInt(pdf.length) } },
    }),
  ])

  return NextResponse.json({ ok: true, resource }, { status: 201 })
}
