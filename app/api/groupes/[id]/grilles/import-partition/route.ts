import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { MAX_BARS } from '@/lib/grille'

const MAX_SCORE_SIZE = 25 * 1024 * 1024

type MeasureData = {
  number: number
  harmonies: string[]
  pitchClasses: Map<number, number>
}

const STEP_TO_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const PC_TO_NAME_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FIFTHS_TO_KEY: Record<number, string> = {
  '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F',
  0: 'C',
  1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
}

function cleanXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function tagText(xml: string, tag: string) {
  return cleanXmlText(xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '')
}

function tagAttr(xml: string, tag: string, attr: string) {
  return cleanXmlText(xml.match(new RegExp(`<${tag}\\b[^>]*\\s${attr}="([^"]+)"`, 'i'))?.[1] || '')
}

function normalizePc(value: number) {
  return ((value % 12) + 12) % 12
}

function chordRoot(step: string, alter: string) {
  const pc = normalizePc((STEP_TO_PC[step] ?? 0) + (Number(alter) || 0))
  return PC_TO_NAME_SHARP[pc]
}

function chordKind(kindBlock: string) {
  const text = tagAttr(kindBlock, 'kind', 'text')
  if (text) return text.replace(/Δ/g, 'maj').replace(/\s+/g, '')
  const value = cleanXmlText(kindBlock.replace(/<[^>]+>/g, ''))
  const map: Record<string, string> = {
    major: '',
    minor: 'm',
    augmented: 'aug',
    diminished: 'dim',
    dominant: '7',
    'major-seventh': 'maj7',
    'minor-seventh': 'm7',
    'diminished-seventh': 'dim7',
    'augmented-seventh': 'aug7',
    'half-diminished': 'm7b5',
    'major-sixth': '6',
    'minor-sixth': 'm6',
    suspended: 'sus',
    'suspended-fourth': 'sus4',
    'suspended-second': 'sus2',
  }
  return map[value] ?? (value && value !== 'none' ? value : '')
}

function parseHarmony(block: string) {
  const rootBlock = block.match(/<root\b[^>]*>([\s\S]*?)<\/root>/i)?.[1] || ''
  const rootStep = tagText(rootBlock, 'root-step')
  if (!rootStep) return null
  const rootAlter = tagText(rootBlock, 'root-alter')
  const kindBlock = block.match(/<kind\b[^>]*>[\s\S]*?<\/kind>/i)?.[0] || ''
  let chord = `${chordRoot(rootStep, rootAlter)}${chordKind(kindBlock)}`

  const bassBlock = block.match(/<bass\b[^>]*>([\s\S]*?)<\/bass>/i)?.[1] || ''
  const bassStep = tagText(bassBlock, 'bass-step')
  if (bassStep) chord += `/${chordRoot(bassStep, tagText(bassBlock, 'bass-alter'))}`
  return chord
}

function addPitch(measure: MeasureData, noteBlock: string) {
  if (/<rest\b/i.test(noteBlock)) return
  const pitchBlock = noteBlock.match(/<pitch\b[^>]*>([\s\S]*?)<\/pitch>/i)?.[1] || ''
  const step = tagText(pitchBlock, 'step')
  if (!step) return
  const pc = normalizePc((STEP_TO_PC[step] ?? 0) + (Number(tagText(pitchBlock, 'alter')) || 0))
  const duration = Math.max(1, Number(tagText(noteBlock, 'duration')) || 1)
  measure.pitchClasses.set(pc, (measure.pitchClasses.get(pc) || 0) + duration)
}

function inferChord(measure: MeasureData) {
  if (measure.pitchClasses.size === 0) return null
  const pcs = measure.pitchClasses
  let best: { chord: string; score: number } | null = null
  for (let root = 0; root < 12; root += 1) {
    const candidates = [
      { suffix: '', tones: [0, 4, 7] },
      { suffix: 'm', tones: [0, 3, 7] },
      { suffix: '7', tones: [0, 4, 7, 10] },
      { suffix: 'm7', tones: [0, 3, 7, 10] },
      { suffix: 'maj7', tones: [0, 4, 7, 11] },
      { suffix: 'dim', tones: [0, 3, 6] },
      { suffix: 'sus4', tones: [0, 5, 7] },
    ]
    for (const candidate of candidates) {
      const tones = new Set(candidate.tones.map((tone) => normalizePc(root + tone)))
      let score = tones.has(root) ? 3 : 0
      pcs.forEach((weight, pc) => {
        score += tones.has(pc) ? weight * 2 : -weight * 0.65
      })
      if (!best || score > best.score) best = { chord: `${PC_TO_NAME_SHARP[root]}${candidate.suffix}`, score }
    }
  }
  return best && best.score > 0 ? best.chord : null
}

function buildPreviewText(measures: MeasureData[], fillRepeats = true) {
  const byNumber = new Map<number, string[]>()
  measures.forEach((measure) => {
    const chords = measure.harmonies.length > 0
      ? measure.harmonies
      : [inferChord(measure)].filter((value): value is string => Boolean(value))
    if (chords.length) byNumber.set(measure.number, Array.from(new Set(chords)).slice(0, 4))
  })

  const lastNumber = Math.max(8, ...measures.map((measure) => measure.number), ...Array.from(byNumber.keys()))
  const lines: string[] = []
  let hasPreviousChord = false
  for (let number = 1; number <= Math.min(MAX_BARS, lastNumber); number += 1) {
    const chords = byNumber.get(number)
    if (chords?.length) {
      lines.push(`${number}: ${chords.join(' | ')}`)
      hasPreviousChord = true
    } else if (fillRepeats && hasPreviousChord) {
      lines.push(`${number}: %`)
    }
  }
  return { previewText: lines.join('\n'), totalBars: Math.min(MAX_BARS, lastNumber), explicitCount: measures.filter((m) => m.harmonies.length > 0).length }
}

