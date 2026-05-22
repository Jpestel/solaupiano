'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Rehearsal {
  id: number
  groupId: number
  date: string
  location: string
  startTime: string
  endTime: string | null
  notes: string | null
  group: { id: number; name: string }
}

interface Concert {
  id: number
  groupId: number
  date: string
  name: string
  location: string
  notes: string | null
  group: { id: number; name: string }
}

type CalEvent =
  | { type: 'repetition'; data: Rehearsal }
  | { type: 'concert'; data: Concert }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns monday-aligned grid for the month (6 × 7 cells, some null = filler) */
function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday = 0 … Sunday = 6  (JS getDay: Sun=0, Mon=1…)
  const startPad = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7
  const grid: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      grid.push(null)
    } else {
      grid.push(new Date(year, month, dayNum))
    }
  }
  return grid
}

function getEventDate(e: CalEvent): string {
  return e.data.date.slice(0, 10)
}

// ─── EventChip ───────────────────────────────────────────────────────────────
function EventChip({ event }: { event: CalEvent }) {
  if (event.type === 'repetition') {
    const r = event.data as Rehearsal
    return (
      <Link
        href={`/groupes/${r.groupId}/repetitions/${r.id}`}
        className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
        title={`${r.group.name} — ${r.startTime}${r.endTime ? ` → ${r.endTime}` : ''} — ${r.location}`}
      >
        🎸 {r.group.name}
      </Link>
    )
  }
  const c = event.data as Concert
  return (
    <Link
      href={`/groupes/${c.groupId}/concerts`}
      className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      title={`${c.name} — ${c.group.name} — ${c.location}`}
    >
      🎵 {c.name}
    </Link>
  )
}

// ─── Selected day panel ───────────────────────────────────────────────────────
function DayPanel({ events, date }: { events: CalEvent[]; date: Date }) {
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun événement ce jour.</p>
      ) : (
        events.map((e, i) => {
          if (e.type === 'repetition') {
            const r = e.data as Rehearsal
            return (
              <Link key={i} href={`/groupes/${r.groupId}/repetitions/${r.id}`}
                className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 hover:bg-indigo-100 transition-colors"
              >
                <span className="text-xl mt-0.5">🎸</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-800">Répétition — {r.group.name}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    {r.startTime}{r.endTime ? ` → ${r.endTime}` : ''} · {r.location}
                  </p>
                  {r.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.notes}</p>}
                </div>
              </Link>
            )
          }
          const c = e.data as Concert
          return (
            <Link key={i} href={`/groupes/${c.groupId}/concerts`}
              className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 hover:bg-purple-100 transition-colors"
            >
              <span className="text-xl mt-0.5">🎵</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-purple-800">{c.name} — {c.group.name}</p>
                <p className="text-xs text-purple-600 mt-0.5">{c.location}</p>
                {c.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.notes}</p>}
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CalendrierPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Fetch all events once
  useEffect(() => {
    fetch('/api/calendrier')
      .then((r) => r.json())
      .then(({ rehearsals = [], concerts = [] }) => {
        const all: CalEvent[] = [
          ...rehearsals.map((r: Rehearsal) => ({ type: 'repetition' as const, data: r })),
          ...concerts.map((c: Concert) => ({ type: 'concert' as const, data: c })),
        ]
        setEvents(all)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const grid = buildGrid(year, month)

  // Index events by date string
  const eventsByDate: Record<string, CalEvent[]> = {}
  for (const e of events) {
    const key = getEventDate(e)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(e)
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(today)
  }

  const todayKey = isoDate(today)
  const selectedKey = selectedDate ? isoDate(selectedDate) : null
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] ?? []) : []

  // Count upcoming events (next 30 days)
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const upcomingCount = events.filter((e) => {
    const d = new Date(e.data.date)
    return d >= today && d <= in30
  }).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📅 Calendrier
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Chargement...' : `${events.length} événement${events.length > 1 ? 's' : ''} au total${upcomingCount > 0 ? ` · ${upcomingCount} dans les 30 prochains jours` : ''}`}
          </p>
        </div>
        <a
          href="/api/calendrier/export"
          download="solaupiano.ics"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Exporter en iCal pour Google Calendar, Apple Calendar, etc."
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter (.ics)
        </a>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-400" />
          <span className="text-gray-600">Répétition</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-purple-400" />
          <span className="text-gray-600">Concert</span>
        </span>
      </div>

      {/* Calendar card */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Mois précédent"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">
              {MONTHS_FR[month]} {year}
            </h2>
            <button
              onClick={goToday}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Aujourd'hui
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Mois suivant"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_FR.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {grid.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[80px] bg-gray-50/60" />
            }
            const key = isoDate(day)
            const dayEvents = eventsByDate[key] ?? []
            const isToday = key === todayKey
            const isSelected = key === selectedKey
            const isCurrentMonth = day.getMonth() === month

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`min-h-[80px] p-1.5 text-left transition-colors w-full ${
                  isSelected
                    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300'
                    : isToday
                    ? 'bg-indigo-50/50'
                    : 'hover:bg-gray-50'
                } ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                {/* Day number */}
                <div className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                  isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>

                {/* Events (max 3 shown, rest as "+N") */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={i} className="pointer-events-none">
                      <div className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${
                        e.type === 'repetition'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {e.type === 'repetition'
                          ? `🎸 ${(e.data as Rehearsal).group.name}`
                          : `🎵 ${(e.data as Concert).name}`}
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-gray-400 font-medium pl-1">
                      +{dayEvents.length - 3} de plus
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <DayPanel events={selectedEvents} date={selectedDate} />
      )}

      {/* Upcoming list */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Prochains événements</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (() => {
          const upcoming = events
            .filter((e) => new Date(e.data.date) >= new Date(todayKey))
            .sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime())
            .slice(0, 10)

          if (upcoming.length === 0) {
            return (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-sm text-gray-400">Aucun événement à venir.</p>
              </div>
            )
          }

          return (
            <div className="space-y-2">
              {upcoming.map((e, i) => {
                const dateObj = new Date(e.data.date)
                const dateStr = dateObj.toLocaleDateString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })
                if (e.type === 'repetition') {
                  const r = e.data as Rehearsal
                  return (
                    <Link
                      key={i}
                      href={`/groupes/${r.groupId}/repetitions/${r.id}`}
                      className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 hover:bg-indigo-100 transition-colors"
                    >
                      <span className="text-xl">🎸</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-800 truncate">Répétition — {r.group.name}</p>
                        <p className="text-xs text-indigo-600 mt-0.5">
                          {dateStr} · {r.startTime}{r.endTime ? ` → ${r.endTime}` : ''} · {r.location}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                }
                const c = e.data as Concert
                return (
                  <Link
                    key={i}
                    href={`/groupes/${c.groupId}/concerts`}
                    className="flex items-center gap-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 hover:bg-purple-100 transition-colors"
                  >
                    <span className="text-xl">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-purple-800 truncate">{c.name} — {c.group.name}</p>
                      <p className="text-xs text-purple-600 mt-0.5">{dateStr} · {c.location}</p>
                    </div>
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
