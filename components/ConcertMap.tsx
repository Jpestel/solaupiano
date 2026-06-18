'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type * as Leaflet from 'leaflet'

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

interface MapPoint extends MapConcert {
  latitude: number
  longitude: number
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function popupHtml(point: MapPoint) {
  return `
    <div class="concert-map-popup">
      <p class="concert-map-popup-title">${escapeHtml(point.name)}</p>
      <p class="concert-map-popup-group">${escapeHtml(point.groupName)}</p>
      <p class="concert-map-popup-date">${escapeHtml(dateLabel(point.date))}</p>
      <p class="concert-map-popup-address">${escapeHtml(fullAddress(point))}</p>
    </div>
  `
}

function tooltipHtml(point: MapPoint) {
  return `
    <div>
      <strong>${escapeHtml(point.name)}</strong>
      <span>${escapeHtml(point.location || point.city || '')}</span>
    </div>
  `
}

export function ConcertMap({ concerts }: { concerts: MapConcert[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const layerRef = useRef<Leaflet.LayerGroup | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const points = useMemo<MapPoint[]>(() => (
    concerts
      .filter((c): c is MapPoint => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
      .map((c) => ({ ...c, latitude: Number(c.latitude), longitude: Number(c.longitude) }))
  ), [concerts])

  const [selectedId, setSelectedId] = useState<number | null>(points[0]?.id ?? null)
  const selected = points.find((p) => p.id === selectedId) ?? points[0] ?? null

  useEffect(() => {
    if (selectedId === null && points.length > 0) {
      setSelectedId(points[0].id)
    }
  }, [points, selectedId])

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!containerRef.current || mapRef.current) return

      const L = await import('leaflet')
      if (cancelled || !containerRef.current) return

      leafletRef.current = L
      const map = L.map(containerRef.current, {
        center: [46.7, 2.2],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer || !mapReady) return

    layer.clearLayers()

    if (points.length === 0) {
      map.setView([46.7, 2.2], 5)
      return
    }

    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude]))

    points.forEach((point) => {
      const isSelected = point.id === selected?.id
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<span class="concert-map-pin${isSelected ? ' is-active' : ''}"><span></span></span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        riseOnHover: true,
      })

      marker.bindTooltip(tooltipHtml(point), {
        className: 'concert-map-tooltip',
        direction: 'top',
        offset: [0, -16],
        opacity: 1,
        sticky: true,
      })
      marker.bindPopup(popupHtml(point), {
        className: 'concert-map-leaflet-popup',
        maxWidth: 260,
      })
      marker.on('click', () => {
        setSelectedId(point.id)
        marker.openPopup()
      })
      marker.addTo(layer)

      if (isSelected) {
        marker.openPopup()
      }
    })

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 9)
    } else {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 })
    }
  }, [mapReady, points, selected])

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/10 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Carte des concerts</p>
          <p className="text-xs text-white/60">
            {points.length > 0
              ? `${points.length} lieu${points.length > 1 ? 'x' : ''} public${points.length > 1 ? 's' : ''} géolocalisé${points.length > 1 ? 's' : ''}`
              : 'Les prochains concerts apparaîtront ici'}
          </p>
        </div>
        <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-bold text-indigo-950">
          France
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900">
        <div ref={containerRef} className="h-[360px] w-full" aria-label="Carte zoomable des concerts publics" />

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-sm font-medium text-white/75">
            Chargement de la carte...
          </div>
        )}

        {points.length === 0 && mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 px-8 text-center">
            <p className="text-sm font-medium text-white/80">Ajoutez des concerts publics avec une adresse complète pour les voir apparaître sur la carte.</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-3 rounded-2xl border border-white/15 bg-white px-4 py-3 text-gray-900">
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
  )
}
