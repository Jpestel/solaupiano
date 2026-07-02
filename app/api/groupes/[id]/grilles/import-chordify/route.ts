import { execFile } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

const execFileAsync = promisify(execFile)
const MAX_PDF_SIZE = 10 * 1024 * 1024

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

async function pdfToText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_PDF_SIZE) throw new Error('PDF trop volumineux.')

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
  const file = data.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'PDF manquant.' }, { status: 400 })
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Le fichier doit être un PDF.' }, { status: 400 })
  }

  try {
    const text = await pdfToText(file)
    return NextResponse.json(parseChordifyText(text))
  } catch (error) {
    const message = error instanceof Error && error.message === 'PDF trop volumineux.'
      ? error.message
      : "Impossible d'analyser ce PDF. Vérifiez qu'il s'agit bien d'un export Chordify lisible."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
