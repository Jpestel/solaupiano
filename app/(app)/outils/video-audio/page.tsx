'use client'

import { useState, useRef } from 'react'
import { decodeAudioFromFile, audioBufferToWav, audioBufferToMp3, baseName } from '@/lib/audio-extract'

type Fmt = 'mp3' | 'wav'

function fmtBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} Mo`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} Go`
}
function fmtDur(s: number) {
  if (!isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function VideoAudioPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fmt, setFmt] = useState<Fmt>('mp3')
  const [kbps, setKbps] = useState(192)
  const [busy, setBusy] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null)
  const [info, setInfo] = useState<{ duration: number; channels: number; rate: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    if (result) URL.revokeObjectURL(result.url)
    setResult(null); setInfo(null); setError(''); setProgress(0); setPhase('')
  }

  const pick = (f: File | null) => {
    reset()
    setFile(f)
    setRightsConfirmed(false)
  }

  const extract = async () => {
    if (!file || !rightsConfirmed) return
    setBusy(true); setError(''); setResult(null); setProgress(0)
    try {
      setPhase('Décodage de la vidéo…')
      const buffer = await decodeAudioFromFile(file)
      setInfo({ duration: buffer.duration, channels: buffer.numberOfChannels, rate: buffer.sampleRate })

      let blob: Blob
      if (fmt === 'wav') {
        setPhase('Création du WAV…')
        setProgress(0.5)
        blob = audioBufferToWav(buffer)
      } else {
        setPhase('Encodage MP3…')
        blob = await audioBufferToMp3(buffer, kbps, (p) => setProgress(p))
      }
      const url = URL.createObjectURL(blob)
      setResult({ url, name: `${baseName(file.name)}.${fmt}`, size: blob.size })
      setPhase('')
    } catch (e) {
      console.error(e)
      setError("Impossible de décoder l'audio de ce fichier. Essayez un autre format (MP4, MOV, WEBM, M4A) ou un autre fichier.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🎬 → 🎵 Extraire l’audio d’une vidéo</h1>
      <p className="text-gray-500 text-sm mt-1">
        Déposez un fichier vidéo (MP4, MOV, WEBM…) et récupérez la piste audio en <strong>MP3</strong> ou <strong>WAV</strong>.
        Tout se passe <strong>sur votre appareil</strong> : aucun fichier n’est envoyé sur Internet.
      </p>
      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        ⚖️ À n’utiliser que pour des vidéos <strong>dont vous détenez les droits</strong> (vos propres enregistrements, contenus libres…). L’extraction depuis des contenus protégés sans autorisation n’est pas permise.
      </div>

      {/* Zone de dépôt */}
      <div className="mt-5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />
        {!file ? (
          <>
            <p className="text-4xl mb-2">🎬</p>
            <button onClick={() => inputRef.current?.click()} className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-500">
              Choisir une vidéo
            </button>
            <p className="text-xs text-gray-400 mt-2">MP4, MOV, WEBM, M4A…</p>
          </>
        ) : (
          <div className="text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">🎬 {file.name}</p>
                <p className="text-xs text-gray-400">{fmtBytes(file.size)}{info && ` · ${fmtDur(info.duration)} · ${info.channels > 1 ? 'stéréo' : 'mono'} · ${(info.rate / 1000).toFixed(1)} kHz`}</p>
              </div>
              <button onClick={() => inputRef.current?.click()} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0">Changer</button>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          {/* Format */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Format de sortie</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFmt('mp3')} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${fmt === 'mp3' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                MP3 <span className="font-normal text-gray-400">(léger, recommandé)</span>
              </button>
              <button onClick={() => setFmt('wav')} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${fmt === 'wav' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                WAV <span className="font-normal text-gray-400">(qualité brute, volumineux)</span>
              </button>
            </div>
            {fmt === 'mp3' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Qualité :</span>
                {[128, 192, 256, 320].map((k) => (
                  <button key={k} onClick={() => setKbps(k)} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${kbps === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{k} kbps</button>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              Je confirme disposer des droits ou de l&apos;autorisation nécessaire pour extraire l&apos;audio de ce fichier, et ne pas utiliser cet outil pour contourner les conditions d&apos;une plateforme comme YouTube.
            </span>
          </label>

          <button
            onClick={extract}
            disabled={busy || !rightsConfirmed}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? (phase || 'Traitement…') : `🎵 Extraire l’audio (${fmt.toUpperCase()})`}
          </button>

          {busy && (
            <div>
              <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{phase}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">✓ Audio extrait — {result.name} <span className="font-normal text-green-700">({fmtBytes(result.size)})</span></p>
              <audio controls src={result.url} className="w-full mb-3" />
              <a href={result.url} download={result.name} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">
                ⬇ Télécharger {result.name}
              </a>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-4">
        💡 Astuce : importez le MP3 obtenu dans l’onglet <strong>🎚 Séquences</strong> d’un morceau pour le travailler avec le <strong>ralenti</strong> et la <strong>boucle A–B</strong>.
      </p>
    </div>
  )
}
