'use client'

import { useEffect, useState } from 'react'

export function DismissibleHelp({
  storageKey,
  title,
  children,
}: {
  storageKey: string
  title: string
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    setHidden(localStorage.getItem(storageKey) === 'hidden')
  }, [storageKey])

  const hide = () => {
    localStorage.setItem(storageKey, 'hidden')
    setHidden(true)
  }

  const show = () => {
    localStorage.removeItem(storageKey)
    setHidden(false)
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={show}
        className="no-print inline-flex items-center gap-1 rounded-full border border-lime-200 bg-lime-50 px-3 py-1.5 text-xs font-semibold text-lime-800 hover:bg-lime-100"
      >
        ? Aide
      </button>
    )
  }

  return (
    <div className="no-print rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-lime-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <div className="mt-2 text-lime-900">{children}</div>
        </div>
        <button
          type="button"
          onClick={hide}
          className="rounded-full px-2 py-1 text-xs font-semibold text-lime-700 hover:bg-lime-100"
          aria-label="Masquer l'aide"
          title="Masquer l'aide"
        >
          Masquer
        </button>
      </div>
    </div>
  )
}
