import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'

const ROOT = process.cwd()

// Liste des fichiers contenant des placeholders
const files = execSync(`grep -rln --include="*.tsx" "placeholder=" app components`, { cwd: ROOT })
  .toString().trim().split('\n').filter(Boolean).sort()

// --- Libellés de groupe lisibles ---
const GROUP_LABELS = {
  'app/(auth)/inscription/page.tsx': 'Inscription',
  'app/(auth)/connexion/page.tsx': 'Connexion',
  'app/(auth)/mot-de-passe-oublie/page.tsx': 'Mot de passe oublié',
  'app/(auth)/reinitialiser-mot-de-passe/page.tsx': 'Réinitialisation du mot de passe',
  'app/(app)/profil/page.tsx': 'Mon profil',
  'app/(app)/profil/GearManager.tsx': 'Mon profil · Matériel',
  'app/(app)/assistance/page.tsx': 'Assistance',
  'app/(app)/annonces/nouvelle/page.tsx': 'Annonces · Nouvelle annonce',
  'app/(app)/tableau-de-bord/InviteButton.tsx': 'Tableau de bord · Invitation',
  'app/(app)/groupes/CreateGroupButton.tsx': 'Création de groupe',
  'app/(app)/groupes/[id]/InvitePanel.tsx': 'Groupe · Inviter',
  'app/(app)/groupes/[id]/GroupSettingsButton.tsx': 'Groupe · Paramètres',
  'app/(app)/groupes/[id]/concerts/page.tsx': 'Groupe · Concerts',
  'app/(app)/groupes/[id]/morceaux/page.tsx': 'Groupe · Morceaux (répertoire)',
  'app/(app)/groupes/[id]/morceaux/[songId]/paroles/page.tsx': 'Groupe · Paroles',
  'app/(app)/groupes/[id]/morceaux/[songId]/sequences/page.tsx': 'Groupe · Séquences',
  'app/(app)/groupes/[id]/fiche-technique/page.tsx': 'Groupe · Fiche technique',
  'app/(app)/groupes/[id]/ma-page/page.tsx': 'Groupe · Page publique',
  'app/(app)/groupes/[id]/ressources-partagees/page.tsx': 'Groupe · Ressources partagées',
  'app/(app)/groupes/[id]/grilles/page.tsx': 'Groupe · Grilles d\'accords',
  'app/(app)/groupes/[id]/grilles/[grilleId]/page.tsx': 'Groupe · Grille d\'accords',
  'app/(app)/groupes/[id]/comptabilite/page.tsx': 'Groupe · Comptabilité',
  'app/(app)/groupes/[id]/sondages/page.tsx': 'Groupe · Sondages',
  'app/(app)/groupes/[id]/setlists/page.tsx': 'Groupe · Setlists',
  'app/(app)/groupes/[id]/repetitions/page.tsx': 'Groupe · Répétitions',
  'app/(app)/groupes/[id]/repetitions/[repId]/page.tsx': 'Groupe · Répétition (détail)',
  'app/(app)/groupes/[id]/disponibilites/page.tsx': 'Groupe · Disponibilités',
  'app/(app)/groupes/[id]/tchat/page.tsx': 'Groupe · Tchat',
  'app/(app)/outils/kilometrique/page.tsx': 'Outil · Frais kilométriques',
  'app/(app)/outils/cachet/page.tsx': 'Outil · Cachet',
  'app/[slug]/ContactForm.tsx': 'Page publique de groupe · Contact',
  'app/admin/plans/page.tsx': 'Admin · Plans',
  'app/admin/groupes/page.tsx': 'Admin · Groupes',
  'app/admin/instruments/page.tsx': 'Admin · Instruments',
  'app/admin/utilisateurs/page.tsx': 'Admin · Utilisateurs',
  'app/admin/newsletter/page.tsx': 'Admin · Newsletter',
  'app/admin/ressources-liens/page.tsx': 'Admin · Liens de ressources',
  'app/admin/flash-infos/page.tsx': 'Admin · Flash infos',
  'app/admin/carrousel/page.tsx': 'Admin · Carrousel',
  'app/admin/tutoriels/page.tsx': 'Admin · Tutoriels vidéo',
  'app/admin/rappels/page.tsx': 'Admin · Rappels',
  'app/admin/support/page.tsx': 'Admin · Support',
  'app/admin/emails/EmailsManager.tsx': 'Admin · Emails',
  'app/admin/annonces/CategoriesManager.tsx': 'Admin · Catégories d\'annonces',
  'app/admin/annonces/AdminAnnonceActions.tsx': 'Admin · Annonces',
  'components/ResourceUploader.tsx': 'Composant · Téléversement de ressources',
  'components/PendingResourceUploader.tsx': 'Composant · Téléversement (en attente)',
  'components/NewsletterSignup.tsx': 'Composant · Inscription newsletter',
  'components/YouTubeSuggestModal.tsx': 'Composant · Suggestions YouTube',
  'components/ui/RehearsalEvaluation.tsx': 'Composant · Évaluation de répétition',
  'components/ui/LookingForSelector.tsx': 'Composant · Recherche de musiciens',
  'components/admin/RepertoiresPanel.tsx': 'Admin · Répertoires',
}

