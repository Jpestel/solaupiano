import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function addressParts(concert) {
  return [
    concert.location,
    concert.address,
    [concert.postalCode, concert.city].filter(Boolean).join(' '),
  ].map((part) => part?.trim()).filter(Boolean)
}

async function searchAddress(query) {
  if (!query) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('q', query)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SolAuPiano/1.0 (https://solaupiano.fr)',
      'Accept-Language': 'fr',
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  const first = Array.isArray(data) ? data[0] : null
  const latitude = Number(first?.lat)
  const longitude = Number(first?.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    latitude,
    longitude,
    label: typeof first?.display_name === 'string' ? first.display_name : null,
  }
}

async function geocode(concert) {
  const query = addressParts(concert).join(', ')
  return await searchAddress(query) ?? await searchAddress(`${query}, France`)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

try {
  const concerts = await prisma.concert.findMany({
    where: {
      isPublic: true,
      latitude: null,
      longitude: null,
      address: { not: null },
      postalCode: { not: null },
      city: { not: null },
    },
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      postalCode: true,
      city: true,
    },
    orderBy: { id: 'asc' },
  })

  console.log(`Concerts a geocoder: ${concerts.length}`)

  let ok = 0
  let skipped = 0
  for (const concert of concerts) {
    const result = await geocode(concert)
    if (result) {
      await prisma.concert.update({
        where: { id: concert.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          geocodedAddress: result.label,
        },
      })
      ok += 1
      console.log(`OK #${concert.id} ${concert.name}: ${result.latitude}, ${result.longitude}`)
    } else {
      skipped += 1
      console.log(`SKIP #${concert.id} ${concert.name}`)
    }
    await wait(1100)
  }

  console.log(`Termine. geocodes=${ok}, sans_resultat=${skipped}`)
} finally {
  await prisma.$disconnect()
}
