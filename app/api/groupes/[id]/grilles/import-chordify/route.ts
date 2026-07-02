import { execFile } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { getGroupStorageInfo } from '@/lib/storage'

const execFileAsync = promisify(execFile)
const MAX_PDF_SIZE = 25 * 1024 * 1024

type ChordToken = { chord: string; index: number }
type PdfTextItem = {
  page: number
  top: number
  left: number
  width: number
  height: number
  font: string
  text: string
}

function cleanText(value: string) {
  return value
    .replace(/\u00c8/g, 'é')
    .replace(/\u00cb/g, 'è')
    .replace(/\u00b1/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeChord(chord: string) {
  return chord
    .replace(/\s+/g, '')
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/^N\.?C\.?$/i, 'N.C.')
}

function extractTitle(text: string) {
  const lines = text.split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean)
  const titleLine = lines.find((line) => /\(lyrics\)/i.test(line))
  if (titleLine) return titleLine.replace(/\s*\(lyrics\).*$/i, '').replace(/\s+-\s+Chordify$/i, '').trim()
  const lyricIndex = lines.findIndex((line) => /\(lyrics\)/i.test(line))
  if (lyricIndex > 0) return lines[lyricIndex - 1].replace(/\s+-\s+Chordify$/i, '')
  return lines.find((line) => !/^(page\s+\d+|chordify|key|tempo)/i.test(line)) || 'Grille importée'
}

function extractTempo(text: string) {
  return text.match(/[♩♪]?\s*=\s*(\d{2,3})/)?.[1] || null
}

function extractChords(line: string) {
  const chordPattern = new RegExp(
    String.raw`\b(?:N\.?C\.?|[A-G](?:#|b)?\s*(?:m|maj|min|dim|aug|sus|add)?\s*(?:2|4|5|6|7|9|11|13)?(?:[#b](?:5|9|11|13))?(?:\+)?(?:/[A-G](?:#|b)?)?)\b`,
    'g',
  )
  return Array.from(line.matchAll(chordPattern))
    .map((match) => ({ chord: normalizeChord(match[0]), index: match.index || 0 }))
    .filter(({ chord }) => chord === 'N.C.' || /^[A-G]/.test(chord))
}

