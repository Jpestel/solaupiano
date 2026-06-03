'use client'

// Formes vectorielles pour le plan de scène, avec tailles relatives réalistes
// (largeur/hauteur en px de base ~ emprise au sol). Le membre ≈ 44px de référence.

import React from 'react'

export interface Shape {
  w: number
  h: number
  draw: (color: string) => React.ReactNode
}

const EQ = '#cbd5e1'      // remplissage équipement (slate-300)
const EQS = '#475569'     // contour équipement (slate-600)
const WS = '#ffffff'      // contour blanc instruments

export const SHAPES: Record<string, Shape> = {
  // ── Membres (silhouettes) ──
  person_man: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="2" />
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="2" />
      </svg>
    ),
  },
  person_woman: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="2" />
        <path d="M17 16 C23 16 26 20 26 24 L32 45 H2 L8 24 C8 20 11 16 17 16 Z" fill={c} stroke={WS} strokeWidth="2" />
      </svg>
    ),
  },

  // ── Instruments ──
  grand_piano: {
    w: 104, h: 86,
    draw: (c) => (
      <svg viewBox="0 0 104 86" width="100%" height="100%">
        <path d="M7 82 V28 C7 14 19 8 40 8 H74 C97 8 101 44 90 62 C82 78 56 84 34 84 H15 C10 84 7 84 7 82 Z" fill={c} stroke={WS} strokeWidth="2.5" />
        <rect x="9" y="68" width="52" height="14" rx="2" fill="#fff" opacity="0.92" />
        {[14, 22, 30, 38, 46, 54].map((x) => <rect key={x} x={x} y="68" width="3" height="8" fill="#1e293b" />)}
      </svg>
    ),
  },
  keyboard: {
    w: 78, h: 26,
    draw: (c) => (
      <svg viewBox="0 0 78 26" width="100%" height="100%">
        <rect x="2" y="2" width="74" height="22" rx="3" fill={c} stroke={WS} strokeWidth="2" />
        <rect x="6" y="11" width="66" height="10" rx="1" fill="#fff" opacity="0.92" />
        {[12, 20, 28, 36, 44, 52, 60].map((x) => <rect key={x} x={x} y="11" width="3" height="6" fill="#1e293b" />)}
      </svg>
    ),
  },
  guitar: {
    w: 30, h: 78,
    draw: (c) => (
      <svg viewBox="0 0 30 78" width="100%" height="100%">
        <rect x="12" y="4" width="6" height="46" rx="2" fill={c} stroke={WS} strokeWidth="1.5" />
        <rect x="10" y="0" width="10" height="8" rx="2" fill={c} stroke={WS} strokeWidth="1.5" />
        <ellipse cx="15" cy="58" rx="14" ry="18" fill={c} stroke={WS} strokeWidth="2" />
        <circle cx="15" cy="56" r="4" fill="#1e293b" opacity="0.5" />
      </svg>
    ),
  },
  bass: {
    w: 28, h: 92,
    draw: (c) => (
      <svg viewBox="0 0 28 92" width="100%" height="100%">
        <rect x="11" y="4" width="6" height="58" rx="2" fill={c} stroke={WS} strokeWidth="1.5" />
        <rect x="9" y="0" width="11" height="9" rx="2" fill={c} stroke={WS} strokeWidth="1.5" />
        <ellipse cx="14" cy="72" rx="13" ry="17" fill={c} stroke={WS} strokeWidth="2" />
      </svg>
    ),
  },
  drumkit: {
    w: 86, h: 76,
    draw: (c) => (
      <svg viewBox="0 0 86 76" width="100%" height="100%">
        <circle cx="43" cy="50" r="21" fill={c} stroke={WS} strokeWidth="2.5" />
        <circle cx="20" cy="38" r="10" fill={c} stroke={WS} strokeWidth="2" />
        <circle cx="66" cy="38" r="10" fill={c} stroke={WS} strokeWidth="2" />
        <circle cx="30" cy="60" r="9" fill="#fff" opacity="0.85" stroke={WS} strokeWidth="1.5" />
        <circle cx="12" cy="16" r="11" fill="none" stroke={WS} strokeWidth="2.5" opacity="0.8" />
        <circle cx="74" cy="16" r="11" fill="none" stroke={WS} strokeWidth="2.5" opacity="0.8" />
      </svg>
    ),
  },
  mic: {
    w: 18, h: 58,
    draw: (c) => (
      <svg viewBox="0 0 18 58" width="100%" height="100%">
        <ellipse cx="9" cy="53" rx="8" ry="3.5" fill={c} stroke={WS} strokeWidth="1.5" />
        <rect x="7.5" y="12" width="3" height="40" fill={c} stroke={WS} strokeWidth="0.8" />
        <rect x="3" y="2" width="12" height="16" rx="6" fill={c} stroke={WS} strokeWidth="1.5" />
      </svg>
    ),
  },
  sax: {
    w: 32, h: 56,
    draw: (c) => (
      <svg viewBox="0 0 32 56" width="100%" height="100%">
        <path d="M14 2 V30 C14 44 22 46 26 40" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
        <path d="M22 44 C30 46 32 38 28 34 L20 40 Z" fill={c} stroke={WS} strokeWidth="1.5" />
      </svg>
    ),
  },
  brass: {
    w: 48, h: 26,
    draw: (c) => (
      <svg viewBox="0 0 48 26" width="100%" height="100%">
        <rect x="4" y="10" width="30" height="6" rx="3" fill={c} stroke={WS} strokeWidth="1.2" />
        <path d="M32 6 L46 2 V24 L32 20 Z" fill={c} stroke={WS} strokeWidth="1.5" />
        {[12, 18, 24].map((x) => <rect key={x} x={x} y="5" width="3" height="6" rx="1" fill={c} stroke={WS} strokeWidth="0.8" />)}
      </svg>
    ),
  },
  strings: {
    w: 26, h: 64,
    draw: (c) => (
      <svg viewBox="0 0 26 64" width="100%" height="100%">
        <rect x="11" y="2" width="4" height="30" rx="1.5" fill={c} stroke={WS} strokeWidth="1" />
        <path d="M13 30 C2 32 2 46 8 52 C2 58 10 64 13 60 C16 64 24 58 18 52 C24 46 24 32 13 30 Z" fill={c} stroke={WS} strokeWidth="1.5" />
      </svg>
    ),
  },
  woodwind: {
    w: 52, h: 14,
    draw: (c) => (
      <svg viewBox="0 0 52 14" width="100%" height="100%">
        <rect x="2" y="4" width="48" height="6" rx="3" fill={c} stroke={WS} strokeWidth="1.5" />
        {[12, 20, 28, 36].map((x) => <circle key={x} cx={x} cy="7" r="1.6" fill="#1e293b" opacity="0.5" />)}
      </svg>
    ),
  },
  dj: {
    w: 62, h: 38,
    draw: (c) => (
      <svg viewBox="0 0 62 38" width="100%" height="100%">
        <rect x="2" y="2" width="58" height="34" rx="4" fill={c} stroke={WS} strokeWidth="2" />
        <circle cx="16" cy="19" r="10" fill="#fff" opacity="0.85" stroke={WS} strokeWidth="1.5" />
        <circle cx="46" cy="19" r="10" fill="#fff" opacity="0.85" stroke={WS} strokeWidth="1.5" />
        <rect x="29" y="10" width="4" height="18" rx="1" fill="#1e293b" opacity="0.4" />
      </svg>
    ),
  },
  generic: {
    w: 38, h: 38,
    draw: (c) => (
      <svg viewBox="0 0 38 38" width="100%" height="100%">
        <circle cx="19" cy="19" r="17" fill={c} stroke={WS} strokeWidth="2" />
        <text x="19" y="26" textAnchor="middle" fontSize="20" fill="#fff">♪</text>
      </svg>
    ),
  },

  // ── Équipement & sono ──
  monitor: {
    w: 50, h: 30,
    draw: () => (
      <svg viewBox="0 0 50 30" width="100%" height="100%">
        <path d="M3 28 L11 5 H39 L47 28 Z" fill={EQ} stroke={EQS} strokeWidth="2" />
        <circle cx="25" cy="19" r="6" fill="none" stroke={EQS} strokeWidth="2" />
      </svg>
    ),
  },
  foh: {
    w: 38, h: 72,
    draw: () => (
      <svg viewBox="0 0 38 72" width="100%" height="100%">
        <rect x="3" y="2" width="32" height="68" rx="3" fill={EQ} stroke={EQS} strokeWidth="2" />
        <circle cx="19" cy="46" r="11" fill="none" stroke={EQS} strokeWidth="2.5" />
        <circle cx="19" cy="18" r="6" fill="none" stroke={EQS} strokeWidth="2" />
      </svg>
    ),
  },
  mixer: {
    w: 62, h: 42,
    draw: () => (
      <svg viewBox="0 0 62 42" width="100%" height="100%">
        <rect x="2" y="2" width="58" height="38" rx="3" fill={EQ} stroke={EQS} strokeWidth="2" />
        {[10, 20, 30, 40, 50].map((x) => <rect key={x} x={x - 1.5} y="10" width="3" height="22" rx="1.5" fill={EQS} opacity="0.6" />)}
        {[10, 20, 30, 40, 50].map((x) => <circle key={`k${x}`} cx={x} cy="10" r="2.4" fill={EQS} />)}
      </svg>
    ),
  },
  amp: {
    w: 44, h: 38,
    draw: () => (
      <svg viewBox="0 0 44 38" width="100%" height="100%">
        <rect x="2" y="2" width="40" height="34" rx="3" fill={EQ} stroke={EQS} strokeWidth="2" />
        <circle cx="22" cy="22" r="9" fill="none" stroke={EQS} strokeWidth="2" />
        <rect x="8" y="6" width="28" height="3" rx="1.5" fill={EQS} opacity="0.5" />
      </svg>
    ),
  },
  micstand: {
    w: 18, h: 58,
    draw: () => (
      <svg viewBox="0 0 18 58" width="100%" height="100%">
        <ellipse cx="9" cy="54" rx="8" ry="3.5" fill={EQ} stroke={EQS} strokeWidth="1.5" />
        <rect x="7.5" y="12" width="3" height="42" fill={EQS} />
        <rect x="3" y="2" width="12" height="14" rx="6" fill={EQ} stroke={EQS} strokeWidth="1.5" />
      </svg>
    ),
  },
  di: {
    w: 18, h: 16,
    draw: () => (
      <svg viewBox="0 0 18 16" width="100%" height="100%">
        <rect x="2" y="2" width="14" height="12" rx="2" fill={EQ} stroke={EQS} strokeWidth="1.5" />
      </svg>
    ),
  },
  laptop: {
    w: 36, h: 26,
    draw: () => (
      <svg viewBox="0 0 36 26" width="100%" height="100%">
        <rect x="6" y="2" width="24" height="16" rx="2" fill={EQ} stroke={EQS} strokeWidth="1.8" />
        <path d="M2 23 L8 18 H28 L34 23 Z" fill={EQ} stroke={EQS} strokeWidth="1.5" />
      </svg>
    ),
  },
  riser: {
    w: 118, h: 62,
    draw: () => (
      <svg viewBox="0 0 118 62" width="100%" height="100%">
        <rect x="3" y="3" width="112" height="56" rx="4" fill={EQ} opacity="0.45" stroke={EQS} strokeWidth="2" strokeDasharray="6 4" />
      </svg>
    ),
  },
  stool: {
    w: 26, h: 26,
    draw: () => (
      <svg viewBox="0 0 26 26" width="100%" height="100%">
        <circle cx="13" cy="13" r="10" fill={EQ} stroke={EQS} strokeWidth="2" />
        <circle cx="13" cy="13" r="3" fill={EQS} opacity="0.5" />
      </svg>
    ),
  },
  power: {
    w: 20, h: 16,
    draw: () => (
      <svg viewBox="0 0 20 16" width="100%" height="100%">
        <rect x="3" y="4" width="14" height="10" rx="2" fill={EQ} stroke={EQS} strokeWidth="1.5" />
        <rect x="7" y="0" width="2" height="5" fill={EQS} />
        <rect x="11" y="0" width="2" height="5" fill={EQS} />
      </svg>
    ),
  },
  inear: {
    w: 26, h: 22,
    draw: () => (
      <svg viewBox="0 0 26 22" width="100%" height="100%">
        <rect x="5" y="2" width="16" height="18" rx="2" fill={EQ} stroke={EQS} strokeWidth="1.8" />
        <circle cx="13" cy="8" r="2" fill={EQS} />
        <rect x="10" y="13" width="6" height="4" rx="1" fill={EQS} opacity="0.6" />
      </svg>
    ),
  },
}

