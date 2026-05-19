import { prisma } from './prisma'
import type { ThemeId } from './themes'

export const SITE_ICONS = ['🎶', '🎵', '🎼', '🎸', '🎺', '🥁', '🎻', '🎷', '🎹', '🪗']

export const DEFAULT_SETTINGS = {
  siteIcon: '🎶',
  colorTheme: 'indigo' as ThemeId,
}

export async function getSiteSettings(): Promise<{ siteIcon: string; colorTheme: ThemeId }> {
  try {
    const rows = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      siteIcon: map.siteIcon ?? DEFAULT_SETTINGS.siteIcon,
      colorTheme: (map.colorTheme as ThemeId) ?? DEFAULT_SETTINGS.colorTheme,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSiteSettings(data: Partial<{ siteIcon: string; colorTheme: string }>) {
  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  )
}