function isChordLabel(text: string) {
  const chord = normalizeChord(text)
  return /^(?:N\.C\.|[A-G](?:#|b)?(?:(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:[#b](?:5|9|11|13))?(?:\+)?)(?:\/[A-G](?:#|b)?)?)$/.test(chord)
}

function decodeXmlText(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parsePdfXmlItems(xml: string) {
  const items: PdfTextItem[] = []
  const pageRegex = /<page\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/page>/g
  let pageMatch: RegExpExecArray | null
  while ((pageMatch = pageRegex.exec(xml))) {
    const page = Number(pageMatch[1])
    const textRegex = /<text\b[^>]*top="([\d.]+)"[^>]*left="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*font="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
    let textMatch: RegExpExecArray | null
    while ((textMatch = textRegex.exec(pageMatch[2]))) {
      const text = cleanText(decodeXmlText(textMatch[6]).replace(/<[^>]+>/g, ''))
      if (!text) continue
      items.push({
        page,
        top: Number(textMatch[1]),
        left: Number(textMatch[2]),
        width: Number(textMatch[3]),
        height: Number(textMatch[4]),
        font: textMatch[5],
        text,
      })
    }
  }
  return items
}

function median(values: number[], fallback: number) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (sorted.length === 0) return fallback
  return sorted[Math.floor(sorted.length / 2)]
}

function parseChordifyXml(xml: string, fallbackText: string) {
  const items = parsePdfXmlItems(xml)
  if (items.length === 0) return null

  const title = extractTitle(fallbackText || items.map((item) => item.text).join('\n'))
  const tempo = extractTempo(fallbackText || items.map((item) => item.text).join('\n'))
  const chordItems = items
    .filter((item) => item.top > 55 && isChordLabel(item.text))
    .map((item) => ({ ...item, chord: normalizeChord(item.text), center: item.left + item.width / 2 }))
    .sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left)

  if (chordItems.length < 2) return null

  const measureLabels = items
    .filter((item) => /^\d{1,3}$/.test(item.text) && item.left <= 100 && item.top > 55)
    .map((item) => ({ ...item, value: Number(item.text) }))

  const rows: Array<{
    page: number
    top: number
    chords: Array<{ chord: string; center: number; left: number; right: number }>
    start: number | null
    barsInRow: number
  }> = []

  chordItems.forEach((item) => {
    const last = rows[rows.length - 1]
    if (!last || last.page !== item.page || Math.abs(last.top - item.top) > 14) {
      rows.push({
        page: item.page,
        top: item.top,
        chords: [{ chord: item.chord, center: item.center, left: item.left, right: item.left + item.width }],
        start: null,
        barsInRow: 0,
      })
      return
    }
    last.top = (last.top * last.chords.length + item.top) / (last.chords.length + 1)
    last.chords.push({ chord: item.chord, center: item.center, left: item.left, right: item.left + item.width })
  })

  const usefulRows = rows
    .map((row) => ({ ...row, chords: row.chords.sort((a, b) => a.left - b.left) }))
    .filter((row) => row.chords.length >= 2)
    .sort((a, b) => a.page - b.page || a.top - b.top)

  usefulRows.forEach((row, index) => {
    const label = measureLabels
      .filter((candidate) => candidate.page === row.page && Math.abs(candidate.top - row.top) <= 28)
      .sort((a, b) => Math.abs(a.top - row.top) - Math.abs(b.top - row.top))[0]
    row.start = label?.value || (index === 0 ? 1 : null)
  })

  for (let index = 0; index < usefulRows.length; index += 1) {
    if (usefulRows[index].start) continue
    const previous = usefulRows[index - 1]
    if (previous?.start && previous.barsInRow) usefulRows[index].start = previous.start + previous.barsInRow
  }

  const gaps = usefulRows
    .map((row, index) => {
      const nextStart = usefulRows.slice(index + 1).find((candidate) => candidate.start && candidate.start > (row.start || 0))?.start
      return row.start && nextStart ? nextStart - row.start : 0
    })
    .filter((gap) => gap >= 2 && gap <= 16)
  const commonBarsPerSystem = median(gaps, 10)

  usefulRows.forEach((row, index) => {
    const nextStart = usefulRows.slice(index + 1).find((candidate) => candidate.start && candidate.start > (row.start || 0))?.start
    const gap = row.start && nextStart ? nextStart - row.start : 0
    row.barsInRow = gap >= 2 && gap <= 16 ? gap : commonBarsPerSystem
  })

  const leftSamples = usefulRows.map((row) => Math.min(...row.chords.map((chord) => chord.left))).sort((a, b) => a - b)
  const rightSamples = usefulRows.map((row) => Math.max(...row.chords.map((chord) => chord.right))).sort((a, b) => a - b)
  const staffLeft = leftSamples[Math.floor(leftSamples.length * 0.2)] ?? 160
  const staffRight = rightSamples[Math.floor(rightSamples.length * 0.8)] ?? 810
  const staffWidth = Math.max(1, staffRight - staffLeft)
  const byNumber = new Map<number, string[]>()

  usefulRows.forEach((row) => {
    if (!row.start) return
    row.chords.forEach((chord) => {
      const position = Math.max(0, Math.min(0.999, (chord.center - staffLeft) / staffWidth))
      const offset = Math.max(0, Math.min(row.barsInRow - 1, Math.floor(position * row.barsInRow)))
      const barNumber = row.start! + offset
      const existing = byNumber.get(barNumber) || []
      if (existing.length < 4 && existing[existing.length - 1] !== chord.chord) existing.push(chord.chord)
      byNumber.set(barNumber, existing)
    })
  })

  const orderedNumbers = Array.from(byNumber.keys()).sort((a, b) => a - b)
  if (orderedNumbers.length === 0) return null

  const previewText = orderedNumbers
    .map((number) => `${number}: ${(byNumber.get(number) || []).slice(0, 4).join(' | ')}`)
    .join('\n')
  const lastNumber = Math.max(...usefulRows.map((row) => (row.start || 0) + row.barsInRow - 1), orderedNumbers.at(-1) || 32)

  return {
    title,
    tempo,
    timeSignature: '4/4',
    barsPerRow: 4,
    totalBars: Math.max(8, Math.min(240, lastNumber)),
    previewText,
    warnings: [
      'Import géométrique : les accords sont replacés selon leur position dans le PDF Chordify.',
      'Relisez les bémols/dièses : certains PDF Chordify encodent les altérations avec des glyphes musicaux difficiles à lire automatiquement.',
    ],
  }
}

function parseChordifyText(text: string) {
  const title = extractTitle(text)
  const tempo = extractTempo(text)
  const warnings = [
    'Vérifiez la prévisualisation avant création : certains PDF Chordify peuvent perdre les bémols ou décaler une mesure.',
  ]
  const rows: Array<{ number: number; chords: Array<{ chord: string; index: number }> }> = []
  let pendingMeasure: number | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    const standaloneNumber = line.trim().match(/^(\d{1,3})$/)
    if (standaloneNumber) {
      pendingMeasure = Number(standaloneNumber[1])
      continue
    }

    if (/Chordify|Music from YouTube|Page\s+\d+|^\s*\d+\s*$|Lyrics/i.test(line)) continue
    const chords = extractChords(line)
    if (chords.length < 2) continue

    const inlineMeasure = line.match(/^\s*(\d{1,3})\s+/)
    const number = inlineMeasure ? Number(inlineMeasure[1]) : (pendingMeasure || (rows.length === 0 ? 1 : null))
    if (!number || number < 1) continue

    rows.push({ number, chords })
    pendingMeasure = null
  }

  const orderedRows = rows
    .filter((row, index, allRows) => allRows.findIndex((other) => other.number === row.number) === index)
    .sort((a, b) => a.number - b.number)
  const rowGaps = orderedRows
    .map((row, index) => (orderedRows[index + 1]?.number || 0) - row.number)
    .filter((gap) => gap >= 2 && gap <= 16)
    .sort((a, b) => a - b)
  const commonBarsPerSystem = rowGaps[Math.floor(rowGaps.length / 2)] || 8
  const byNumber = new Map<number, string[]>()

  orderedRows.forEach((row, index) => {
    const nextGap = (orderedRows[index + 1]?.number || 0) - row.number
    const barsInRow = nextGap >= 2 && nextGap <= 16 ? nextGap : commonBarsPerSystem
    const firstIndex = Math.min(...row.chords.map((chord) => chord.index))
    const lastIndex = Math.max(...row.chords.map((chord) => chord.index))
    const span = Math.max(1, lastIndex - firstIndex + 1)

    row.chords.forEach(({ chord, index: chordIndex }) => {
      const offset = Math.max(0, Math.min(barsInRow - 1, Math.floor(((chordIndex - firstIndex) / span) * barsInRow)))
      const barNumber = row.number + offset
      const existing = byNumber.get(barNumber) || []
      if (existing.length < 4) existing.push(chord)
      byNumber.set(barNumber, existing)
    })
  })

  const orderedNumbers = Array.from(byNumber.keys()).sort((a, b) => a - b)
  const previewText = orderedNumbers
    .map((number) => `${number}: ${(byNumber.get(number) || []).slice(0, 4).join(' | ')}`)
    .join('\n')

  const lastNumber = orderedNumbers.at(-1) || 32
  const totalBars = Math.max(8, Math.min(240, lastNumber + 3))

  if (!previewText) {
    warnings.push("Aucun accord n'a été détecté automatiquement dans ce PDF.")
  }

  return {
    title,
    tempo,
    timeSignature: '4/4',
    barsPerRow: 4,
    totalBars,
    previewText,
    warnings,
  }
}