// Nom d'instrument (profil) → clé de forme
export function shapeForInstrument(name: string): string {
  const l = name.toLowerCase()
  if (l.includes('queue') || l.includes('grand piano')) return 'grand_piano'
  if (l.includes('piano') || l.includes('clavier') || l.includes('synth') || l.includes('orgue') || l.includes('rhodes') || l.includes('clavecin') || l.includes('accordéon') || l.includes('mélodica')) return 'keyboard'
  if (l.includes('basse') || l.includes('contrebasse')) return 'bass'
  if (l.includes('guitare') || l.includes('banjo') || l.includes('mandoline') || l.includes('ukulélé') || l.includes('luth') || l.includes('sitar') || l.includes('bouzouki')) return 'guitar'
  if (l.includes('batterie') || l.includes('drums') || l.includes('percus') || l.includes('cajón') || l.includes('congas') || l.includes('djembé') || l.includes('bongos') || l.includes('timbales') || l.includes('darbouka') || l.includes('handpan')) return 'drumkit'
  if (l.includes('chant') || l.includes('voix') || l.includes('choeur') || l.includes('vocal') || l.includes('beatbox')) return 'mic'
  if (l.includes('sax')) return 'sax'
  if (l.includes('trompette') || l.includes('trombone') || l.includes('tuba') || l.includes('bugle') || l.includes('cor') || l.includes('cornet')) return 'brass'
  if (l.includes('violon') || l.includes('alto') || l.includes('violoncelle') || l.includes('harpe') || l.includes('vielle')) return 'strings'
  if (l.includes('flûte') || l.includes('clarinette') || l.includes('hautbois') || l.includes('basson')) return 'woodwind'
  if (l.includes('dj') || l.includes('platine') || l.includes('mao') || l.includes('sampleur') || l.includes('groovebox') || l.includes('launchpad') || l.includes('contrôleur') || l.includes('boîte à rythmes') || l.includes('séquenceur')) return 'dj'
  return 'generic'
}

// Clé d'équipement → clé de forme (mappe les libellés non identiques)
export function shapeForEquip(key: string): string {
  if (key === 'mic') return 'micstand'
  return SHAPES[key] ? key : 'generic'
}

export function getShape(key: string | undefined): Shape {
  return (key && SHAPES[key]) || SHAPES.generic
}
