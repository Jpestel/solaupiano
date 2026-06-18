export interface GeocodeResult {
  latitude: number
  longitude: number
  label: string | null
}

export function concertAddressParts(input: {
  location?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
}) {
  return [input.location, input.address, [input.postalCode, input.city].filter(Boolean).join(' ')]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
}

export function concertAddressKey(input: {
  location?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
}) {
  return concertAddressParts(input).join(', ')
}

function compact(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')
}

function concertAddressQueries(input: {
  location?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
}) {
  const postalCity = compact([input.postalCode, input.city])
  const candidates = [
    compact([input.location, input.address, postalCity]),
    compact([input.address, postalCity]),
    compact([input.location, postalCity]),
    postalCity,
    compact([input.city]),
  ]
  const withFrance = candidates.flatMap((query) => query ? [query, `${query}, France`] : [])
  return Array.from(new Set(withFrance))
}

export async function geocodeConcertAddress(input: {
  location?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
}): Promise<GeocodeResult | null> {
  const queries = concertAddressQueries(input)
  if (queries.length === 0) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)

  try {
    for (const query of queries) {
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
        signal: controller.signal,
      })
      if (!res.ok) continue
      const data = await res.json()
      const first = Array.isArray(data) ? data[0] : null
      const lat = Number(first?.lat)
      const lon = Number(first?.lon)
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return {
          latitude: lat,
          longitude: lon,
          label: typeof first?.display_name === 'string' ? first.display_name : null,
        }
      }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
