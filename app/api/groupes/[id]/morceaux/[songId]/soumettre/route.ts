import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { detectResourceType } from '@/lib/utils'
import { getGroupStorageInfo } from '@/lib/storage'
import { getEmailTemplate } from '@/lib/get-email-template'
import { Resend } from 'resend'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; songId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const songId = Number(params.songId)

  // Member must belong to the group (chefs can use the regular route)
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const song = await prisma.song.findUnique({ where: { id: songId } })
  if (!song || song.groupId !== groupId) {
    return NextResponse.json({ error: 'Morceau introuvable.' }, { status: 404 })
  }

  // Règle unique : l'ajout de fichiers nécessite un quota de stockage > 0
  const storageInfo = await getGroupStorageInfo(groupId)
  if (storageInfo.limitBytes <= 0) {
    return NextResponse.json({
      error: "L'ajout de fichiers n'est pas disponible avec ce plan (quota de stockage à 0).",
      code: 'PLAN_FEATURE_LOCKED',
    }, { status: 403 })
  }

  // Upload file
  const uploadDir = path.join(process.env.UPLOAD_DIR?.replace('./public', '') ? './public/uploads/pending' : './public/uploads/pending')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const contentType = req.headers.get('content-type') || ''
  const contentLength = req.headers.get('content-length') || '0'

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024,
    filename: (_name, ext) => `${Date.now()}-${userId}${ext}`,
  })

  const arrayBuffer = await req.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { Readable } = require('stream')
  const stream = Readable.from(buffer)
  stream.headers = { 'content-type': contentType, 'content-length': contentLength }

  const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
  if (!uploadedFile) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })

  // Espace restant (compte aussi les soumissions déjà en attente pour ce groupe)
  const fileSize = uploadedFile.size || 0
  const pendingAgg = await prisma.pendingResource.aggregate({
    where: { groupId },
    _sum: { fileSize: true },
  })
  const pendingBytes = Number(pendingAgg._sum.fileSize ?? 0)
  if (storageInfo.usedBytes + pendingBytes + fileSize > storageInfo.limitBytes) {
    fs.unlinkSync(uploadedFile.filepath)
    return NextResponse.json({
      error: `Quota de stockage dépassé (limite : ${storageInfo.limitGb} Go, soumissions en attente incluses).`,
      code: 'STORAGE_QUOTA_EXCEEDED',
    }, { status: 413 })
  }

  const nameField = Array.isArray(fields.name) ? fields.name[0] : fields.name
  const typeField = Array.isArray(fields.type) ? fields.type[0] : fields.type

  const originalName = uploadedFile.originalFilename || 'fichier'
  const resourceType = typeField || detectResourceType(uploadedFile.mimetype || '', originalName)
  const relativePath = `/uploads/pending/${path.basename(uploadedFile.filepath)}`

  const pending = await prisma.pendingResource.create({
    data: {
      songId,
      groupId,
      submittedBy: userId,
      name: nameField || originalName,
      type: resourceType as any,
      filePath: relativePath,
      fileSize: uploadedFile.size || null,
    },
  })

  // Notify all chefs by email
  const chefs = await prisma.groupMember.findMany({
    where: { groupId, groupRole: 'CHEF' },
    include: { user: { select: { email: true, name: true } } },
  })
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })
  const submitter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

  const reviewUrl = `https://solaupiano.fr/groupes/${groupId}/morceaux`
  const fileLabel = nameField || originalName

  const tpl = await getEmailTemplate('resource_submission')
  const { subject, introHtml, outroHtml } = tpl.render({
    submitterName: submitter?.name ?? 'Un membre',
    songTitle: song.title,
    groupName: group?.name ?? '',
    fileName: fileLabel,
  })

  for (const chef of chefs) {
    await resend.emails.send({
      from: 'Sol au piano <noreply@solaupiano.fr>',
      to: chef.user.email,
      subject,
      html: `
        <div style="font-family:-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
          <div style="font-size:28px;margin-bottom:16px;">🎵</div>
          ${introHtml}
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0 24px;">
            <p style="margin:0;font-size:14px;color:#374151;">
              📎 <strong>${fileLabel}</strong><br>
              <span style="color:#9ca3af;font-size:12px;">Type : ${resourceType}</span>
            </p>
          </div>
          <a href="${reviewUrl}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
            Voir les soumissions en attente →
          </a>
          <div style="margin-top:24px;color:#9ca3af;font-size:12px;">${outroHtml}</div>
        </div>
      `,
    }).catch(() => {}) // fail silently — submission is still saved
  }

  return NextResponse.json(pending, { status: 201 })
}
