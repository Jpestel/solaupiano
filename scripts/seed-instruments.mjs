// Ajoute une large liste d'instruments. Idempotent : skipDuplicates ignore
// ceux déjà présents (nom unique). Relançable sans risque.
//   node scripts/seed-instruments.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NAMES = [
  // ── Cordes pincées / grattées ──
  'Guitare classique',
  'Guitare folk',
  'Guitare 12 cordes',
  'Guitare manouche',
  'Guitare slide / Dobro',
  'Banjo',
  'Mandoline',
  'Ukulélé',
  'Luth',
  'Harpe',
  'Sitar',
  'Bouzouki',

  // ── Basses ──
  'Guitare basse',
  'Contrebasse',
  'Basse fretless',

  // ── Cordes frottées ──
  'Alto (cordes)',
  'Vielle à roue',

  // ── Claviers ──
  'Clavier (clavier maître)',
  'Clavier arrangeur',
  'Piano numérique',
  'Piano à queue',
  'Orgue Hammond',
  'Piano électrique (Rhodes)',
  'Clavecin',
  'Accordéon',
  'Mélodica',

  // ── Vents — bois ──
  'Flûte traversière',
  'Flûte à bec',
  'Flûte de pan',
  'Clarinette',
  'Hautbois',
  'Basson',
  'Saxophone soprano',
  'Harmonica',

  // ── Vents — cuivres ──
  'Trompette',
  'Trombone',
  "Cor d'harmonie",
  'Tuba',
  'Bugle',
  'Cornet à pistons',

  // ── Percussions ──
  'Cajón',
  'Djembé',
  'Congas',
  'Bongos',
  'Darbouka',
  'Tabla',
  'Timbales',
  'Xylophone',
  'Marimba',
  'Vibraphone',
  'Glockenspiel',
  'Tambourin',
  'Handpan',
  'Steel drum',
  'Cloches tubulaires',

  // ── Voix ──
  'Beatbox',

  // ── Électronique / MAO / DJ ──
  'DJ (platines)',
  'Platines vinyles',
  'Contrôleur DJ',
  'MAO (ordinateur)',
  'Boîte à rythmes',
  'Groovebox',
  'Sampleur',
  'Séquenceur',
  'Synthé modulaire',
  'Synthé analogique',
  'Pad MIDI / Launchpad',
  'Theremin',
  'Vocodeur',
  'Producteur (MAO)',

  // ── Traditionnels / divers ──
  'Cornemuse',
  'Didgeridoo',
  'Kalimba',
  'Ocarina',
]

const res = await prisma.instrument.createMany({
  data: NAMES.map((name) => ({ name })),
  skipDuplicates: true,
})

const total = await prisma.instrument.count()
console.log(`Ajoutés : ${res.count} (ignorés car déjà présents : ${NAMES.length - res.count}). Total en base : ${total}.`)

await prisma.$disconnect()
