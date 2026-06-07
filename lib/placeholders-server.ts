import { prisma } from './prisma'

const PREFIX = 'ph.'

/** Lit les surcharges de placeholders (clé nue -> valeur) depuis SiteSetting. */
export async function getPlaceholderOverrides(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: PREFIX } } })
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key.slice(PREFIX.length)] = r.value
    return out
  } catch {
    return {}
  }
}

/** Enregistre/supprime une surcharge. value vide ou null => suppression (retour au défaut). */
export async function setPlaceholderOverride(key: string, value: string | null) {
  const dbKey = PREFIX + key
  if (!value || !value.trim()) {
    await prisma.siteSetting.deleteMany({ where: { key: dbKey } })
  } else {
    await prisma.siteSetting.upsert({ where: { key: dbKey }, update: { value }, create: { key: dbKey, value } })
  }
}
