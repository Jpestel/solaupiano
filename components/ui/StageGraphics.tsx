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
  // ── Membres : looks de personnages (silhouettes) ──
  // p1 : cheveux courts
  p1: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Calotte courte bien visible */}
        <path d="M9 9 A8 8 0 0 1 25 9 Q24 1 17 1 Q10 1 9 9 Z" fill="rgba(0,0,0,0.33)" />
      </svg>
    ),
  },
  // p2 : cheveux longs
  p2: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        {/* Mèches qui tombent sur les épaules, dessinées avant le corps */}
        <path d="M6 13 Q4 22 5 32 L8 32 Q7 22 9 14 Z" fill="rgba(0,0,0,0.30)" />
        <path d="M28 13 Q30 22 29 32 L26 32 Q27 22 25 14 Z" fill="rgba(0,0,0,0.30)" />
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Bandeau sur le haut + mèches latérales */}
        <path d="M9 9 A8 8 0 0 1 25 9 Q24 2 17 2 Q10 2 9 9 Z" fill="rgba(0,0,0,0.30)" />
        <path d="M9 9 Q8 14 9 16 Q10.5 15 12 15 Q10 12 9 9 Z" fill="rgba(0,0,0,0.28)" />
        <path d="M25 9 Q26 14 25 16 Q23.5 15 22 15 Q24 12 25 9 Z" fill="rgba(0,0,0,0.28)" />
      </svg>
    ),
  },
  // p3 : casquette
  p3: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="10" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Corps de la casquette */}
        <path d="M9 8 A8 8 0 0 1 25 8 Q25 2 17 2 Q9 2 9 8 Z" fill="rgba(0,0,0,0.38)" />
        {/* Visière qui dépasse à droite */}
        <path d="M24 8 L31 9.5 Q30 12 24 11 Z" fill="rgba(0,0,0,0.38)" />
      </svg>
    ),
  },
  // p4 : chapeau (borsalino)
  p4: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="11" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Bord du chapeau (large) */}
        <rect x="5" y="6" width="24" height="3" rx="1.5" fill="rgba(0,0,0,0.38)" />
        {/* Calotte du chapeau */}
        <path d="M10 6 Q10 0 17 0 Q24 0 24 6 Z" fill="rgba(0,0,0,0.38)" />
      </svg>
    ),
  },
  // p5 : chignon haut
  p5: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="10" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Cheveux tirés en arrière */}
        <path d="M9 9 A8 8 0 0 1 25 9 Q24 4 17 4 Q10 4 9 9 Z" fill="rgba(0,0,0,0.28)" />
        {/* Chignon proéminent */}
        <circle cx="17" cy="2" r="5" fill="rgba(0,0,0,0.36)" />
        <circle cx="17" cy="2" r="3" fill="rgba(0,0,0,0.18)" />
      </svg>
    ),
  },
  // p6 : cheveux bouclés / afro
  p6: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="11" r="7" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Masse bouclée autour de la tête */}
        <circle cx="8"  cy="8"  r="5.5" fill="rgba(0,0,0,0.30)" />
        <circle cx="17" cy="4"  r="6"   fill="rgba(0,0,0,0.30)" />
        <circle cx="26" cy="8"  r="5.5" fill="rgba(0,0,0,0.30)" />
        <circle cx="6"  cy="14" r="4.5" fill="rgba(0,0,0,0.26)" />
        <circle cx="28" cy="14" r="4.5" fill="rgba(0,0,0,0.26)" />
      </svg>
    ),
  },
  // p7 : barbe
  p7: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Cheveux courts */}
        <path d="M9 9 A8 8 0 0 1 25 9 Q24 1 17 1 Q10 1 9 9 Z" fill="rgba(0,0,0,0.33)" />
        {/* Barbe sur le bas du visage */}
        <path d="M10 13 Q10 19 17 19 Q24 19 24 13 Q22 16 17 16.5 Q12 16 10 13 Z" fill="rgba(0,0,0,0.35)" />
        {/* Moustache */}
        <path d="M13 12 Q15 13.5 17 13.5 Q19 13.5 21 12 Q19 14 17 14 Q15 14 13 12 Z" fill="rgba(0,0,0,0.30)" />
      </svg>
    ),
  },
  // p8 : lunettes
  p8: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="9" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Cheveux courts */}
        <path d="M9 9 A8 8 0 0 1 25 9 Q24 1 17 1 Q10 1 9 9 Z" fill="rgba(0,0,0,0.33)" />
        {/* Lunettes : deux cercles + pont */}
        <circle cx="13" cy="10" r="3.2" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.6" />
        <circle cx="21" cy="10" r="3.2" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.6" />
        <line x1="16.2" y1="10" x2="17.8" y2="10" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
        <line x1="9.8"  y1="9"  x2="8.5"  y2="8"  stroke="rgba(0,0,0,0.40)" strokeWidth="1.2" />
        <line x1="24.2" y1="9"  x2="25.5" y2="8"  stroke="rgba(0,0,0,0.40)" strokeWidth="1.2" />
      </svg>
    ),
  },
  // p9 : casque audio
  p9: {
    w: 34, h: 46,
    draw: (c) => (
      <svg viewBox="0 0 34 46" width="100%" height="100%">
        <path d="M6 45 V27 C6 19 11 16 17 16 C23 16 28 19 28 27 V45 Z" fill={c} stroke={WS} strokeWidth="1.8" />
        <circle cx="17" cy="10" r="8" fill={c} stroke={WS} strokeWidth="1.8" />
        {/* Arc du casque par-dessus la tête */}
        <path d="M8 10 A9 9 0 0 1 26 10" fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Coussinets gauche et droit */}
        <rect x="5"  y="8" width="5" height="7" rx="2.5" fill="rgba(0,0,0,0.38)" />
        <rect x="24" y="8" width="5" height="7" rx="2.5" fill="rgba(0,0,0,0.38)" />
      </svg>
    ),
  },
  // Rétro-compat
  person_man: {
    w: 34, h: 46,
    draw: (c) => SHAPES.p1.draw(c),
  },
  person_woman: {
    w: 34, h: 46,
    draw: (c) => SHAPES.p2.draw(c),
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

  // ── Lumières ──
  par: {
    w: 20, h: 26,
    draw: () => (
      <svg viewBox="0 0 20 26" width="100%" height="100%">
        <path d="M2 16 L18 16 L15 25 L5 25 Z" fill="#fde68a" opacity="0.55" />
        <rect x="4" y="2" width="12" height="14" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="10" cy="15" r="4" fill="#fde68a" />
      </svg>
    ),
  },
  spot: {
    w: 22, h: 24,
    draw: () => (
      <svg viewBox="0 0 22 24" width="100%" height="100%">
        <path d="M4 14 L18 14 L21 23 L1 23 Z" fill="#fde68a" opacity="0.5" />
        <circle cx="11" cy="9" r="7" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="11" cy="9" r="3" fill="#fde68a" />
      </svg>
    ),
  },
  moving_head: {
    w: 24, h: 30,
    draw: () => (
      <svg viewBox="0 0 24 30" width="100%" height="100%">
        <rect x="4" y="24" width="16" height="5" rx="1.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M6 24 V14 M18 24 V14" stroke="#94a3b8" strokeWidth="2.5" />
        <rect x="5" y="6" width="14" height="11" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="12" cy="6" r="3.5" fill="#a5f3fc" />
        <path d="M9 3 L12 0 L15 3 Z" fill="#a5f3fc" opacity="0.6" />
      </svg>
    ),
  },
  led_bar: {
    w: 74, h: 12,
    draw: () => (
      <svg viewBox="0 0 74 12" width="100%" height="100%">
        <rect x="1" y="1" width="72" height="10" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
        {[6, 14, 22, 30, 38, 46, 54, 62, 70].map((x, i) => <circle key={x} cx={x} cy="6" r="2.4" fill={['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][i % 5]} />)}
      </svg>
    ),
  },
  strobe: {
    w: 26, h: 18,
    draw: () => (
      <svg viewBox="0 0 26 18" width="100%" height="100%">
        <rect x="2" y="2" width="22" height="14" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="6" y="6" width="14" height="6" rx="1" fill="#f8fafc" />
      </svg>
    ),
  },
  blinder: {
    w: 30, h: 20,
    draw: () => (
      <svg viewBox="0 0 30 20" width="100%" height="100%">
        <rect x="2" y="2" width="26" height="16" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="9" cy="10" r="5" fill="#fde68a" />
        <circle cx="21" cy="10" r="5" fill="#fde68a" />
      </svg>
    ),
  },
  laser: {
    w: 20, h: 18,
    draw: () => (
      <svg viewBox="0 0 20 18" width="100%" height="100%">
        <rect x="2" y="2" width="16" height="10" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
        <path d="M10 12 L3 17 M10 12 L17 17 M10 12 L10 18" stroke="#4ade80" strokeWidth="1.2" />
      </svg>
    ),
  },
  follow_spot: {
    w: 26, h: 32,
    draw: () => (
      <svg viewBox="0 0 26 32" width="100%" height="100%">
        <path d="M6 18 L20 18 L25 31 L1 31 Z" fill="#fde68a" opacity="0.45" />
        <rect x="5" y="4" width="16" height="15" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="13" cy="18" r="4" fill="#fef9c3" />
      </svg>
    ),
  },

  // ── Structures & déco ──
  truss_h: {
    w: 120, h: 16,
    draw: () => (
      <svg viewBox="0 0 120 16" width="100%" height="100%">
        <line x1="2" y1="3" x2="118" y2="3" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="2" y1="13" x2="118" y2="13" stroke="#94a3b8" strokeWidth="2.5" />
        <path d="M4 13 L16 3 L28 13 L40 3 L52 13 L64 3 L76 13 L88 3 L100 13 L112 3" stroke="#64748b" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  truss_v: {
    w: 16, h: 116,
    draw: () => (
      <svg viewBox="0 0 16 116" width="100%" height="100%">
        <line x1="3" y1="2" x2="3" y2="114" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="13" y1="2" x2="13" y2="114" stroke="#94a3b8" strokeWidth="2.5" />
        <path d="M13 4 L3 16 L13 28 L3 40 L13 52 L3 64 L13 76 L3 88 L13 100 L3 112" stroke="#64748b" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  truss_corner: {
    w: 34, h: 34,
    draw: () => (
      <svg viewBox="0 0 34 34" width="100%" height="100%">
        <path d="M3 3 V31 H31" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
        <path d="M9 3 V25 H31 M3 9 H25 V31" stroke="#64748b" strokeWidth="1.2" fill="none" opacity="0.7" />
      </svg>
    ),
  },
  totem: {
    w: 22, h: 92,
    draw: () => (
      <svg viewBox="0 0 22 92" width="100%" height="100%">
        <rect x="3" y="2" width="16" height="88" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
        {[10, 22, 34, 46, 58, 70, 82].map((y, i) => <circle key={y} cx="11" cy={y} r="3" fill={['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][i % 5]} />)}
      </svg>
    ),
  },
  led_wall: {
    w: 92, h: 54,
    draw: () => (
      <svg viewBox="0 0 92 54" width="100%" height="100%">
        <rect x="1" y="1" width="90" height="52" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
        {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 10 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={5 + c * 8.4} y={5 + r * 7.6} width="6.5" height="5.8" rx="0.8" fill={['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'][(r + c) % 4]} opacity="0.6" />
        )))}
      </svg>
    ),
  },
  backdrop: {
    w: 132, h: 18,
    draw: () => (
      <svg viewBox="0 0 132 18" width="100%" height="100%">
        <path d="M2 4 Q9 14 16 4 Q23 14 30 4 Q37 14 44 4 Q51 14 58 4 Q65 14 72 4 Q79 14 86 4 Q93 14 100 4 Q107 14 114 4 Q121 14 128 4 L130 16 H2 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1.2" />
      </svg>
    ),
  },
  stairs: {
    w: 44, h: 40,
    draw: () => (
      <svg viewBox="0 0 44 40" width="100%" height="100%">
        <path d="M2 38 V30 H12 V22 H22 V14 H32 V6 H42 V38 Z" fill={EQ} stroke={EQS} strokeWidth="1.8" />
      </svg>
    ),
  },
  barrier: {
    w: 64, h: 14,
    draw: () => (
      <svg viewBox="0 0 64 14" width="100%" height="100%">
        <line x1="2" y1="4" x2="62" y2="4" stroke={EQS} strokeWidth="2.5" />
        {[6, 20, 34, 48, 62].map((x) => <line key={x} x1={x} y1="2" x2={x} y2="12" stroke={EQS} strokeWidth="2" />)}
      </svg>
    ),
  },
  drum_riser: {
    w: 84, h: 56,
    draw: () => (
      <svg viewBox="0 0 84 56" width="100%" height="100%">
        <rect x="2" y="2" width="80" height="52" rx="4" fill="#334155" opacity="0.5" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
      </svg>
    ),
  },
  smoke: {
    w: 32, h: 24,
    draw: () => (
      <svg viewBox="0 0 32 24" width="100%" height="100%">
        <rect x="2" y="10" width="20" height="12" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="25" cy="8" r="4" fill="#e2e8f0" opacity="0.7" />
        <circle cx="29" cy="13" r="3" fill="#e2e8f0" opacity="0.5" />
        <circle cx="24" cy="15" r="3" fill="#e2e8f0" opacity="0.5" />
      </svg>
    ),
  },
  fan: {
    w: 26, h: 26,
    draw: () => (
      <svg viewBox="0 0 26 26" width="100%" height="100%">
        <circle cx="13" cy="13" r="11" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <path d="M13 13 Q7 7 4 13 Q10 13 13 13 Z M13 13 Q19 7 22 13 Q16 13 13 13 Z M13 13 Q19 19 13 22 Q13 16 13 13 Z M13 13 Q7 19 13 22 Q13 16 13 13 Z" fill="#e2e8f0" opacity="0.8" />
        <circle cx="13" cy="13" r="2" fill="#94a3b8" />
      </svg>
    ),
  },

  // ── Lumières (suite) ──
  wash: {
    w: 24, h: 26,
    draw: () => (
      <svg viewBox="0 0 24 26" width="100%" height="100%">
        <path d="M2 14 L22 14 L24 25 L0 25 Z" fill="#fde68a" opacity="0.45" />
        <rect x="3" y="2" width="18" height="13" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        {[8, 12, 16].map((x) => <circle key={x} cx={x} cy="8.5" r="2.5" fill="#fef3c7" />)}
      </svg>
    ),
  },
  beam: {
    w: 18, h: 30,
    draw: () => (
      <svg viewBox="0 0 18 30" width="100%" height="100%">
        <path d="M7 12 L11 12 L13 29 L5 29 Z" fill="#a5f3fc" opacity="0.6" />
        <rect x="3" y="2" width="12" height="11" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="9" cy="12" r="3" fill="#a5f3fc" />
      </svg>
    ),
  },
  uv: {
    w: 20, h: 24,
    draw: () => (
      <svg viewBox="0 0 20 24" width="100%" height="100%">
        <path d="M2 14 L18 14 L20 23 L0 23 Z" fill="#a78bfa" opacity="0.45" />
        <rect x="3" y="2" width="14" height="13" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="6" y="6" width="8" height="6" rx="1" fill="#a78bfa" />
      </svg>
    ),
  },
  gobo: {
    w: 24, h: 24,
    draw: () => (
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <rect x="3" y="4" width="18" height="14" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="12" cy="11" r="5" fill="none" stroke="#fde68a" strokeWidth="1.5" />
        <path d="M12 6 V16 M7 11 H17" stroke="#fde68a" strokeWidth="1" />
      </svg>
    ),
  },

  // ── Sono & structures (suite) ──
  sub: {
    w: 46, h: 42,
    draw: () => (
      <svg viewBox="0 0 46 42" width="100%" height="100%">
        <rect x="2" y="2" width="42" height="38" rx="3" fill={EQ} stroke={EQS} strokeWidth="2" />
        <circle cx="23" cy="21" r="14" fill="none" stroke={EQS} strokeWidth="2.5" />
        <circle cx="23" cy="21" r="4" fill={EQS} opacity="0.6" />
      </svg>
    ),
  },
  pupitre: {
    w: 30, h: 34,
    draw: () => (
      <svg viewBox="0 0 30 34" width="100%" height="100%">
        <path d="M4 12 L26 12 L24 4 L6 4 Z" fill={EQ} stroke={EQS} strokeWidth="1.5" />
        <line x1="15" y1="12" x2="15" y2="28" stroke={EQS} strokeWidth="2" />
        <path d="M7 33 L15 28 L23 33" stroke={EQS} strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  chaise: {
    w: 24, h: 24,
    draw: () => (
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <rect x="5" y="8" width="14" height="13" rx="2" fill={EQ} stroke={EQS} strokeWidth="1.5" />
        <rect x="5" y="3" width="14" height="4" rx="1.5" fill={EQS} opacity="0.7" />
      </svg>
    ),
  },
  tapis: {
    w: 72, h: 46,
    draw: () => (
      <svg viewBox="0 0 72 46" width="100%" height="100%">
        <rect x="2" y="2" width="68" height="42" rx="5" fill="#7c3aed" opacity="0.35" stroke="#a78bfa" strokeWidth="2" />
        <rect x="8" y="8" width="56" height="30" rx="3" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
  },
  pyro: {
    w: 22, h: 32,
    draw: () => (
      <svg viewBox="0 0 22 32" width="100%" height="100%">
        <rect x="7" y="24" width="8" height="7" rx="1.5" fill={EQS} />
        <path d="M11 24 C5 16 14 12 9 4 C16 9 18 18 11 24 Z" fill="#fb923c" />
        <path d="M11 22 C8 17 13 14 10 9 C14 13 14 19 11 22 Z" fill="#fde68a" />
      </svg>
    ),
  },
  confetti: {
    w: 26, h: 30,
    draw: () => (
      <svg viewBox="0 0 26 30" width="100%" height="100%">
        <rect x="3" y="16" width="14" height="11" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" transform="rotate(-15 10 21)" />
        {[['#f87171', 18, 6], ['#fbbf24', 22, 11], ['#34d399', 16, 2], ['#60a5fa', 23, 4], ['#a78bfa', 20, 14]].map(([c, x, y], i) => <rect key={i} x={x as number} y={y as number} width="3" height="3" rx="0.5" fill={c as string} />)}
      </svg>
    ),
  },
  banner: {
    w: 24, h: 70,
    draw: () => (
      <svg viewBox="0 0 24 70" width="100%" height="100%">
        <rect x="2" y="2" width="20" height="3" rx="1.5" fill={EQS} />
        <path d="M4 5 H20 V62 L12 56 L4 62 Z" fill="#6366f1" opacity="0.7" stroke="#a5b4fc" strokeWidth="1" />
      </svg>
    ),
  },
  plante: {
    w: 26, h: 32,
    draw: () => (
      <svg viewBox="0 0 26 32" width="100%" height="100%">
        <path d="M8 20 L18 20 L16 31 L10 31 Z" fill="#a16207" stroke="#78350f" strokeWidth="1" />
        <path d="M13 20 C13 10 6 8 4 4 C12 6 13 12 13 20 Z" fill="#16a34a" />
        <path d="M13 20 C13 10 20 8 22 4 C14 6 13 12 13 20 Z" fill="#22c55e" />
        <path d="M13 20 C13 12 13 6 13 2 C16 8 15 14 13 20 Z" fill="#15803d" />
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

// Looks de personnage proposés dans le profil
export const LOOKS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']
export const DEFAULT_LOOK = 'p1'

// Palette de couleurs pour le personnage
export const STAGE_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9', '#3b82f6', '#64748b',
]
export const DEFAULT_STAGE_COLOR = '#6366f1'

// Normalise une valeur de look (rétro-compat MAN/WOMAN)
export function resolveLook(figure: string | undefined | null): string {
  if (!figure) return DEFAULT_LOOK
  if (figure === 'MAN') return 'p1'
  if (figure === 'WOMAN') return 'p2'
  return SHAPES[figure] ? figure : DEFAULT_LOOK
}
