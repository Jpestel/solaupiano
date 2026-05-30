'use client'

import { useState, useEffect } from 'react'

interface Tutorial {
  id: number
  title: string
  description: string | null
  videoPath: string
}

export function TutorialButton({ moduleKey }: { moduleKey: string }) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Tutorial | null>(null)

  useEffect(() => {
    fetch(`/api/tutoriels?moduleKey=${moduleKey}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTutorials(data)
          setCurrent(data[0])
        }
      })
      .catch(() => {})
  }, [moduleKey])

  if (tutorials.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
        title="Voir le tutoriel vidéo"
      >
        🎬 Tutoriel vidéo
      </button>

      {open && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-white font-semibold text-base">{current.title}</h3>
                {current.description && (
                  <p className="text-white/60 text-xs mt-0.5">{current.description}</p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-2xl leading-none flex-shrink-0">×</button>
            </div>

            {/* Video */}
            <video
              key={current.id}
              src={current.videoPath}
              controls
              autoPlay
              className="w-full rounded-xl bg-black shadow-2xl max-h-[65vh]"
            />

            {/* Multiple tutorials tabs */}
            {tutorials.length > 1 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {tutorials.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setCurrent(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      current.id === t.id
                        ? 'bg-white text-gray-900'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
