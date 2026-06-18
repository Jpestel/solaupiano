'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface MapConcert {
  id: number
  name: string
  date: string
  location: string
  address: string | null
  postalCode: string | null
  city: string | null
  groupName: string
  groupSlug: string | null
  latitude: number | null
  longitude: number | null
}

const VIEW = {
  minLon: -11,
  maxLon: 31,
  minLat: 35,
  maxLat: 61,
}

function project(lat: number, lon: number) {
  const x = ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * 100
  const y = ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * 100
  return {
    x: Math.max(3, Math.min(97, x)),
    y: Math.max(4, Math.min(96, y)),
  }
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function fullAddress(c: MapConcert) {
  return [
    c.location,
    c.address,
    [c.postalCode, c.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
}

export function ConcertMap({ concerts }: { concerts: MapConcert[] }) {
  const points = useMemo(() => (
    concerts
      .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
      .map((c) => ({ ...c, pos: project(Number(c.latitude), Number(c.longitude)) }))
  ), [concerts])
  const [selectedId, setSelectedId] = useState<number | null>(points[0]?.id ?? null)
  const selected = points.find((p) => p.id === selectedId) ?? points[0] ?? null

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/10 backdrop-blur">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-white">Carte des concerts</p>
          <p className="text-xs text-white/60">
            {points.length > 0
              ? `${points.length} lieu${points.length > 1 ? 'x' : ''} public${points.length > 1 ? 's' : ''} géolocalisé${points.length > 1 ? 's' : ''}`
              : 'Les prochains concerts apparaîtront ici'}
          </p>
        </div>
        <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-bold text-indigo-950">
          Europe
        </span>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/15 bg-[#142f5d]">
        <svg viewBox="0 0 100 75" className="pointer-events-none absolute inset-0 h-full w-full" role="img" aria-label="Carte interactive des concerts publics">
          <defs>
            <linearGradient id="sea" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1d4f8f" />
              <stop offset="100%" stopColor="#4326b9" />
            </linearGradient>
            <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#73d7bd" />
              <stop offset="100%" stopColor="#d9f99d" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>
          <rect width="100" height="75" fill="url(#sea)" />
          <path d="M15 3 C27 8 32 3 40 8 C48 13 61 9 71 16 C80 22 88 17 95 27 C88 31 88 39 76 42 C68 45 69 54 60 60 C50 68 42 61 33 66 C26 70 20 62 22 52 C24 43 14 41 13 32 C11 21 5 13 15 3 Z" fill="url(#land)" opacity="0.82" />
          <path d="M36 30 C42 27 50 29 53 34 C56 40 52 47 46 50 C41 52 35 49 33 43 C31 37 31 33 36 30 Z" fill="#ecfccb" opacity="0.95" filter="url(#softShadow)" />
          <path d="M39 23 C45 21 49 24 52 29" fill="none" stroke="#14532d" strokeOpacity="0.22" strokeWidth="1" />
          <path d="M30 43 C36 45 42 45 48 50" fill="none" stroke="#14532d" strokeOpacity="0.18" strokeWidth="1" />
          <path d="M55 43 C62 43 67 47 71 53" fill="none" stroke="#14532d" strokeOpacity="0.16" strokeWidth="1" />
          <text x="43" y="42" textAnchor="middle" className="fill-emerald-950 text-[4px] font-bold">France</text>
          <text x="57" y="28" textAnchor="middle" className="fill-white/60 text-[3px]">Allemagne</text>
          <text x="34" y="24" textAnchor="middle" className="fill-white/60 text-[3px]">R.-U.</text>
          <text x="47" y="58" textAnchor="middle" className="fill-white/60 text-[3px]">Espagne</text>

          {points.map((point) => {
            const active = point.id === selected?.id
            return (
              <g key={point.id}>
                <circle cx={point.pos.x} cy={point.pos.y} r={active ? 4.6 : 3.6} fill="#fbbf24" opacity={active ? 0.35 : 0.22} />
                <circle cx={point.pos.x} cy={point.pos.y} r={active ? 2.4 : 1.8} fill={active ? '#fef3c7' : '#f59e0b'} stroke="#fff" strokeWidth="0.8" />
              </g>
            )
          })}
        </svg>

        {points.length > 0 && (
          <p className="absolute left-3 top-3 z-10 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            Cliquez sur un point
          </p>
        )}

        {points.map((point) => {
          const active = point.id === selected?.id
          return (
            <button
              key={point.id}
              type="button"
              onClick={() => setSelectedId(point.id)}
              className={`group absolute z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-200 ${active ? 'scale-110' : ''}`}
              style={{ left: `${point.pos.x}%`, top: `${point.pos.y}%` }}
              aria-label={`Afficher ${point.name}`}
              title={`${point.name} - ${point.city ?? point.location}`}
            >
              <span className={`absolute inset-1 rounded-full ${active ? 'bg-amber-200/35' : 'bg-amber-300/25'} animate-pulse`} />
              <span className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg ${active ? 'bg-amber-200' : 'bg-amber-400 group-hover:bg-amber-200'}`} />
            </button>
          )
        })}

        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-sm font-medium text-white/75">Ajoutez des concerts publics avec une adresse complète pour les voir apparaître sur la carte.</p>
          </div>
        )}

        {selected && (
          <div className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-white/30 bg-white px-4 py-3 text-gray-900 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{selected.name}</p>
                {selected.groupSlug ? (
                  <Link href={`/${selected.groupSlug}`} className="text-xs font-medium text-indigo-600 hover:underline">
                    {selected.groupName}
                  </Link>
                ) : (
                  <p className="text-xs text-gray-500">{selected.groupName}</p>
                )}
              </div>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                {dateLabel(selected.date)}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{fullAddress(selected)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
