'use client'

import { useState } from 'react'

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INCERTAIN'

interface AttendanceButtonProps {
  rehearsalId: number
  currentStatus: AttendanceStatus
  onUpdate?: (status: AttendanceStatus) => void
}

const options: { value: AttendanceStatus; label: string; colors: string }[] = [
  {
    value: 'PRESENT',
    label: 'Présent',
    colors: 'bg-green-600 text-white ring-green-500',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    colors: 'bg-red-600 text-white ring-red-500',
  },
  {
    value: 'INCERTAIN',
    label: 'Incertain',
    colors: 'bg-yellow-500 text-white ring-yellow-400',
  },
]

const inactiveColors: Record<AttendanceStatus, string> = {
  PRESENT: 'text-green-700 bg-green-50 hover:bg-green-100 ring-green-300',
  ABSENT: 'text-red-700 bg-red-50 hover:bg-red-100 ring-red-300',
  INCERTAIN: 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100 ring-yellow-300',
}

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

  return (
    <div className="inline-flex rounded-lg ring-1 ring-gray-200 overflow-hidden" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          disabled={loading}
          className={`px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
            status === option.value
              ? `${option.colors} ring-1`
              : `${inactiveColors[option.value]} ring-0`
          } disabled:opacity-60`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
