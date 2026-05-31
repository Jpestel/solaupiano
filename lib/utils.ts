import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy', { locale: fr })
}

export function formatDateWithDay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'EEEE d MMMM yyyy', { locale: fr })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function getResourceIcon(type: string): string {
  switch (type) {
    case 'AUDIO':
      return '🎵'
    case 'VIDEO':
      return '🎬'
    case 'PDF':
      return '📄'
    case 'GRILLE':
      return '🎸'
    case 'IMAGE':
      return '🎼'
    case 'LIEN':
      return '🔗'
    case 'AUTRE':
    default:
      return '📎'
  }
}

export function getResourceTypeLabel(type: string): string {
  switch (type) {
    case 'AUDIO':
      return 'Audio'
    case 'VIDEO':
      return 'Vidéo'
    case 'PDF':
      return 'PDF'
    case 'GRILLE':
      return 'Grille d\'accords'
    case 'IMAGE':
      return 'Partition'
    case 'LIEN':
      return 'Lien'
    case 'AUTRE':
    default:
      return 'Autre'
  }
}

export function isYoutube(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

/** Returns an embeddable iframe URL if the link is a known video platform, null otherwise. */
export function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    // YouTube: youtube.com/watch?v=ID  |  youtu.be/ID  |  youtube.com/shorts/ID
    if (host === 'youtube.com' || host === 'youtu.be') {
      let id: string | null = null
      if (host === 'youtu.be') {
        id = u.pathname.slice(1).split('/')[0]
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/shorts/')[1]?.split('/')[0]
      } else {
        id = u.searchParams.get('v')
      }
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
    }

    // Vimeo: vimeo.com/ID  or  vimeo.com/channels/*/ID
    if (host === 'vimeo.com') {
      const parts = u.pathname.split('/').filter(Boolean)
      const id = parts[parts.length - 1]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}?autoplay=1`
    }

    // Dailymotion: dailymotion.com/video/ID
    if (host === 'dailymotion.com') {
      const match = u.pathname.match(/\/video\/([^_]+)/)
      if (match) return `https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1`
    }
  } catch {
    // invalid URL
  }
  return null
}

export function detectResourceType(mimeType: string, filename: string): string {
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMAGE'

  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogv'].includes(ext || '')) return 'VIDEO'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext || '')) return 'AUDIO'
  if (ext === 'pdf') return 'PDF'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'IMAGE'

  return 'AUTRE'
}

/** Vrai si une URL/chemin pointe vers un fichier vidéo lisible directement */
export function isVideoFile(path: string): boolean {
  const ext = path.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext || '')
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
