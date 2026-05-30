'use client'

import { useState } from 'react'
import { TUTORIAL_CATEGORIES, getCategoryDef } from '@/lib/tutorial-categories'

interface Tutorial {
  id: number
  title: string
  description: string | null
  moduleKey: string | null
  videoPath: string
}

interface Props {
  tutorials: Tutorial[]
}

export function TutorialVideoSection({ tutorials }: Props) {
  const [filter, setFilter] = useState<string>('all')
  const [playing, setPlaying] = useState<Tutorial | null>(null)

  // Collect groups that actually have tutorials
  const usedKeys = [...new Set(tutorials.map(t => t.moduleKey ?? ''))]
  const usedGroups = ['Fonctionnalités', 'Outils'].filter(g =>
    TUTORIAL_CATEGORIES.some(c => c.group === g && usedKeys.includes(c.key))
  )
  const hasGeneral = usedKeys.includes('')

  const filtered = filter === 'all'
    ? tutorials
    : filter === 'general'
      ? tutorials.filter(t => !t.moduleKey)
      : tutorials.filter(t => {
          if (filter === 'Fonctionnalités' || filter === 'Outils') {
            const cat = getCategoryDef(t.moduleKey ?? '')
            return cat?.group === filter
          }
          return t.moduleKey === filter
        })

  const labelForKey = (key: string | null) => {
    if (!key) return 'Général'
    const cat = getCategoryDef(key)
    return cat ? `${cat.icon} ${cat.label}` : key
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎬</span>
        <h2 className="text-base font-semibold text-gray-900">Tutoriels vidéo</h2>
        <span className="text-xs text-gray-400">{tutorials.length} vidéo{tutorials.length > 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      {tutorials.length > 3 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${filter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            Tout voir ({tutorials.length})
          </button>
          {hasGeneral && (
            <button onClick={() => setFilter('general')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${filter === 'general' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              🌐 Général
            </button>
          )}
          {usedGroups.map(g => (
            <button key={g} onClick={() => setFilter(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${filter === g ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {g === 'Fonctionnalités' ? '⚙️' : '🛠'} {g}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => setPlaying(t)}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-purple-300 hover:shadow-sm transition-all group"
          >
            <div className="w-14 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
              <span className="text-lg">▶️</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{t.title}</p>
              <span className="inline-block mt-1 text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                {labelForKey(t.moduleKey)}
              </span>
              {t.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Aucun tutoriel pour ce filtre.</p>
      )}

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
            <video key={playing.id} src={playing.videoPath} controls autoPlay className="w-full rounded-xl bg-black shadow-2xl max-h-[65vh]" />
          </div>
        </div>
      )}
    </section>
  )
}