async function pdfBufferToText(buffer: Buffer) {
  const dir = path.join(tmpdir(), `solaupiano-chordify-${randomUUID()}`)
  const pdfPath = path.join(dir, 'source.pdf')
  const textPath = path.join(dir, 'source.txt')

  await mkdir(dir, { recursive: true })
  try {
    await writeFile(pdfPath, buffer)
    await execFileAsync('pdftotext', ['-layout', pdfPath, textPath], { timeout: 15000 })
    return readFile(textPath, 'utf8')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function pdfBufferToXml(buffer: Buffer) {
  const dir = path.join(tmpdir(), `solaupiano-chordify-xml-${randomUUID()}`)
  const pdfPath = path.join(dir, 'source.pdf')

  await mkdir(dir, { recursive: true })
  try {
    await writeFile(pdfPath, buffer)
    const { stdout } = await execFileAsync('pdftohtml', ['-xml', '-i', '-stdout', pdfPath], {
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024,
    })
    return stdout
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function parseChordifyBuffer(buffer: Buffer) {
  const text = await pdfBufferToText(buffer)
  try {
    const xml = await pdfBufferToXml(buffer)
    return parseChordifyXml(xml, text) || parseChordifyText(text)
  } catch {
    return parseChordifyText(text)
  }
}

function safeFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'chordify.pdf'
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!isAdmin && membership?.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, chefPermissions: true },
  })
  if (!isAdmin && group && !coChefCanDo(group, userId, isAdmin, 'grilles', 'create')) {
    return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
  }

  const data = await req.formData()
  const resourceId = Number(data.get('resourceId') || 0)
  const songId = Number(data.get('songId') || 0)
  const attachToSong = data.get('attachToSong') === '1'

  try {
    if (resourceId) {
      const resource = await prisma.resource.findFirst({
        where: { id: resourceId, type: 'PDF', song: { groupId } },
        include: { song: { select: { id: true, title: true, tempo: true } } },
      })
      if (!resource) return NextResponse.json({ error: 'PDF introuvable dans ce groupe.' }, { status: 404 })

      const pdfPath = resource.filePath.startsWith('/')
        ? path.join(process.cwd(), 'public', resource.filePath)
        : path.join(process.cwd(), resource.filePath)
      if (!fs.existsSync(pdfPath)) return NextResponse.json({ error: 'Fichier PDF introuvable sur le serveur.' }, { status: 404 })

      const preview = await parseChordifyBuffer(await readFile(pdfPath))
      return NextResponse.json({
        ...preview,
        title: resource.song.title || preview.title,
        tempo: resource.song.tempo ? String(resource.song.tempo) : preview.tempo,
        songId: resource.song.id,
        resourceId: resource.id,
        resourceName: resource.name,
      })
    }

    const file = data.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'PDF manquant.' }, { status: 400 })
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Le fichier doit être un PDF.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_PDF_SIZE) throw new Error('PDF trop volumineux.')
    let linkedResource: { id: number; name: string; songId: number } | null = null

    if (attachToSong) {
      if (!songId) return NextResponse.json({ error: 'Choisissez le titre auquel associer ce PDF.' }, { status: 400 })
      const song = await prisma.song.findFirst({ where: { id: songId, groupId }, select: { id: true } })
      if (!song) return NextResponse.json({ error: 'Titre introuvable dans ce groupe.' }, { status: 404 })

      const storageInfo = await getGroupStorageInfo(groupId)
      if (storageInfo.limitBytes <= 0) {
        return NextResponse.json({ error: "L'ajout de fichiers n'est pas disponible avec ce plan.", code: 'PLAN_FEATURE_LOCKED' }, { status: 403 })
      }
      if (storageInfo.usedBytes + buffer.length > storageInfo.limitBytes) {
        return NextResponse.json({ error: 'Quota de stockage dépassé.', code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
      }

      const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
      await mkdir(uploadDir, { recursive: true })
      const originalName = file.name || 'chordify.pdf'
      const storedName = `${Date.now()}-${safeFileName(originalName)}`
      const storedPath = path.join(uploadDir, storedName)
      await writeFile(storedPath, buffer)
      const relativePath = storedPath.startsWith('./public')
        ? storedPath.replace('./public', '')
        : `/uploads/${path.basename(storedPath)}`

      const [resource] = await prisma.$transaction([
        prisma.resource.create({
          data: {
            songId,
            name: originalName.replace(/\.pdf$/i, ''),
            type: 'PDF',
            filePath: relativePath,
            fileSize: buffer.length,
            uploadedById: userId,
          },
        }),
        prisma.group.update({
          where: { id: groupId },
          data: { storageUsedBytes: { increment: BigInt(buffer.length) } },
        }),
      ])
      linkedResource = { id: resource.id, name: resource.name, songId }
    }

    return NextResponse.json({
      ...(await parseChordifyBuffer(buffer)),
      songId: linkedResource?.songId || null,
      resourceId: linkedResource?.id || null,
      resourceName: linkedResource?.name || null,
    })
  } catch (error) {
    const message = error instanceof Error && error.message === 'PDF trop volumineux.'
      ? error.message
      : "Impossible d'analyser ce PDF. Vérifiez qu'il s'agit bien d'un export Chordify lisible."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
