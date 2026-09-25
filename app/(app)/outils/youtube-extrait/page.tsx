'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  youtubeVideoId, youtubeTimes, parseTimeToSeconds, formatSeconds,
  buildYoutubeWatchUrl, buildYoutubeEmbedUrl,
} from '@/lib/youtube'

/** Champ de temps : accepte « 3:43 », « 3mn43 », « 223 »… */
function TimeField({
  label, hint, value, onChange, seconds, error,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  seconds: number | null
  error: boolean
}) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
            : 'border-gray-200 focus:border-indigo-300 focus:ring-indigo-200'
        }`}
      />
      <p className={`mt-1 text-[11px] ${error ? 'text-red-600' : 'text-gray-400'}`}>
        {error
          ? "Format non reconnu — essayez 3:43, 3mn43 ou 223."
          : seconds !== null ? `= ${formatSeconds(seconds)} (${seconds} s)` : hint}
      </p>
    </div>
  )
}

/** Bouton de copie avec retour visuel. */
function CopyRow({ label, url, note }: { label: string; url: string; note: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400">{note}</span>
        <button
          type="button"
          onClick={copy}
          className={`ml-auto rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {copied ? '✓ Copié' : '📋 Copier'}
        </button>
      </div>
      <p className="break-all font-mono text-[11px] leading-relaxed text-gray-500">{url}</p>
    </div>
  )
}

export default function YoutubeExtraitPage() {
  const [url, setUrl] = useState('')
  const [startRaw, setStartRaw] = useState('')
  const [endRaw, setEndRaw] = useState('')

  const videoId = useMemo(() => youtubeVideoId(url), [url])
  const start = parseTimeToSeconds(startRaw)
  const end = parseTimeToSeconds(endRaw)
  const startError = startRaw.trim() !== '' && start === null
  const endError = endRaw.trim() !== '' && end === null
  const endBeforeStart = start !== null && end !== null && end <= start

  /** Un lien déjà horodaté pré-remplit les champs : on ne repart pas de zéro. */
  const reprendreTemps = () => {
    const t = youtubeTimes(url)
    if (t.start !== null) setStartRaw(formatSeconds(t.start))
    if (t.end !== null) setEndRaw(formatSeconds(t.end))
  }
  const dejaHorodate = useMemo(() => {
    const t = youtubeTimes(url)
    return t.start !== null || t.end !== null
  }, [url])

  const times = { start: startError ? null : start, end: endError || endBeforeStart ? null : end }
  const watchUrl = videoId ? buildYoutubeWatchUrl(videoId, times) : ''
  const embedUrl = videoId ? buildYoutubeEmbedUrl(videoId, times) : ''

  return (
    <div className="pb-16">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/tableau-de-bord" className="hover:text-indigo-600">Tableau de bord</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">Extrait YouTube</span>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">▶️ Extrait YouTube</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fabriquez un lien qui démarre à l’endroit voulu — et, dans un lecteur intégré,
          qui s’arrête où vous le décidez.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Lien de la vidéo
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {url.trim() !== '' && !videoId && (
              <p className="mt-1 text-[11px] text-red-600">
                Ce lien n’est pas reconnu comme une vidéo YouTube.
              </p>
            )}
            {videoId && dejaHorodate && (
              <button
                type="button"
                onClick={reprendreTemps}
                className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                ⏱ Reprendre l’horodatage déjà présent dans ce lien
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <TimeField
                label="Début" hint="3:43, 3mn43 ou 223"
                value={startRaw} onChange={setStartRaw} seconds={start} error={startError}
              />
              <TimeField
                label="Fin (facultatif)" hint="laisser vide = jusqu’au bout"
                value={endRaw} onChange={setEndRaw} seconds={end} error={endError}
              />
            </div>
            {endBeforeStart && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                La fin doit être après le début : elle est ignorée pour l’instant.
              </p>
            )}
            {(start !== null && !startError) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[-30, -10, -5, +5, +10, +30].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setStartRaw(formatSeconds(Math.max(0, start + delta)))}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    {delta > 0 ? `+${delta}s` : `${delta}s`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {videoId && (
            <div className="space-y-2">
              <CopyRow
                label="Lien YouTube"
                note="s’ouvre sur YouTube au bon endroit"
                url={watchUrl}
              />
              <CopyRow
                label="Lien lecteur intégré"
                note="respecte aussi la fin"
                url={embedUrl}
              />
              <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                <strong>À savoir :</strong> sur une page YouTube normale, seule l’heure de
                <em> départ</em> est respectée — YouTube ne sait pas y arrêter la lecture.
                L’heure de fin n’est tenue que dans un lecteur intégré, comme celui de Sol au piano :
                collez le lien YouTube dans les ressources d’un morceau et l’extrait s’y jouera
                exactement entre vos deux bornes.
              </p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
            {videoId ? (
              <iframe
                key={embedUrl}
                src={embedUrl}
                title="Aperçu de l’extrait"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                Collez un lien YouTube pour voir l’aperçu
              </div>
            )}
          </div>
          {videoId && (
            <p className="mt-2 text-center text-xs text-gray-400">
              L’aperçu se recale à chaque changement de bornes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
