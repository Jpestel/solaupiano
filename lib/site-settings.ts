import { prisma } from './prisma'
import type { ThemeId } from './themes'

export const SITE_ICONS = ['🎶', '🎵', '🎼', '🎸', '🎺', '🥁', '🎻', '🎷', '🎹', '🪗']

export interface ConcertPopupSettings {
  concertPopupKicker: string
  concertPopupDatePrefix: string
  concertPopupTimePrefix: string
  concertPopupMissingTimeText: string
  concertPopupButtonLabel: string
  concertPopupBackgroundColor: string
  concertPopupTitleColor: string
  concertPopupTextColor: string
  concertPopupDateColor: string
  concertPopupAccentColor: string
  concertPopupButtonBgColor: string
  concertPopupButtonTextColor: string
  // Composition libre de la popup : tableau JSON de lignes { text, style }.
  // text peut contenir des jetons (voir POPUP_TOKENS). Vide => lignes par défaut.
  concertPopupLines: string
}

export type PopupLineStyle = 'title' | 'kicker' | 'date' | 'address' | 'time' | 'normal'

export interface PopupLine {
  text: string
  style: PopupLineStyle
}

export const POPUP_LINE_STYLES: PopupLineStyle[] = ['title', 'kicker', 'date', 'address', 'time', 'normal']

export const POPUP_LINE_STYLE_LABELS: Record<PopupLineStyle, string> = {
  title: 'Titre',
  kicker: 'Sous-titre',
  date: 'Date',
  address: 'Adresse',
  time: 'Heure',
  normal: 'Texte normal',
}

// Jetons de données insérables dans le texte des lignes.
export const POPUP_TOKENS: { token: string; label: string }[] = [
  { token: '{nom_groupe}', label: 'Nom du groupe' },
  { token: '{date}', label: 'Date (longue)' },
  { token: '{date_courte}', label: 'Date (courte)' },
  { token: '{heure}', label: 'Heure' },
  { token: '{adresse}', label: 'Adresse complète' },
  { token: '{lieu}', label: 'Lieu / salle' },
  { token: '{ville}', label: 'Ville' },
]

// Lignes par défaut, dérivées des anciens réglages texte (rétro-compat).
export function defaultPopupLines(
  s: Pick<ConcertPopupSettings, 'concertPopupKicker' | 'concertPopupDatePrefix' | 'concertPopupTimePrefix'>
): PopupLine[] {
  const datePrefix = s.concertPopupDatePrefix?.trim()
  const timePrefix = s.concertPopupTimePrefix?.trim()
  return [
    { text: '{nom_groupe}', style: 'title' },
    { text: s.concertPopupKicker?.trim() || 'en concert ici', style: 'kicker' },
    { text: `${datePrefix ? `${datePrefix} ` : ''}{date}`, style: 'date' },
    { text: '{adresse}', style: 'address' },
    { text: `${timePrefix ? `${timePrefix} ` : ''}{heure}`, style: 'time' },
  ]
}

export function parsePopupLines(raw: string | null | undefined): PopupLine[] | null {
  if (!raw) return null
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    const lines = arr
      .filter((l): l is { text: unknown; style?: unknown } => Boolean(l) && typeof l === 'object')
      .filter((l) => typeof l.text === 'string')
      .map((l) => ({
        text: l.text as string,
        style: (POPUP_LINE_STYLES.includes(l.style as PopupLineStyle) ? l.style : 'normal') as PopupLineStyle,
      }))
    return lines
  } catch {
    return null
  }
}

export interface SiteSettings extends ConcertPopupSettings {
  siteIcon: string
  colorTheme: ThemeId
}

export const DEFAULT_SETTINGS = {
  siteIcon: '🎶',
  colorTheme: 'indigo' as ThemeId,
  concertPopupKicker: 'en concert ici',
  concertPopupDatePrefix: 'le',
  concertPopupTimePrefix: 'à partir de',
  concertPopupMissingTimeText: 'Heure à confirmer, cliquez sur en savoir plus pour contacter le groupe',
  concertPopupButtonLabel: 'En savoir plus',
  concertPopupBackgroundColor: '#ffffff',
  concertPopupTitleColor: '#111827',
  concertPopupTextColor: '#6b7280',
  concertPopupDateColor: '#111827',
  concertPopupAccentColor: '#7c3aed',
  concertPopupButtonBgColor: '#4f46e5',
  concertPopupButtonTextColor: '#ffffff',
  concertPopupLines: '',
} satisfies SiteSettings

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      siteIcon: map.siteIcon ?? DEFAULT_SETTINGS.siteIcon,
      colorTheme: (map.colorTheme as ThemeId) ?? DEFAULT_SETTINGS.colorTheme,
      concertPopupKicker: map.concertPopupKicker ?? DEFAULT_SETTINGS.concertPopupKicker,
      concertPopupDatePrefix: map.concertPopupDatePrefix ?? DEFAULT_SETTINGS.concertPopupDatePrefix,
      concertPopupTimePrefix: map.concertPopupTimePrefix ?? DEFAULT_SETTINGS.concertPopupTimePrefix,
      concertPopupMissingTimeText: map.concertPopupMissingTimeText ?? DEFAULT_SETTINGS.concertPopupMissingTimeText,
      concertPopupButtonLabel: map.concertPopupButtonLabel ?? DEFAULT_SETTINGS.concertPopupButtonLabel,
      concertPopupBackgroundColor: map.concertPopupBackgroundColor ?? DEFAULT_SETTINGS.concertPopupBackgroundColor,
      concertPopupTitleColor: map.concertPopupTitleColor ?? DEFAULT_SETTINGS.concertPopupTitleColor,
      concertPopupTextColor: map.concertPopupTextColor ?? DEFAULT_SETTINGS.concertPopupTextColor,
      concertPopupDateColor: map.concertPopupDateColor ?? DEFAULT_SETTINGS.concertPopupDateColor,
      concertPopupAccentColor: map.concertPopupAccentColor ?? DEFAULT_SETTINGS.concertPopupAccentColor,
      concertPopupButtonBgColor: map.concertPopupButtonBgColor ?? DEFAULT_SETTINGS.concertPopupButtonBgColor,
      concertPopupButtonTextColor: map.concertPopupButtonTextColor ?? DEFAULT_SETTINGS.concertPopupButtonTextColor,
      concertPopupLines: map.concertPopupLines ?? DEFAULT_SETTINGS.concertPopupLines,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSiteSettings(data: Partial<Record<keyof SiteSettings, string>>) {
  await Promise.all(
    Object.entries(data).filter(([, value]) => value !== undefined).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  )
}
