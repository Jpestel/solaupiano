import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { mapsSearchUrl } from '@/lib/map-links'
import { ConcertContactForm } from './ConcertContactForm'

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function fullAddress(concert: {
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

export default async function ConcertContactPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) notFound()

  const concert = await prisma.concert.findFirst({
    where: { id, isPublic: true, date: { gte: new Date() } },
    select: {
      id: true,
      name: true,
      date: true,
      startTime: true,
      location: true,
      address: true,
      postalCode: true,
      city: true,
      group: { select: { name: true } },
    },
  })

  if (!concert) notFound()

  const address = fullAddress(concert)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Retour à la carte des concerts
        </Link>

        <div className="mt-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-8 text-white shadow-lg">
          <p className="text-sm font-semibold text-white/75">{concert.group.name}</p>
          <h1 className="mt-2 text-3xl font-black">{concert.group.name} en concert ici</h1>
          <a
            href={mapsSearchUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-white/85 underline decoration-white/40 underline-offset-4 hover:text-white"
          >
            📍 {address}
          </a>
          <p className="mt-2 font-bold text-amber-200">
            {formatDate(concert.date)}
            {concert.startTime ? `, à partir de ${concert.startTime}` : ' · Heure à confirmer, contactez le groupe via le formulaire'}
          </p>
        </div>

        <div className="mt-6">
          <ConcertContactForm
            concert={{
              id: concert.id,
              name: concert.name,
              groupName: concert.group.name,
              date: concert.date.toISOString(),
              startTime: concert.startTime,
              address,
            }}
          />
        </div>
      </div>
    </main>
  )
}
