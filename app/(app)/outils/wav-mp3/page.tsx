'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { audioBufferToMp3, baseName, decodeAudioFromFile } from '@/lib/audio-extract'

const TEST_ACCOUNT_EMAIL = 'testeur@solaupiano.fr'

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

export default function WavMp3Page() {
  const { data: session } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [kbps, setKbps] = useState(192)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null)
  const [info, setInfo] = useState<{ duration: number; channels: number; rate: number } | null>(null)
  const readOnlyTestAccount = session?.user?.email === TEST_ACCOUNT_EMAIL

  const reset = () => {
    if (result) URL.revokeObjectURL(result.url)
    setResult(null)
    setInfo(null)
    setError('')
    setProgress(0)
    setPhase('')
  }

  const pick = (f: File | null) => {
    reset()
    setFile(f)
    if (f && !/\.wav$/i.test(f.name) && f.type !== 'audio/wav' && f.type !== 'audio/x-wav') {
      setError('Choisissez plutôt un fichier WAV (.wav).')
    }
  }

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    setProgress(0)
    try {
      setPhase('Décodage du WAV…')
      const buffer = await decodeAudioFromFile(file)
      setInfo({ duration: buffer.duration, channels: buffer.numberOfChannels, rate: buffer.sampleRate })

      setPhase('Encodage MP3…')
      const blob = await audioBufferToMp3(buffer, kbps, (p) => setProgress(p))
      const url = URL.createObjectURL(blob)
      setResult({ url, name: `${baseName(file.name)}.mp3`, size: blob.size })
      setPhase('')
    } catch (e) {
      console.error(e)
      setError("Impossible de convertir ce fichier. Vérifiez qu'il s'agit bien d'un WAV lisible par votre navigateur.")
    } finally {
      setBusy(false)
    }
  }

  const ratio = file && result ? Math.max(0, 100 - (result.size / file.size) * 100) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🎧 WAV → MP3</h1>
      <p className="text-gray-500 text-sm mt-1">
        Compressez un fichier <strong>WAV</strong> en <strong>MP3</strong> pour réduire fortement sa taille avant de le partager ou de l’importer dans Sol au Piano.
        La conversion se fait <strong>sur votre appareil</strong> : le fichier n’est pas envoyé au serveur.
      </p>

      {readOnlyTestAccount && (
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
          Compte TESTEUR : le MP3 généré reste local sur votre appareil et n’est pas enregistré dans l’application.
        </div>
      )}

      <div className="mt-5 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".wav,audio/wav,audio/x-wav"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />
        {!file ? (
          <>
            <p className="text-4xl mb-2">🎧</p>
            <button onClick={() => inputRef.current?.click()} className="rounded-xl bg-sky-600 px-6 py-3 text-base font-bold text-white hover:bg-sky-500">
              Choisir un WAV
            </button>
            <p className="text-xs text-gray-400 mt-2">Fichier .wav, idéalement export brut de répétition, concert ou séquence.</p>
          </>
        ) : (
          <div className="text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">🎧 {file.name}</p>
                <p className="text-xs text-gray-400">
                  {fmtBytes(file.size)}
                  {info && ` · ${fmtDur(info.duration)} · ${info.channels > 1 ? 'stéréo' : 'mono'} · ${(info.rate / 1000).toFixed(1)} kHz`}
                </p>
              </div>
              <button onClick={() => inputRef.current?.click()} className="text-xs font-medium text-sky-600 hover:text-sky-700 shrink-0">Changer</button>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Qualité MP3</p>
            <div className="flex flex-wrap gap-2">
              {[96, 128, 192, 256, 320].map((k) => (
                <button
                  key={k}
                  onClick={() => setKbps(k)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${kbps === k ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {k} kbps
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              128 kbps réduit beaucoup la taille. 192 kbps est un bon équilibre. 320 kbps garde plus de qualité mais compresse moins.
            </p>
          </div>

          <button
            onClick={convert}
            disabled={busy}
            className="w-full rounded-xl bg-sky-600 px-6 py-3 text-base font-bold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {busy ? (phase || 'Conversion…') : 'Convertir en MP3'}
          </button>

          {busy && (
            <div>
              <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{phase}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">
                ✓ MP3 prêt — {result.name} <span className="font-normal text-green-700">({fmtBytes(result.size)}{ratio !== null && ` · -${ratio.toFixed(0)}%`})</span>
              </p>
              <audio controls src={result.url} className="w-full mb-3" />
              <a href={result.url} download={result.name} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">
                ⬇ Télécharger {result.name}
              </a>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-4">
        💡 Le MP3 obtenu peut ensuite être ajouté comme ressource ou comme séquence audio dans un morceau.
      </p>
    </div>
  )
}
