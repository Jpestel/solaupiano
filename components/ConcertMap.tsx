'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type * as Leaflet from 'leaflet'
import { defaultPopupLines, parsePopupLines, type ConcertPopupSettings, type PopupLine, type PopupLineStyle } from '@/lib/site-settings'

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
  groupCoverUrl: string | null
  startTime: string | null
  latitude: number | null
  longitude: number | null
}

interface MapPoint extends MapConcert {
  latitude: number
  longitude: number
}

type PopupSettings = ConcertPopupSettings

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function fullDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '♪'
}

const LINE_STYLE_META: Record<PopupLineStyle, { className: string; colorKey: keyof PopupSettings }> = {
  title: { className: 'concert-map-popup-title', colorKey: 'concertPopupTitleColor' },
  kicker: { className: 'concert-map-popup-kicker', colorKey: 'concertPopupTitleColor' },
  date: { className: 'concert-map-popup-eventdate', colorKey: 'concertPopupDateColor' },
  address: { className: 'concert-map-popup-address', colorKey: 'concertPopupTextColor' },
  time: { className: 'concert-map-popup-date', colorKey: 'concertPopupAccentColor' },
  normal: { className: 'concert-map-popup-line', colorKey: 'concertPopupTextColor' },
}

// Remplace les jetons {clef} par leur valeur (échappée) et échappe le texte littéral.
function renderTokens(text: string, ctx: Record<string, string>) {
  const tokenRe = /\{(\w+)\}/g
  let out = ''
  let last = 0
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, match.index))
    out += escapeHtml(ctx[match[1]] ?? '')
    last = match.index + match[0].length
  }
  out += escapeHtml(text.slice(last))
  return out
}

function lineHtml(line: PopupLine, ctx: Record<string, string>, settings: PopupSettings, hasTime: boolean) {
  // Cas spécial : une ligne qui affiche l'heure mais sans heure connue => texte de repli.
  const inner = line.text.includes('{heure}') && !hasTime
    ? escapeHtml(settings.concertPopupMissingTimeText)
    : renderTokens(line.text, ctx)
  if (!inner.trim()) return ''
  const meta = LINE_STYLE_META[line.style] ?? LINE_STYLE_META.normal
  return `<p class="${meta.className}" style="color:${escapeHtml(settings[meta.colorKey])};">${inner}</p>`
}

function popupHtml(point: MapPoint, settings: PopupSettings) {
  const contactHref = `/concerts/${encodeURIComponent(String(point.id))}/contact`
  const hasTime = Boolean(point.startTime)
  const ctx: Record<string, string> = {
    nom_groupe: point.groupName,
    date: fullDateLabel(point.date),
    date_courte: dateLabel(point.date),
    heure: point.startTime ?? '',
    adresse: fullAddress(point),
    lieu: point.location ?? '',
    ville: point.city ?? '',
  }

  const parsed = parsePopupLines(settings.concertPopupLines)
  const lines = parsed && parsed.length > 0 ? parsed : defaultPopupLines(settings)
  const bodyHtml = lines.map((line) => lineHtml(line, ctx, settings, hasTime)).join('')

  const avatarHtml = point.groupCoverUrl
    ? `<img class="concert-map-popup-avatar" src="${escapeHtml(point.groupCoverUrl)}" alt="" />`
    : `<span class="concert-map-popup-avatar concert-map-popup-avatar-fallback" style="background:${escapeHtml(settings.concertPopupButtonBgColor)};color:${escapeHtml(settings.concertPopupButtonTextColor)};">${escapeHtml(initials(point.groupName))}</span>`

  return `
    <div class="concert-map-popup" style="background:${escapeHtml(settings.concertPopupBackgroundColor)};">
      <div class="concert-map-popup-heading">${avatarHtml}</div>
      ${bodyHtml}
      <a class="concert-map-popup-link" href="${contactHref}" style="background:${escapeHtml(settings.concertPopupButtonBgColor)};color:${escapeHtml(settings.concertPopupButtonTextColor)} !important;">${escapeHtml(settings.concertPopupButtonLabel)}</a>
    </div>
  `
}

function tooltipHtml(point: MapPoint) {
  return `
    <div class="concert-map-tooltip-content">
      <strong>${escapeHtml(point.name)}</strong>
      <span>${escapeHtml(point.location || point.city || '')}</span>
    </div>
  `
}

export function ConcertMap({ concerts, popupSettings }: { concerts: MapConcert[]; popupSettings: PopupSettings }) {
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
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: '',
          html: `
            <span class="concert-map-pin">
              <span class="concert-map-pin-dot"></span>
            </span>
          `,
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
      marker.bindPopup(popupHtml(point, popupSettings), {
        className: 'concert-map-leaflet-popup',
        maxWidth: 260,
      })
      marker.on('click', () => {
        setSelectedId(point.id)
        marker.openPopup()
      })
      marker.addTo(layer)
    })

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 9)
    } else {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 })
    }
  }, [mapReady, points, popupSettings])

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
                <div className="mt-1 flex items-center gap-2">
                  {selected.groupCoverUrl ? (
                    <img src={selected.groupCoverUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                      {initials(selected.groupName)}
                    </span>
                  )}
                  <p className="text-xs text-gray-500">{selected.groupName}</p>
                </div>
              )}
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
              {selected.startTime ? `${dateLabel(selected.date)} · ${selected.startTime}` : 'Heure à confirmer'}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{fullAddress(selected)}</p>
          <Link
            href={`/concerts/${selected.id}/contact`}
            className="mt-3 inline-flex text-xs font-bold text-indigo-600 hover:underline"
          >
            En savoir plus
          </Link>
        </div>
      )}
    </div>
  )
}
