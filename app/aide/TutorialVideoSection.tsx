'use client'

import { useState } from 'react'
import type { ModuleDef } from '@/lib/modules'

interface Tutorial {
  id: number
  title: string
  description: string | null
  moduleKey: string | null
  videoPath: string
}

interface Props {
  tutorials: Tutorial[]
  modules: ModuleDef[]
}

export function TutorialVideoSection({ tutorials, modules }: Props) {
  const [playing, setPlaying] = useState<Tutorial | null>(null)

  const labelForModule = (key: string | null) => {
    if (!key) return null
    const m = modules.find(m => m.key === key)
    return m ? `${m.icon} ${m.label}` : null
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎬</span>
        <h2 className="text-base font-semibold text-gray-900">Tutoriels vidéo</h2>
        <span className="text-xs text-gray-400">{tutorials.length} vidéo{tutorials.length > 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tutorials.map(t => (
          <button
            key={t.id}
            onClick={() => setPlaying(t)}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-purple-300 hover:shadow-sm transition-all group"
          >
            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
              <span className="text-xl">▶️</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{t.title}</p>
              {labelForModule(t.moduleKey) && (
                <span className="inline-block mt-1 text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                  {labelForModule(t.moduleKey)}
                </span>
              )}
              {t.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal player */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-white font-semibold">{playing.title}</h3>
                {playing.description && <p className="text-white/60 text-xs mt-0.5">{playing.description}</p>}
              </div>
              <button onClick={() => setPlaying(null)} className="text-white/70 hover:text-white text-2xl leading-none flex-shrink-0">×</button>
            </div>
            <video
              key={playing.id}
              src={playing.videoPath}
              controls
              autoPlay
              className="w-full rounded-xl bg-black shadow-2xl max-h-[65vh]"
            />
          </div>
        </div>
      )}
    </section>
  )
}
