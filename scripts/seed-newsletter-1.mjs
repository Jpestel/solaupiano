// Crée (ou met à jour) le brouillon "Newsletter 1 - Bienvenue sur Solaupiano !"
// Idempotent : repérage par sujet. Lancer : node scripts/seed-newsletter-1.mjs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const SITE = 'https://solaupiano.fr'
const SUBJECT = 'Newsletter 1 - Bienvenue sur Solaupiano !'

const link = (href, label) =>
  `<a href="${SITE}${href}" style="color:#4f46e5;text-decoration:none;font-weight:700;">${label}</a>`

const feat = (icon, href, name, desc) =>
  `<p style="margin:0 0 11px;font-size:15px;line-height:1.55;color:#374151;">${icon} ${link(href, name)} — ${desc}</p>`

const section = (title) =>
  `<h2 style="font-size:17px;color:#111827;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #eef2ff;">${title}</h2>`

const content = `
<p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#111827;">Bienvenue sur Sol au piano ! 🎹</p>

<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">
Merci de faire partie de l'aventure ! Sol au piano réunit tout ce dont un musicien et son groupe ont besoin
pour s'organiser, répéter et monter sur scène sereinement. Voici un tour d'horizon de tout ce que vous pouvez
déjà faire — il suffit de cliquer pour y accéder.
</p>

${section('🎵 Votre groupe & vos répétitions')}
${feat('👥', '/groupes', 'Mes groupes', 'créez ou rejoignez un groupe, gérez les membres, les rôles et les invitations')}
${feat('🥁', '/groupes', 'Répétitions', 'planifiez vos séances, indiquez votre présence et évaluez chaque répétition')}
${feat('🗓️', '/groupes', 'Disponibilités', 'partagez vos créneaux pour trouver la meilleure date en un clin d\'œil')}
${feat('🎤', '/groupes', 'Concerts', 'organisez vos dates : adresse, balances, horaires, validation des présences et logistique')}
${feat('📅', '/calendrier', 'Calendrier', 'toutes vos répétitions et concerts réunis au même endroit')}

${section('🎼 Travailler le répertoire')}
${feat('🎶', '/groupes', 'Répertoire', 'ajoutez vos morceaux (titre, durée, tempo, ressources) — durée trouvée automatiquement via YouTube')}
${feat('📝', '/groupes', 'Paroles & prompteur', 'saisissez les paroles avec accords colorés et faites défiler en mode prompteur sur scène')}
${feat('🎸', '/groupes', 'Grilles d\'accords', 'créez des grilles d\'accords claires pour vos morceaux')}
${feat('📋', '/groupes', 'Setlists', 'composez l\'ordre de passage de vos concerts')}
${feat('📂', '/groupes', 'Ressources partagées', 'partagez partitions, audios, vidéos et liens utiles avec le groupe')}

${section('🛠️ La boîte à outils du musicien')}
${feat('🎧', '/outils/accordeur', 'Accordeur', 'accordez votre instrument directement depuis le micro')}
${feat('⏱️', '/outils/metronome', 'Métronome', 'gardez le tempo, réglable à volonté')}
${feat('🎹', '/outils/accords', 'Accords', 'visualisez et explorez les accords')}
${feat('🎼', '/outils/portee', 'Portée', 'un outil de portée musicale pour noter vos idées')}
${feat('🧾', '/outils/cachet', 'Cachet GUSO', 'estimez et préparez vos cachets GUSO')}
${feat('🚗', '/outils/kilometrique', 'Frais & estimation de cachet', 'calculez vos frais kilométriques et estimez vos cachets')}

${section('💸 Gestion & communauté')}
${feat('📊', '/groupes', 'Comptabilité', 'suivez les dépenses et recettes de votre groupe')}
${feat('📄', '/groupes', 'Fiche technique', 'constituez la fiche technique de votre groupe et envoyez-la facilement')}
${feat('🌐', '/groupes', 'Page publique', 'donnez une vitrine en ligne à votre groupe')}
${feat('📣', '/annonces', 'Annonces', 'cherchez ou proposez du matériel, un musicien, un groupe…')}
${feat('🧑‍🎤', '/profil', 'Mon profil', 'renseignez vos instruments, votre matériel et votre personnage pour le plan de scène')}

${section('ℹ️ Un coup de pouce ?')}
${feat('❓', '/aide', 'Aide', 'retrouvez tous les guides d\'utilisation du site')}
${feat('💬', '/assistance', 'Assistance', 'une question, un souci ? Contactez-nous directement')}

<div style="text-align:center;margin:30px 0 8px;">
  <a href="${SITE}/tableau-de-bord" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700;">🚀 Accéder à mon espace</a>
</div>

<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">
À très vite sur Sol au piano, et bonnes répètes ! 🎶<br>
— L'équipe Sol au piano
</p>
`.trim()

const existing = await prisma.newsletter.findFirst({ where: { subject: SUBJECT } })
if (existing) {
  await prisma.newsletter.update({ where: { id: existing.id }, data: { content, status: 'DRAFT' } })
  console.log('Brouillon mis à jour (id=' + existing.id + ').')
} else {
  const nl = await prisma.newsletter.create({ data: { subject: SUBJECT, content, status: 'DRAFT' } })
  console.log('Brouillon créé (id=' + nl.id + ').')
}
await prisma.$disconnect()
