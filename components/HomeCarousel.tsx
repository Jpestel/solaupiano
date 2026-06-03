'use client'

import { useState, useEffect, useRef } from 'react'

/** Petit accord posé au-dessus d'un mot (mock). */
function ChordWord({ chord, children }: { chord?: string; children: React.ReactNode }) {
  return (
    <span className="inline-block align-bottom mr-1">
      <span className="block text-[10px] font-bold leading-none text-violet-600 h-3">{chord || ' '}</span>
      <span className="block">{children}</span>
    </span>
  )
}

interface Slide {
  key: string
  title: string
  subtitle: string
  dark?: boolean
  body: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    key: 'dashboard',
    title: 'Pilotez votre groupe',
    subtitle: 'Répétitions, concerts et présences en un coup d’œil.',
    body: (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { i: '🗓️', v: '4', l: 'Répétitions' },
            { i: '🎭', v: '2', l: 'Concerts' },
            { i: '🎼', v: '37', l: 'Morceaux' },
          ].map((k) => (
            <div key={k.l} className="rounded-lg border border-gray-200 bg-white p-2.5">
              <div className="flex items-center gap-1 text-gray-500 text-[10px]">{k.i} {k.l}</div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{k.v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center leading-none">
            <span className="text-[8px] uppercase">juin</span><span className="text-sm font-bold">14</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">Prochaine répétition</p>
            <p className="text-[11px] text-gray-500">20:00 · Studio Le Havre</p>
          </div>
          <span className="ml-auto text-[10px] font-medium text-green-600 bg-green-50 rounded-full px-2 py-0.5">5 présents</span>
        </div>
      </div>
    ),
  },
  {
    key: 'chords',
    title: 'Paroles & accords',
    subtitle: 'Posez les accords au-dessus des mots, chacun affiche ce qu’il veut.',
    body: (
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-2">Refrain</p>
        <div className="text-[15px] text-gray-800 leading-tight space-y-1.5">
          <p><ChordWord chord="Em">Tired</ChordWord><ChordWord>and</ChordWord><ChordWord chord="C">fro</ChordWord><ChordWord>zen,</ChordWord><ChordWord chord="G">I&apos;m</ChordWord><ChordWord>under</ChordWord><ChordWord chord="D">your</ChordWord><ChordWord>spell</ChordWord></p>
          <p><ChordWord chord="Em">I</ChordWord><ChordWord>thought</ChordWord><ChordWord chord="C">I</ChordWord><ChordWord>knew</ChordWord><ChordWord chord="G">you,</ChordWord><ChordWord>but</ChordWord><ChordWord chord="D">now</ChordWord><ChordWord>I know</ChordWord></p>
        </div>
        <div className="mt-3 inline-flex rounded-lg bg-gray-100 border border-gray-200 p-0.5 text-[10px] font-semibold">
          <span className="rounded-md px-2 py-1 text-gray-500">🎤 Paroles</span>
          <span className="rounded-md px-2 py-1 text-gray-500">🎸 Accords</span>
          <span className="rounded-md px-2 py-1 bg-white text-indigo-600 shadow-sm">🎼 Les deux</span>
        </div>
      </div>
    ),
  },
  {
    key: 'setlist',
    title: 'Setlists & concerts',
    subtitle: 'Composez vos programmes, la durée se calcule toute seule.',
    body: (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-900">🎶 Concert du 14 juin</p>
          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">42 min</span>
        </div>
        {[
          { n: 1, t: 'Intro instrumentale', d: '2:30' },
          { n: 2, t: 'Don\'t Chain My Heart', d: '4:10' },
          { n: 3, t: 'Killing Floor', d: '3:45' },
          { n: 4, t: 'Should I Stay', d: '3:20' },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">{s.n}</span>
            <span className="text-xs text-gray-800 flex-1 truncate">{s.t}</span>
            <span className="text-[11px] text-gray-400">{s.d}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'prompter',
    title: 'Prompteur automatique',
    subtitle: 'Les paroles défilent au tempo du morceau, sur scène.',
    dark: true,
    body: (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-gray-950">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 mb-2">📜 Prompteur · 108 BPM</span>
        <p className="text-violet-300 text-xs font-bold">Em&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C</p>
        <p className="text-white text-xl font-semibold leading-snug">I wake up beside you</p>
        <p className="text-white/40 text-base font-medium leading-snug mt-1">move across your killing floor</p>
        <div className="mt-4 flex items-center gap-2 text-white/70 text-[10px]">
          <span className="rounded bg-white/10 px-2 py-1">⏸ Pause</span>
          <span className="rounded bg-white/10 px-2 py-1">A−</span>
          <span className="rounded bg-white/10 px-2 py-1">A+</span>
        </div>
      </div>
    ),
  },
  {
    key: 'accounting',
    title: 'Comptabilité du groupe',
    subtitle: 'Partagez les frais, suivez qui a payé quoi.',
    body: (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          <span className="text-xs font-semibold text-amber-800">💶 Location studio — juin</span>
          <span className="text-xs font-bold text-amber-800">60,00 €</span>
        </div>
        {[
          { n: 'Lucas', s: 'payé', ok: true },
          { n: 'Marie', s: 'payé', ok: true },
          { n: 'Sofiane', s: 'à payer', ok: false },
          { n: 'Emma', s: 'à payer', ok: false },
        ].map((m) => (
          <div key={m.n} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">{m.n[0]}</span>
            <span className="text-xs text-gray-800 flex-1">{m.n}</span>
            <span className="text-[11px] text-gray-400">15,00 €</span>
            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${m.ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.ok ? '✓ réglé' : 'à payer'}</span>
          </div>
        ))}
      </div>
    ),
  },
]

export function HomeCarousel() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = SLIDES.length
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => setI((p) => (p + 1) % n), 4500)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [paused, n])

  const go = (idx: number) => setI((idx + n) % n)

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fenêtre navigateur */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
          <span className="ml-3 text-[11px] text-gray-400 font-mono">solaupiano.fr</span>
        </div>

        {/* Piste */}
        <div className="relative h-[300px] sm:h-[320px] overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${i * 100}%)` }}
          >
            {SLIDES.map((s) => (
              <div key={s.key} className={`w-full flex-shrink-0 h-full ${s.dark ? '' : 'bg-gray-50'}`}>
                {s.body}
              </div>
            ))}
          </div>

          {/* Flèches */}
          <button onClick={() => go(i - 1)} aria-label="Précédent"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:bg-white">
            ‹
          </button>
          <button onClick={() => go(i + 1)} aria-label="Suivant"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:bg-white">
            ›
          </button>
        </div>

        {/* Légende */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{SLIDES[i].title}</p>
            <p className="text-xs text-gray-500 truncate">{SLIDES[i].subtitle}</p>
          </div>
          {/* Pastilles */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {SLIDES.map((s, idx) => (
              <button key={s.key} onClick={() => go(idx)} aria-label={`Vue ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${idx === i ? 'w-5 bg-indigo-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