function autoGroup(rel) {
  let p = rel.replace(/\.tsx$/, '')
  if (p.startsWith('components/')) return 'Composant · ' + humanize(p.split('/').pop())
  p = p.replace(/^app\//, '').replace(/\((app|auth|public)\)\//g, '')
  const admin = p.startsWith('admin/')
  p = p.replace(/\[[^\]]+\]\//g, '').replace(/\/page$/, '')
  const segs = p.split('/').filter(Boolean).map(humanize)
  return (admin ? 'Admin · ' : '') + segs.join(' · ')
}
function humanize(s) {
  if (!s) return ''
  return s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
function groupFor(rel) { return GROUP_LABELS[rel] || autoGroup(rel) }

// slug pour les clés
function slugFor(rel) {
  return rel.replace(/\.tsx$/, '')
    .replace(/^app\//, '').replace(/^components\//, 'cmp/')
    .replace(/\((app|auth|public)\)\//g, '')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\/page$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
}

const registry = []
let totalRewrites = 0

for (const rel of files) {
  const abs = `${ROOT}/${rel}`
  let src = readFileSync(abs, 'utf8')
  const slug = slugFor(rel)
  const group = groupFor(rel)
  let n = 0
  let changed = false

  // placeholder="..." (sans " interne, single-line)
  src = src.replace(/placeholder="([^"\n]*)"/g, (m, text) => {
    n++
    const key = `${slug}_${n}`
    registry.push({ key, group, default: text })
    changed = true
    totalRewrites++
    return `placeholder={ph('${key}')}`
  })

  if (changed) {
    // ajoute l'import si absent
    if (!/from '@\/lib\/placeholders'/.test(src)) {
      const lines = src.split('\n')
      let lastImport = -1
      for (let i = 0; i < Math.min(lines.length, 80); i++) {
        if (/^import /.test(lines[i])) lastImport = i
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, `import { ph } from '@/lib/placeholders'`)
        src = lines.join('\n')
      }
    }
    writeFileSync(abs, src)
  }
}

// Génère le registre
const header = `// ⚙️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Régénéré par scripts/rewrite-placeholders.mjs
// Registre de tous les placeholders personnalisables (textes d'exemple des formulaires).

export interface PlaceholderEntry {
  key: string
  group: string
  default: string
}

export const PLACEHOLDER_REGISTRY: PlaceholderEntry[] = `

writeFileSync(`${ROOT}/lib/placeholders-registry.ts`, header + JSON.stringify(registry, null, 2) + '\n')

console.log(`Réécrits : ${totalRewrites} placeholders dans ${files.length} fichiers.`)
console.log(`Registre : ${registry.length} entrées -> lib/placeholders-registry.ts`)
