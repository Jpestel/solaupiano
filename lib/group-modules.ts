// Liste canonique des modules d'un groupe (pour la config « modules visibles
// par les élèves » côté école).
export interface GroupModuleDef { href: string; label: string }

export const GROUP_MODULES: GroupModuleDef[] = [
  { href: 'repetitions',          label: 'Cours / Répétitions' },
  { href: 'concerts',             label: 'Concerts' },
  { href: 'taches',               label: 'Tâches à préparer' },
  { href: 'morceaux',             label: 'Répertoire' },
  { href: 'setlists',             label: 'Setlists' },
  { href: 'grilles',              label: "Grilles d'accords" },
  { href: 'partitions-carrees',   label: 'Partitions carrées' },
  { href: 'fiche-technique',      label: 'Fiche technique' },
  { href: 'ma-page',              label: 'Ma page (web)' },
  { href: 'tchat',                label: 'Tchat' },
  { href: 'ressources-partagees', label: 'Ressources partagées' },
  { href: 'disponibilites',       label: 'Disponibilités' },
  { href: 'sondages',             label: 'Sondages' },
  { href: 'comptabilite',         label: 'Comptabilité' },
  { href: 'galerie',              label: 'Galerie' },
  { href: 'stockage',             label: 'Stockage (espace fichiers)' },
  // (« Réseaux » et « Statistiques » sont de toute façon réservés aux chefs/co-chefs.)
]

// Par défaut, un élève ne voit que les cours et les concerts.
export const DEFAULT_STUDENT_MODULES = ['repetitions', 'concerts']

export function parseStudentModules(raw: string | null | undefined): string[] {
  if (raw == null) return DEFAULT_STUDENT_MODULES
  try {
    const a = JSON.parse(raw)
    if (Array.isArray(a)) return a.filter((x) => typeof x === 'string')
  } catch {}
  return DEFAULT_STUDENT_MODULES
}
