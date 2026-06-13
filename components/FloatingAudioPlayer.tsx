'use client'

import { useState, useEffect } from 'react'
import { SequencePlayer } from '@/components/ui/SequencePlayer'

interface GroupAudio {
  kind: 'sequence' | 'resource'
  id: number
  label: string
  songTitle: string
  filePath: string
}

// Lecteur audio flottant : charge n'importe quel audio du groupe (séquences + ressources audio)
// et reste par-dessus le contenu (ex. une partition PDF ouverte). Persistant tant qu'on reste sur la page.
export function FloatingAudioPlayer({ groupId }: { groupId: number | string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [audios, setAudios] = useState<GroupAudio[]>([])
  const [selKey, setSelKey] = useState('')

  useEffect(() => {
    if (!open || loaded) return
    fetch(`/api/groupes/${groupId}/audios`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAudios(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [open, loaded, groupId])

  const selected = audios.find((a) => `${a.kind}-${a.id}` === selKey) || null

  return (
    <>
      {/* Espace réservé en bas du contenu pour que le lecteur flottant ne masque rien */}
      <div aria-hidden className="h-28 lg:h-24" />

      {/* Bouton flottant quand réduit (l'audio continue de jouer en arrière-plan) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Lecteur audio — jouer un audio du groupe par-dessus"
          className="fixed bottom-20 right-4 lg:bottom-6 z-[60] inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white shadow-lg px-4 py-3 text-sm font-semibold hover:bg-indigo-500"
        >
          🎧 Lecteur audio
          {selKey && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Audio chargé" />}
        </button>
      )}

      {/* Panneau — toujours monté (caché quand réduit) pour ne pas couper l'audio */}
      <div className={`fixed bottom-20 right-4 lg:bottom-6 z-[60] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-2xl ${open ? '' : 'hidden'}`}>
        {/* En-tête */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 bg-indigo-50 rounded-t-2xl">
          <span className="text-sm font-bold text-indigo-800">🎧 Lecteur audio</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setOpen(false)} title="Réduire (l’audio continue)" className="w-7 h-7 rounded-md text-indigo-500 hover:bg-indigo-100">▾</button>
          </div>
        </div>

      <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* Sélecteur */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Choisir un audio du groupe</label>
          <select
            value={selKey}
            onChange={(e) => setSelKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Sélectionner —</option>
            {audios.length > 0 && (
              <optgroup label="🎚 Séquences (backing tracks)">
                {audios.filter((a) => a.kind === 'sequence').map((a) => (
                  <option key={`sequence-${a.id}`} value={`sequence-${a.id}`}>{a.songTitle} — {a.label}</option>
                ))}
              </optgroup>
            )}
            {audios.some((a) => a.kind === 'resource') && (
              <optgroup label="🎵 Ressources audio">
                {audios.filter((a) => a.kind === 'resource').map((a) => (
                  <option key={`resource-${a.id}`} value={`resource-${a.id}`}>{a.songTitle} — {a.label}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {loaded && audios.length === 0 && (
          <p className="text-xs text-gray-400">Aucun audio dans ce groupe. Ajoutez des backing tracks (🎚 Séquences) ou des ressources audio à vos morceaux.</p>
        )}

        {/* Lecteur */}
        {selected && (
          <SequencePlayer
            key={selKey}
            seq={{
              id: selected.kind === 'sequence' ? selected.id : undefined,
              kind: 'AUDIO',
              title: `${selected.songTitle} — ${selected.label}`,
              filePath: selected.filePath,
            }}
          />
        )}
      </div>
      </div>
    </>
  )
}
