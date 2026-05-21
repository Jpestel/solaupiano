'use client'

import { useState } from 'react'

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INCERTAIN'

interface AttendanceButtonProps {
  rehearsalId: number
  currentStatus: AttendanceStatus
  onUpdate?: (status: AttendanceStatus) => void
}

const OPTIONS: {
  value: AttendanceStatus
  label: string
  emoji: string
  activeClass: string
  hoverClass: string
  labelClass: string
}[] = [
  {
    value: 'PRESENT',
    label: 'Présent',
    emoji: '✅',
    activeClass: 'bg-green-500 border-green-500 shadow-green-100 shadow-md',
    hoverClass: 'hover:bg-green-50 hover:border-green-400',
    labelClass: 'text-green-700',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    emoji: '❌',
    activeClass: 'bg-red-500 border-red-500 shadow-red-100 shadow-md',
    hoverClass: 'hover:bg-red-50 hover:border-red-400',
    labelClass: 'text-red-700',
  },
  {
    value: 'INCERTAIN',
    label: 'Peut-être',
    emoji: '🤔',
    activeClass: 'bg-amber-400 border-amber-400 shadow-amber-100 shadow-md',
    hoverClass: 'hover:bg-amber-50 hover:border-amber-300',
    labelClass: 'text-amber-700',
  },
]

export function AttendanceButton({ rehearsalId, currentStatus, onUpdate }: AttendanceButtonProps) {
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus: AttendanceStatus) => {
    if (newStatus === status || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/repetitions/${rehearsalId}/presences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        onUpdate?.(newStatus)
      }
    } catch (err) {
      console.error('Erreur mise à jour présence', err)
    } finally {
      setLoading(false)
    }
  }

  const isUnanswered = status === 'INCERTAIN'

  return (
    <div className="space-y-3">
      {/* Prompt when unanswered */}
      {isUnanswered && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
          <p className="text-xs font-medium text-amber-700">Votre réponse est attendue</p>
        </div>
      )}

      {/* Big choice cards */}
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const isActive = status === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              disabled={loading}
              className={`
                relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3
                transition-all duration-150 disabled:opacity-60
                ${isActive
                  ? `${opt.activeClass} text-white`
                  : `bg-white border-gray-200 ${opt.hoverClass}`
                }
              `}
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <span className={`text-[11px] font-semibold ${isActive ? 'text-white' : opt.labelClass}`}>
                {opt.label}
              </span>
              {isActive && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border-2 border-current flex items-center justify-center">
                  <span className="text-[8px]">✓</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && (
        <p className="text-xs text-center text-gray-400">Enregistrement...</p>
      )}
    </div>
  )
}
