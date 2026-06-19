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

// ─── Cards des groupes (accueil) ─────────────────────────────────────────────
export interface GroupCardSettings {
  // Composition libre : JSON [{ text, style }] avec jetons (voir GROUP_CARD_TOKENS).
  groupCardLines: string
  groupCardTitleColor: string
  groupCardTextColor: string
  groupCardAccentColor: string
  groupCardPageLabel: string
  groupCardContactLabel: string
  groupCardSectionTitle: string
  groupCardSeeAllLabel: string
}

export type GroupCardLineStyle = 'title' | 'subtitle' | 'accent' | 'normal'

export interface GroupCardLine {
  text: string
  style: GroupCardLineStyle
}

export const GROUP_CARD_LINE_STYLES: GroupCardLineStyle[] = ['title', 'subtitle', 'accent', 'normal']

export const GROUP_CARD_LINE_STYLE_LABELS: Record<GroupCardLineStyle, string> = {
  title: 'Titre',
  subtitle: 'Sous-titre',
  accent: 'Accent',
  normal: 'Texte normal',
}

export const GROUP_CARD_TOKENS: { token: string; label: string }[] = [
  { token: '{nom_groupe}', label: 'Nom du groupe' },
  { token: '{membres}', label: 'Nombre de membres' },
  { token: '{style}', label: 'Style musical' },
  { token: '{cherche}', label: 'Instruments recherchés' },
  { token: '{description}', label: 'Description' },
]

export function defaultGroupCardLines(): GroupCardLine[] {
  return [
    { text: '{nom_groupe}', style: 'title' },
    { text: '{membres} membres · {style}', style: 'subtitle' },
    { text: 'Cherche : {cherche}', style: 'accent' },
    { text: '{description}', style: 'normal' },
  ]
}

export function parseGroupCardLines(raw: string | null | undefined): GroupCardLine[] | null {
  if (!raw) return null
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    return arr
      .filter((l): l is { text: unknown; style?: unknown } => Boolean(l) && typeof l === 'object')
      .filter((l) => typeof l.text === 'string')
      .map((l) => ({
        text: l.text as string,
        style: (GROUP_CARD_LINE_STYLES.includes(l.style as GroupCardLineStyle) ? l.style : 'normal') as GroupCardLineStyle,
      }))
  } catch {
    return null
  }
}

export interface SiteSettings extends ConcertPopupSettings, GroupCardSettings {
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
  groupCardLines: '',
  groupCardTitleColor: '#111827',
  groupCardTextColor: '#6b7280',
  groupCardAccentColor: '#d97706',
  groupCardPageLabel: 'Voir la page',
  groupCardContactLabel: 'Contacter',
  groupCardSectionTitle: 'Groupes inscrits',
  groupCardSeeAllLabel: 'Voir tous les groupes',
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
      groupCardLines: map.groupCardLines ?? DEFAULT_SETTINGS.groupCardLines,
      groupCardTitleColor: map.groupCardTitleColor ?? DEFAULT_SETTINGS.groupCardTitleColor,
      groupCardTextColor: map.groupCardTextColor ?? DEFAULT_SETTINGS.groupCardTextColor,
      groupCardAccentColor: map.groupCardAccentColor ?? DEFAULT_SETTINGS.groupCardAccentColor,
      groupCardPageLabel: map.groupCardPageLabel ?? DEFAULT_SETTINGS.groupCardPageLabel,
      groupCardContactLabel: map.groupCardContactLabel ?? DEFAULT_SETTINGS.groupCardContactLabel,
      groupCardSectionTitle: map.groupCardSectionTitle ?? DEFAULT_SETTINGS.groupCardSectionTitle,
      groupCardSeeAllLabel: map.groupCardSeeAllLabel ?? DEFAULT_SETTINGS.groupCardSeeAllLabel,
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
