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
type AccidentalMode = 'auto' | 'sharp' | 'flat'
type PdfTextItem = {
  page: number
  top: number
  left: number
  width: number
  height: number
  font: string
  text: string
}
type KeySignatureGuess = { accidental: '#' | 'b'; count: number; roots: Set<string> }

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
    String.raw`(^|[\s|,;])((?:N\.?C\.?|[A-G](?:#|b|♯|♭)?\s*(?:m|maj|min|dim|aug|sus|add|ø|°)?\s*(?:2|4|5|6|7|9|11|13)?(?:[#b♯♭](?:5|9|11|13))?(?:\+)?(?:/[A-G](?:#|b|♯|♭)?)?))(?=$|[\s|,;])`,
    'g',
  )
  return Array.from(line.matchAll(chordPattern))
    .map((match) => ({ chord: normalizeChord(match[2]), index: (match.index || 0) + match[1].length }))
    .filter(({ chord }) => chord === 'N.C.' || /^[A-G]/.test(chord))
}

function isChordLabel(text: string) {
  const chord = normalizeChord(text)
  return /^(?:N\.C\.|[A-G](?:#|b)?(?:(?:m|maj|min|dim|aug|sus|add|ø|°)?(?:2|4|5|6|7|9|11|13)?(?:[#b](?:5|9|11|13))?(?:\+)?)(?:\/[A-G](?:#|b)?)?)$/.test(chord)
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function compactCenters(values: number[], tolerance = 8) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  const clusters: number[][] = []
  sorted.forEach((value) => {
    const last = clusters[clusters.length - 1]
    const lastAverage = last ? last.reduce((sum, item) => sum + item, 0) / last.length : 0
    if (last && Math.abs(value - lastAverage) <= tolerance) last.push(value)
    else clusters.push([value])
  })
  return clusters.map((cluster) => cluster.reduce((sum, item) => sum + item, 0) / cluster.length)
}

function estimateMeasureWidthFromEvents(values: number[]) {
  const centers = compactCenters(values)
  const gaps = centers
    .map((value, index) => index === 0 ? 0 : value - centers[index - 1])
    .filter((gap) => gap >= 38 && gap <= 95)
  return median(gaps, 0)
}

function inferKeySignature(items: PdfTextItem[]): KeySignatureGuess | null {
  const candidates = items
    .filter((item) =>
      item.page === 1 &&
      item.top >= 150 &&
      item.top <= 235 &&
      item.left >= 105 &&
      item.left <= 230 &&
      item.width >= 35 &&
      item.height >= 35 &&
      item.text.trim() === '',
    )
    .sort((a, b) => b.width * b.height - a.width * a.height)
  const keyBlock = candidates[0]
  if (!keyBlock) return null

  const isSharp = keyBlock.top < 195
  const count = clamp(Math.round(keyBlock.width / (isSharp ? 15 : 30)), 1, 7)
  const order = isSharp
    ? ['F', 'C', 'G', 'D', 'A', 'E', 'B']
    : ['B', 'E', 'A', 'D', 'G', 'C', 'F']

  return {
    accidental: isSharp ? '#' : 'b',
    count,
    roots: new Set(order.slice(0, count)),
  }
}

function hasLocalAccidentalGlyph(item: PdfTextItem, accidentals: PdfTextItem[]) {
  return accidentals.some((accidental) => {
    if (accidental.page !== item.page) return false
    const dy = accidental.top - item.top
    const dx = accidental.left - item.left
    return dy >= -6 && dy <= 22 && dx >= -26 && dx <= -2
  })
}

function applyRootAccidental(chord: string, accidental: '#' | 'b' | null) {
  if (!accidental || chord === 'N.C.' || !/^[A-G](?![#b])/.test(chord)) return chord
  return chord.replace(/^([A-G])/, `$1${accidental}`)
}

function buildPreviewText(byNumber: Map<number, string[]>, lastNumber: number, fillRepeats = true) {
  let hasPreviousChord = false
  const lines: string[] = []

  for (let number = 1; number <= lastNumber; number += 1) {
    const chords = byNumber.get(number)
    if (chords?.length) {
      lines.push(`${number}: ${chords.slice(0, 4).join(' | ')}`)
      hasPreviousChord = true
    } else if (fillRepeats && hasPreviousChord) {
      lines.push(`${number}: %`)
    }
  }

  return lines.join('\n')
}

function parseChordifyXml(xml: string, fallbackText: string, accidentalMode: AccidentalMode = 'auto') {
  const items = parsePdfXmlItems(xml)
  if (items.length === 0) return null

  const title = extractTitle(fallbackText || items.map((item) => item.text).join('\n'))
  const tempo = extractTempo(fallbackText || items.map((item) => item.text).join('\n'))
  const accidentalItems = items.filter((item) =>
    item.top > 55 &&
    item.text === '' &&
    item.width >= 5 &&
    item.width <= 26 &&
    item.height >= 20 &&
    item.height <= 65,
  )
  const keySignature = accidentalMode === 'auto' ? inferKeySignature(items) : null
  const forcedAccidental: '#' | 'b' | null = accidentalMode === 'sharp'
    ? '#'
    : accidentalMode === 'flat'
      ? 'b'
      : null
  const chordItems = items
    .filter((item) => item.top > 55 && isChordLabel(item.text))
    .map((item) => {
      let chord = normalizeChord(item.text)
      const root = chord[0]
      const localAccidental = chord !== 'N.C.' && hasLocalAccidentalGlyph(item, accidentalItems)
      const localAccidentalEligible = keySignature?.accidental === 'b'
        ? root !== 'F'
        : root !== 'B'
      const inferredAccidental = forcedAccidental
        || (keySignature && (/^[A-G]$/.test(root) && (keySignature.roots.has(root) || (localAccidental && localAccidentalEligible)))
          ? keySignature.accidental
          : null)
      chord = applyRootAccidental(chord, inferredAccidental)
      return { ...item, chord, explicitAccidental: Boolean(inferredAccidental), center: item.left + item.width / 2 }
    })
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
  const musicGlyphs = items.filter((item) =>
    item.top > 55 &&
    item.text.trim() === '' &&
    item.width >= 3 &&
    item.height >= 30,
  )

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
  if (usefulRows.length === 0) return null

  usefulRows.forEach((row, index) => {
    const label = measureLabels
      .filter((candidate) => candidate.page === row.page && Math.abs(candidate.top - row.top) <= 28)
      .sort((a, b) => Math.abs(a.top - row.top) - Math.abs(b.top - row.top))[0]
    row.start = label?.value || null
  })

  if (!usefulRows[0].start) usefulRows[0].start = 1
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

  const measureWidthSamples = usefulRows
    .map((row) => {
      const centers = row.chords.map((chord) => chord.center).sort((a, b) => a - b)
      if (row.barsInRow < 2 || centers.length < 2) return 0
      const rowGlyphs = musicGlyphs.filter((item) =>
        item.page === row.page &&
        item.top >= row.top + 6 &&
        item.top <= row.top + 75,
      )
      const eventWidth = estimateMeasureWidthFromEvents([
        ...centers,
        ...rowGlyphs
          .filter((item) => item.left >= centers[0] - 25)
          .map((item) => item.left + item.width / 2),
      ])
      const rightEdge = Math.max(
        ...row.chords.map((chord) => chord.right),
        ...rowGlyphs.map((item) => item.left + item.width),
      )
      const firstAnchor = centers[0]
      const edgeWidth = Number.isFinite(rightEdge) && rightEdge > firstAnchor
        ? (rightEdge - firstAnchor) / Math.max(1, row.barsInRow - 0.32)
        : (centers[centers.length - 1] - centers[0]) / Math.max(1, row.barsInRow - 1)
      const width = eventWidth >= 35 && eventWidth <= 120 && edgeWidth >= 35 && edgeWidth <= 120
        ? eventWidth * 0.65 + edgeWidth * 0.35
        : eventWidth >= 35 && eventWidth <= 120
          ? eventWidth
          : edgeWidth
      return width >= 35 && width <= 120 ? width : 0
    })
    .filter((value) => value > 0)
  const commonMeasureWidth = median(measureWidthSamples, 64)
  const byNumber = new Map<number, string[]>()

  usefulRows.forEach((row) => {
    if (!row.start) return
    const centers = row.chords.map((chord) => chord.center).sort((a, b) => a - b)
    const rowGlyphs = musicGlyphs.filter((item) =>
      item.page === row.page &&
      item.top >= row.top + 6 &&
      item.top <= row.top + 75,
    )
    const firstAnchor = centers[0] ?? Math.min(...row.chords.map((chord) => chord.left))
    const eventWidth = estimateMeasureWidthFromEvents([
      ...centers,
      ...rowGlyphs
        .filter((item) => item.left >= firstAnchor - 25)
        .map((item) => item.left + item.width / 2),
    ])
    const rightEdge = Math.max(
      ...row.chords.map((chord) => chord.right),
      ...rowGlyphs.map((item) => item.left + item.width),
    )
    const edgeWidth = row.barsInRow >= 2 && Number.isFinite(rightEdge) && rightEdge > firstAnchor
      ? (rightEdge - firstAnchor) / Math.max(1, row.barsInRow - 0.32)
      : commonMeasureWidth
    const rowWidth = eventWidth >= 35 && eventWidth <= 120 && edgeWidth >= 35 && edgeWidth <= 120
      ? eventWidth * 0.65 + edgeWidth * 0.35
      : eventWidth >= 35 && eventWidth <= 120
        ? eventWidth
        : edgeWidth
    const measureWidth = rowWidth >= 35 && rowWidth <= 120 ? rowWidth : commonMeasureWidth
    const rowLeft = firstAnchor - measureWidth * 0.32

    row.chords.forEach((chord) => {
      const rawOffset = (chord.center - rowLeft) / Math.max(1, measureWidth)
      const offset = Math.max(0, Math.min(row.barsInRow - 1, Math.floor(rawOffset + 0.02)))
      const barNumber = row.start! + offset
      const existing = byNumber.get(barNumber) || []
      if (existing.length < 4 && existing[existing.length - 1] !== chord.chord) existing.push(chord.chord)
      byNumber.set(barNumber, existing)
    })
  })

  const orderedNumbers = Array.from(byNumber.keys()).sort((a, b) => a - b)
  if (orderedNumbers.length === 0) return null

  const lastNumber = Math.max(...usefulRows.map((row) => (row.start || 0) + row.barsInRow - 1), orderedNumbers.at(-1) || 32)
  const previewText = buildPreviewText(byNumber, lastNumber)

  return {
    title,
    tempo,
    timeSignature: '4/4',
    barsPerRow: 4,
    totalBars: Math.max(8, Math.min(240, lastNumber)),
    previewText,
    warnings: [
      'Import géométrique : les accords sont replacés selon leur position dans le PDF Chordify.',
      'Les mesures sans nouvel accord visible sont remplies avec % pour indiquer la répétition de la mesure précédente.',
      'Relisez les bémols/dièses : certains PDF Chordify encodent les altérations avec des glyphes musicaux difficiles à lire automatiquement.',
      ...(keySignature ? [`Armure détectée : ${keySignature.count} ${keySignature.accidental === 'b' ? 'bémol' : 'dièse'}${keySignature.count > 1 ? 's' : ''}.`] : []),
      ...(accidentalMode === 'sharp' ? ['Mode dièses forcé : les altérations masquées du PDF ont été interprétées comme des #.'] : []),
      ...(accidentalMode === 'flat' ? ['Mode bémols forcé : les altérations masquées du PDF ont été interprétées comme des b.'] : []),
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
  const lastNumber = orderedNumbers.at(-1) || 32
  const totalBars = Math.max(8, Math.min(240, lastNumber + 3))
  const previewText = buildPreviewText(byNumber, totalBars)

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
    await execFileAsync('pdftotext', ['-layout', pdfPath, textPath], { timeout: 10000, killSignal: 'SIGKILL' })
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
      timeout: 6000,
      killSignal: 'SIGKILL',
      maxBuffer: 10 * 1024 * 1024,
    })
    return stdout
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function parseChordifyBuffer(buffer: Buffer, accidentalMode: AccidentalMode = 'auto') {
  const text = await pdfBufferToText(buffer)
  try {
    const xml = await pdfBufferToXml(buffer)
    return parseChordifyXml(xml, text, accidentalMode) || parseChordifyText(text)
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
  const accidentalModeValue = data.get('accidentalMode')
  const accidentalMode: AccidentalMode = accidentalModeValue === 'sharp' || accidentalModeValue === 'flat'
    ? accidentalModeValue
    : 'auto'

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
      const stat = fs.statSync(pdfPath)
      if (stat.size > MAX_PDF_SIZE) throw new Error('PDF trop volumineux.')

      const preview = await parseChordifyBuffer(await readFile(pdfPath), accidentalMode)
      return NextResponse.json({
        ...preview,
        title: resource.song.title || preview.title,
        tempo: preview.tempo || (resource.song.tempo ? String(resource.song.tempo) : null),
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
      ...(await parseChordifyBuffer(buffer, accidentalMode)),
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
