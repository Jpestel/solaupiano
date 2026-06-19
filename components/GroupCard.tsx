import Link from 'next/link'
import { PublicJoinButton } from '@/app/PublicJoinButton'
import {
  parseGroupCardLines,
  defaultGroupCardLines,
  type GroupCardSettings,
  type GroupCardLineStyle,
} from '@/lib/site-settings'

export interface GroupCardData {
  id: number
  name: string
  description: string | null
  style: string | null
  coverUrl: string | null
  isPublic: boolean
  lookingFor: string | null
  _count: { members: number }
  groupPage: { slug: string; published: boolean; showContact: boolean } | null
}

function parseLookingFor(raw?: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// Substitue les jetons puis nettoie les séparateurs orphelins (ex. « 4 membres · »).
function renderLine(text: string, ctx: Record<string, string>) {
  const out = text.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? '')
  return out
    .replace(/\s*·\s*·\s*/g, ' · ')
    .replace(/^\s*·\s*/, '')
    .replace(/\s*·\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Style de ligne → classes (et couleur configurable en mode « sans photo »).
const LINE_STYLES: Record<GroupCardLineStyle, { cls: string; colorKey: keyof GroupCardSettings; coverCls: string }> = {
  title: { cls: 'text-sm font-semibold leading-tight', colorKey: 'groupCardTitleColor', coverCls: 'text-white' },
  subtitle: { cls: 'text-xs', colorKey: 'groupCardTextColor', coverCls: 'text-white/80' },
  accent: { cls: 'text-xs font-medium', colorKey: 'groupCardAccentColor', coverCls: 'text-amber-200' },
  normal: { cls: 'text-xs leading-snug line-clamp-2', colorKey: 'groupCardTextColor', coverCls: 'text-white/85' },
}

export function GroupCard({ group, settings }: { group: GroupCardData; settings: GroupCardSettings }) {
  const hasCover = Boolean(group.coverUrl)
  const ctx: Record<string, string> = {
    nom_groupe: group.name,
    membres: String(group._count.members),
    style: group.style ?? '',
    cherche: parseLookingFor(group.lookingFor).join(', '),
    description: group.description ?? '',
  }

  const lines = parseGroupCardLines(settings.groupCardLines) ?? defaultGroupCardLines()
  const renderedLines = lines
    .map((l) => ({ ...l, content: renderLine(l.text, ctx) }))
    .filter((l) => l.content)

  const page = group.groupPage
  const hasPageLink = Boolean(page?.published && page?.slug)
  const hasContact = Boolean(page?.published && page?.showContact && page?.slug)

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        hasCover ? 'border-transparent min-h-[210px] flex flex-col justify-end' : 'border-gray-200 bg-white hover:border-indigo-200'
      }`}
    >
      {hasCover && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={group.coverUrl!} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
        </>
      )}

      <div className="relative p-4 space-y-3">
        <div className="flex items-start gap-3">
          {!hasCover && (
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
              {group.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderedLines.length > 0 && (
                <p
                  className={hasCover ? `${LINE_STYLES[renderedLines[0].style].cls} ${LINE_STYLES[renderedLines[0].style].coverCls}` : LINE_STYLES[renderedLines[0].style].cls}
                  style={hasCover ? undefined : { color: settings[LINE_STYLES[renderedLines[0].style].colorKey] }}
                >
                  {renderedLines[0].content}
                </p>
              )}
              {!group.isPublic && (
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${hasCover ? 'bg-white/20 text-white backdrop-blur' : 'bg-gray-100 text-gray-500'}`}>🔒 Privé</span>
              )}
            </div>
            {renderedLines.slice(1).map((l, i) => {
              const meta = LINE_STYLES[l.style]
              return (
                <p
                  key={i}
                  className={hasCover ? `${meta.cls} ${meta.coverCls}` : meta.cls}
                  style={hasCover ? undefined : { color: settings[meta.colorKey] }}
                >
                  {l.content}
                </p>
              )
            })}
          </div>
        </div>

        {/* Actions : rejoindre + page + contact */}
        <div className="space-y-2">
          {group.isPublic ? (
            <PublicJoinButton groupId={group.id} groupName={group.name} />
          ) : (
            <p className={`rounded-lg border px-3 py-2 text-center text-xs ${hasCover ? 'bg-white/15 border-white/20 text-white/90 backdrop-blur' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              🔒 Sur invitation du chef uniquement
            </p>
          )}

          {(hasPageLink || hasContact) && (
            <div className="flex gap-2">
              {hasPageLink && (
                <Link
                  href={`/${page!.slug}`}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors ${
                    hasCover
                      ? 'bg-white/15 border-white/25 text-white hover:bg-white/25 backdrop-blur'
                      : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  {settings.groupCardPageLabel}
                </Link>
              )}
              {hasContact && (
                <Link
                  href={`/${page!.slug}#contact`}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors ${
                    hasCover
                      ? 'bg-white/15 border-white/25 text-white hover:bg-white/25 backdrop-blur'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {settings.groupCardContactLabel}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
