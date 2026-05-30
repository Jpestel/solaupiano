'use client'

import { useState } from 'react'

export interface MiniTutorial {
  id: number
  title: string
  description: string | null
  videoPath: string
}

export function SectionTutorials({ tutorials }: { tutorials: MiniTutorial[] }) {
  const [playing, setPlaying] = useState<MiniTutorial | null>(null)

  if (!tutorials || tutorials.length === 0) return null

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {tutorials.map(t => (
          <button
            key={t.id}
            onClick={() => setPlaying(t)}
            className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
            title={t.description ?? undefined}
          >
            <span>▶</span>
            <span>{t.title}</span>
          </button>
        ))}
      </div>

      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPlaying(null)}
        >
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-white font-semibold">{playing.title}</h3>
                {playing.description && (
                  <p className="text-white/60 text-xs mt-0.5">{playing.description}</p>
                )}
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="text-white/70 hover:text-white text-2xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
            <video
              key={playing.id}
              src={playing.videoPath}
              controls
              autoPlay
              className="w-full rounded-xl bg-black shadow-2xl max-h-[65vh]"
            />
            {tutorials.length > 1 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {tutorials.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPlaying(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      playing.id === t.id ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'
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
