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

export function detectResourceType(mimeType: string, filename: string): string {
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMAGE'

  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext || '')) return 'AUDIO'
  if (ext === 'pdf') return 'PDF'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'IMAGE'

  return 'AUTRE'
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