async function bufferToXml(buffer: Buffer, fileName: string) {
  const lower = fileName.toLowerCase()
  if (!lower.endsWith('.mxl')) return buffer.toString('utf8')

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const container = await zip.file('META-INF/container.xml')?.async('string')
  const rootfile = container?.match(/<rootfile\b[^>]*full-path="([^"]+)"/i)?.[1]
  const scorePath = rootfile || Object.keys(zip.files).find((name) => /\.(musicxml|xml)$/i.test(name) && !name.includes('META-INF/'))
  if (!scorePath) throw new Error('Partition MusicXML introuvable dans le MXL.')
  return zip.file(scorePath)?.async('string') || ''
}

function parseMusicXml(xml: string) {
  const title = tagText(xml, 'work-title') || tagText(xml, 'movement-title') || 'Grille importée depuis partition'
  const tempo = xml.match(/<sound\b[^>]*tempo="([\d.]+)"/i)?.[1]?.replace(/\.0+$/, '') || null
  const beats = tagText(xml, 'beats')
  const beatType = tagText(xml, 'beat-type')
  const timeSignature = beats && beatType ? `${beats}/${beatType}` : '4/4'
  const fifthsRaw = tagText(xml, 'fifths')
  const keySignature = fifthsRaw !== '' ? (FIFTHS_TO_KEY[Number(fifthsRaw)] || null) : null
  const measuresByNumber = new Map<number, MeasureData>()
  let fallbackNumber = 1

  for (const match of xml.matchAll(/<measure\b([^>]*)>([\s\S]*?)<\/measure>/gi)) {
    const attrs = match[1] || ''
    const body = match[2] || ''
    const parsedNumber = Number(attrs.match(/\bnumber="([^"]+)"/i)?.[1])
    const number = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : fallbackNumber
    fallbackNumber = Math.max(fallbackNumber + 1, number + 1)
    const measure = measuresByNumber.get(number) || { number, harmonies: [], pitchClasses: new Map<number, number>() }

    for (const harmonyMatch of body.matchAll(/<harmony\b[^>]*>([\s\S]*?)<\/harmony>/gi)) {
      const chord = parseHarmony(harmonyMatch[0])
      if (chord && measure.harmonies[measure.harmonies.length - 1] !== chord) measure.harmonies.push(chord)
    }
    for (const noteMatch of body.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/gi)) {
      addPitch(measure, noteMatch[0])
    }
    measuresByNumber.set(number, measure)
  }

  const measures = Array.from(measuresByNumber.values()).sort((a, b) => a.number - b.number)
  if (measures.length === 0) throw new Error('Aucune mesure lisible dans cette partition.')
  const preview = buildPreviewText(measures)
  const inferredCount = preview.previewText.split(/\r?\n/).filter((line) => line && !/:\s*%$/.test(line)).length - preview.explicitCount

  return {
    title,
    tempo,
    keySignature,
    timeSignature,
    barsPerRow: 4,
    totalBars: Math.max(8, preview.totalBars),
    previewText: preview.previewText,
    warnings: [
      preview.explicitCount > 0
        ? `${preview.explicitCount} mesure${preview.explicitCount > 1 ? 's' : ''} avec symbole d'accord MusicXML explicite.`
        : "Aucun symbole d'accord explicite trouvé : les accords proposés sont déduits des notes par mesure.",
      ...(inferredCount > 0 ? [`${inferredCount} accord${inferredCount > 1 ? 's' : ''} proposé${inferredCount > 1 ? 's' : ''} automatiquement à partir des notes.`] : []),
      'Relisez la prévisualisation : l’analyse harmonique automatique reste une aide de départ.',
    ],
  }
}

async function parseScoreBuffer(buffer: Buffer, fileName: string) {
  const xml = await bufferToXml(buffer, fileName)
  if (!xml.trim()) throw new Error('Partition vide.')
  return parseMusicXml(xml)
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
  const songId = Number(data.get('songId') || 0) || null

  try {
    if (resourceId) {
      const resource = await prisma.resource.findFirst({
        where: { id: resourceId, song: { groupId } },
        include: { song: { select: { id: true, title: true, tempo: true } } },
      })
      if (!resource) return NextResponse.json({ error: 'Partition introuvable dans ce groupe.' }, { status: 404 })

      const scorePath = resource.filePath.startsWith('/')
        ? path.join(process.cwd(), 'public', resource.filePath)
        : path.join(process.cwd(), resource.filePath)
      if (!fs.existsSync(scorePath)) return NextResponse.json({ error: 'Fichier partition introuvable sur le serveur.' }, { status: 404 })
      const stat = fs.statSync(scorePath)
      if (stat.size > MAX_SCORE_SIZE) throw new Error('Partition trop volumineuse.')
      const preview = await parseScoreBuffer(fs.readFileSync(scorePath), resource.filePath || resource.name)
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
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier MusicXML manquant.' }, { status: 400 })
    if (!/\.(xml|musicxml|mxl)$/i.test(file.name)) {
      return NextResponse.json({ error: 'Le fichier doit être un MusicXML (.musicxml, .xml) ou MXL (.mxl).' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_SCORE_SIZE) throw new Error('Partition trop volumineuse.')
    return NextResponse.json({
      ...(await parseScoreBuffer(buffer, file.name)),
      songId,
      resourceId: null,
      resourceName: file.name,
    })
  } catch (error) {
    const message = error instanceof Error && error.message === 'Partition trop volumineuse.'
      ? error.message
      : "Impossible d'analyser cette partition. Essayez un export MusicXML/MXL depuis MuseScore."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
