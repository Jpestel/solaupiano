import sharp from 'sharp'
import { writeFileSync } from 'fs'

const W = 1080, H = 1350

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Pastilles de fonctionnalités (texte seul — pas d'emoji : non rendu par librsvg)
const features = [
  'Répétitions', 'Concerts', 'Répertoire',
  'Galerie photos', 'Setlists', 'Disponibilités',
  'Paroles & prompteur', 'Comptabilité', 'Accordeur',
]

// Disposition des pastilles sur 3 lignes centrées
const rows = [features.slice(0, 3), features.slice(3, 6), features.slice(6, 9)]
const pillH = 74, gapX = 22, gapY = 24
const charW = 17.5, basePad = 64
function pillW(label) { return basePad + label.length * charW }

let pills = ''
let y = 852
for (const row of rows) {
  const widths = row.map((l) => pillW(l))
  const total = widths.reduce((a, b) => a + b, 0) + gapX * (row.length - 1)
  let x = (W - total) / 2
  row.forEach((label, i) => {
    const w = widths[i]
    pills += `
      <g>
        <rect x="${x}" y="${y}" rx="37" ry="37" width="${w}" height="${pillH}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
        <text x="${x + w / 2}" y="${y + 48}" font-size="30" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">${esc(label)}</text>
      </g>`
    x += w + gapX
  })
  y += pillH + gapY
}

// Touches de piano décoratives en bas
let keys = ''
const nKeys = 14, kw = W / nKeys
for (let i = 0; i < nKeys; i++) {
  keys += `<rect x="${i * kw}" y="${H - 70}" width="${kw - 2}" height="70" fill="#ffffff" opacity="0.92"/>`
}
// touches noires
for (let i = 0; i < nKeys; i++) {
  if (i % 7 === 2 || i % 7 === 6) continue
  if (i === nKeys - 1) continue
  keys += `<rect x="${i * kw + kw * 0.62}" y="${H - 70}" width="${kw * 0.5}" height="44" fill="#1a1033"/>`
}

// Notes de musique décoratives (dessinées en vectoriel)
function note(cx, cy, s, op) {
  return `<g opacity="${op}" fill="#ffffff">
    <ellipse cx="${cx}" cy="${cy}" rx="${22 * s}" ry="${16 * s}" transform="rotate(-20 ${cx} ${cy})"/>
    <rect x="${cx + 18 * s}" y="${cy - 70 * s}" width="${6 * s}" height="${70 * s}"/>
    <path d="M ${cx + 18 * s} ${cy - 70 * s} q ${30 * s} ${6 * s} ${26 * s} ${34 * s} q ${-4 * s} ${-20 * s} ${-26 * s} ${-20 * s} z"/>
  </g>`
}
const notes = note(150, 250, 1.1, 0.13) + note(930, 220, 1.5, 0.12) + note(975, 560, 1.0, 0.10) + note(110, 600, 0.95, 0.10)

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f1d96"/>
      <stop offset="0.5" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.32" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="1" stop-color="#fb7185"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${notes}

  <!-- Logo : mini-clavier de piano -->
  <g>
    <rect x="${W / 2 - 56}" y="150" width="112" height="112" rx="28" fill="#ffffff"/>
    ${(() => {
      const lx = W / 2 - 40, ty = 178, kw = 16, kh = 56, n = 5
      let s = ''
      for (let i = 0; i < n; i++) s += `<rect x="${lx + i * kw}" y="${ty}" width="${kw - 1.5}" height="${kh}" rx="3" fill="#ede9fe" stroke="#4f46e5" stroke-width="1.5"/>`
      // touches noires
      for (const i of [0, 1, 3]) s += `<rect x="${lx + i * kw + kw * 0.62}" y="${ty}" width="${kw * 0.62}" height="${kh * 0.62}" rx="2" fill="#4f1d96"/>`
      return s
    })()}
  </g>
  <text x="${W / 2}" y="330" font-size="58" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" letter-spacing="1">Sol au piano</text>

  <!-- Accent bar -->
  <rect x="${W / 2 - 70}" y="362" width="140" height="6" rx="3" fill="url(#accent)"/>

  <!-- Titre principal -->
  <text x="${W / 2}" y="500" font-size="72" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Votre groupe de musique,</text>
  <text x="${W / 2}" y="588" font-size="72" font-weight="800" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" fill="url(#accent)">enfin bien organisé.</text>

  <!-- Sous-titre -->
  <text x="${W / 2}" y="690" font-size="36" fill="rgba(255,255,255,0.92)" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Répétitions, concerts, répertoire, photos…</text>
  <text x="${W / 2}" y="740" font-size="36" fill="rgba(255,255,255,0.92)" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">tout au même endroit, sur mobile et ordinateur.</text>

  <!-- Pastilles -->
  ${pills}

  <!-- CTA -->
  <g>
    <rect x="${W / 2 - 250}" y="1140" width="500" height="92" rx="46" fill="#ffffff"/>
    <text x="${W / 2}" y="1199" font-size="38" font-weight="800" fill="#4f46e5" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Inscription gratuite →</text>
  </g>
  <text x="${W / 2}" y="1285" font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" letter-spacing="1">solaupiano.fr</text>

  <!-- Clavier -->
  ${keys}
</svg>`

writeFileSync('/tmp/fb-post.svg', svg)
const out = '/Users/jeromepestel/Desktop/solaupiano-facebook.png'
await sharp(Buffer.from(svg)).png().toFile(out)
console.log('Image générée :', out)
