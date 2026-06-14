import { prisma } from './prisma'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const BLOG_DIR = path.join(process.cwd(), 'public', 'uploads', 'blog')
fs.mkdirSync(BLOG_DIR, { recursive: true })

export async function saveBlogImage(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  const name = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
  const out = await sharp(buf).rotate().resize(1600, 900, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  fs.writeFileSync(path.join(BLOG_DIR, name), out)
  return `/uploads/blog/${name}`
}

export async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base || 'article'
  let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || existing.id === excludeId) return slug
    n++
    slug = `${base}-${n}`
  }
}
