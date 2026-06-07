import { prisma } from './prisma'
import { DEFAULT_RESOURCE_LINKS } from './resource-links'

// Sème le catalogue par défaut au premier accès.
export async function ensureResourceLinksSeeded() {
  const count = await prisma.resourceLink.count()
  if (count === 0) {
    await prisma.resourceLink.createMany({ data: DEFAULT_RESOURCE_LINKS })
  }
}

export interface EffectiveLink {
  id: number
  label: string
  icon: string
  category: string
  urlTemplate: string
  description: string | null
  active: boolean
}

// Liens (catalogue global) avec leur état effectif pour un groupe donné.
export async function getEffectiveResourceLinks(groupId: number): Promise<EffectiveLink[]> {
  await ensureResourceLinksSeeded()
  const [links, overrides] = await Promise.all([
    prisma.resourceLink.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    prisma.groupResourceLink.findMany({ where: { groupId } }),
  ])
  const ov = new Map(overrides.map((o) => [o.resourceLinkId, o.active]))
  return links.map((l) => ({
    id: l.id,
    label: l.label,
    icon: l.icon,
    category: l.category,
    urlTemplate: l.urlTemplate,
    description: l.description,
    active: ov.has(l.id) ? (ov.get(l.id) as boolean) : l.defaultActive,
  }))
}
