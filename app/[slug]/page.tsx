import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mapsSearchUrl } from '@/lib/map-links'
import { ContactForm } from './ContactForm'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hex(color: string, opacity: number) {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
  return color + alpha
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fullConcertAddress(concert: {
  location: string
  address: string | null
  postalCode: string | null
  city: string | null
}) {
  return [
    concert.location,
    concert.address,
    [concert.postalCode, concert.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
}

interface MemberCard {
  userId: number
  displayName: string
  instrumentLabel: string
  bio: string
  photoUrl?: string
  show: boolean
  order: number
}

function SocialIcon({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      title={label}
      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
    >
      {icon}
    </a>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GroupPublicPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { concert?: string }
}) {
  const page = await prisma.groupPage.findUnique({
    where: { slug: params.slug },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          archivedAt: true,
          isTest: true,
          members: {
            where: { groupRole: 'CHEF' },
            select: { userId: true },
          },
          concerts: {
            where: { date: { gte: new Date() }, isPublic: true },
            orderBy: { date: 'asc' },
            take: 5,
            select: { id: true, name: true, date: true, location: true, address: true, postalCode: true, city: true, startTime: true },
          },
        },
      },
    },
  })

  if (!page) notFound()
  if (page.group.archivedAt) notFound() // groupe archivé : page publique désactivée
  if (page.group.isTest) notFound() // groupe de test : masqué du site public

  // If draft, only accessible to chefs
  if (!page.published) {
    const session = await getServerSession(authOptions)
    const chefIds = new Set(page.group.members.map(m => m.userId))
    const isChef = session?.user?.siteRole === 'ADMIN' || (session?.user?.id && chefIds.has(Number(session.user.id)))
    if (!isChef) notFound()
  }

  const cards: MemberCard[] = Array.isArray(page.memberCards) ? page.memberCards as MemberCard[] : []
  const visibleCards = cards.filter(c => c.show !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const p = page.primaryColor
  const a = page.accentColor
  const bg = page.bgColor
  const tc = page.textColor
  const requestedConcertId = searchParams?.concert ? Number(searchParams.concert) : NaN
  let contactConcert = Number.isFinite(requestedConcertId)
    ? page.group.concerts.find(c => c.id === requestedConcertId) ?? null
    : null

  if (Number.isFinite(requestedConcertId) && !contactConcert) {
    contactConcert = await prisma.concert.findFirst({
      where: {
        id: requestedConcertId,
        groupId: page.group.id,
        date: { gte: new Date() },
        isPublic: true,
      },
      select: { id: true, name: true, date: true, location: true, address: true, postalCode: true, city: true, startTime: true },
    })
  }

  return (
    <div style={{ backgroundColor: bg, color: tc, minHeight: '100vh' }}>
      <a
        href="/"
        className="fixed left-3 top-3 z-50 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-black/10 backdrop-blur transition-colors hover:bg-white sm:left-4 sm:top-4"
      >
        ← Retour vers Sol au Piano
      </a>

      {/* Draft banner */}
      {!page.published && (
        <div className="text-center py-2 text-sm font-semibold text-white" style={{ background: '#f59e0b' }}>
          ⚠️ Mode brouillon — cette page n'est pas encore publiée
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p} 0%, ${a} 100%)` }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="relative max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center text-white">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-sm">
            {page.bannerTitle || page.group.name}
          </h1>
          {page.bannerSubtitle && (
            <p className="text-lg sm:text-xl text-white/80 font-medium mb-8 max-w-2xl mx-auto">{page.bannerSubtitle}</p>
          )}

          {/* Social links */}
          {(page.instagram || page.facebook || page.youtube || page.spotify || page.website) && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {page.instagram && <SocialIcon href={`https://instagram.com/${page.instagram.replace('@', '')}`} icon="📷" label="Instagram" />}
              {page.facebook && <SocialIcon href={page.facebook.startsWith('http') ? page.facebook : `https://facebook.com/${page.facebook}`} icon="📘" label="Facebook" />}
              {page.youtube && <SocialIcon href={page.youtube.startsWith('http') ? page.youtube : `https://youtube.com/@${page.youtube}`} icon="▶️" label="YouTube" />}
              {page.spotify && <SocialIcon href={page.spotify.startsWith('http') ? page.spotify : `https://open.spotify.com/artist/${page.spotify}`} icon="🎵" label="Spotify" />}
              {page.website && <SocialIcon href={page.website.startsWith('http') ? page.website : `https://${page.website}`} icon="🌐" label="Site web" />}
            </div>
          )}
        </div>
      </div>

      {/* ── BIO ────────────────────────────────────────────────────────────── */}
      {page.bio && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: p }}>Notre histoire</h2>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-center" style={{ color: tc + 'cc' }}>
            {page.bio}
          </p>
        </section>
      )}

      {/* ── MEMBRES ────────────────────────────────────────────────────────── */}
      {visibleCards.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16" style={{ borderTop: `1px solid ${hex(tc, 0.08)}` }}>
          <h2 className="text-2xl font-bold mb-10 text-center" style={{ color: p }}>Les musiciens</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleCards.map(card => (
              <div key={card.userId} className="text-center group">
                {/* Photo */}
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 shadow-lg ring-4" style={{ ringColor: hex(p, 0.3) }}>
                  {card.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.photoUrl}
                      alt={card.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-white" style={{ background: `linear-gradient(135deg, ${p}, ${a})` }}>
                      🎵
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold" style={{ color: tc }}>{card.displayName}</h3>
                <p className="text-sm font-medium mb-3" style={{ color: p }}>{card.instrumentLabel}</p>
                {card.bio && (
                  <p className="text-sm leading-relaxed" style={{ color: tc + 'aa' }}>{card.bio}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CONCERTS ───────────────────────────────────────────────────────── */}
      {page.showConcerts && page.group.concerts.length > 0 && (
        <section className="py-16" style={{ background: hex(p, 0.06), borderTop: `1px solid ${hex(tc, 0.08)}` }}>
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: p }}>Prochains concerts</h2>
            <div className="space-y-4">
              {page.group.concerts.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-5 flex-wrap">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${p}, ${a})` }}>
                    🎭
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-sm capitalize" style={{ color: p }}>{formatDate(c.date.toISOString())}</p>
                    <a
                      href={mapsSearchUrl(fullConcertAddress(c))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-700"
                    >
                      📍 {c.location}
                    </a>
                    {c.address && <p className="text-sm text-gray-400">{c.address}</p>}
                    {(c.postalCode || c.city) && (
                      <p className="text-sm text-gray-400">{[c.postalCode, c.city].filter(Boolean).join(' ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ────────────────────────────────────────────────────────── */}
      {page.showContact && (
        <section id="contact" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-20" style={{ borderTop: `1px solid ${hex(tc, 0.08)}` }}>
          <ContactForm
            slug={params.slug}
            primaryColor={p}
            title={page.contactTitle}
            concert={contactConcert ? {
              id: contactConcert.id,
              name: contactConcert.name,
              date: contactConcert.date.toISOString(),
              location: contactConcert.location,
              address: contactConcert.address,
              postalCode: contactConcert.postalCode,
              city: contactConcert.city,
              startTime: contactConcert.startTime,
            } : null}
          />
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 text-xs" style={{ color: tc + '55', borderTop: `1px solid ${hex(tc, 0.08)}` }}>
        {page.group.name} · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
