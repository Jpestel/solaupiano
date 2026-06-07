import type { PlaceholderEntry } from './placeholders-registry'

// Placeholders dynamiques (issus de ternaires, fallbacks, listes…) rendus
// personnalisables manuellement. Édités à la main — pas régénérés par le script.
export const MANUAL_PLACEHOLDERS: PlaceholderEntry[] = [
  // Mon profil
  { key: 'profil_stagename', group: 'Mon profil', default: 'Ex : DJ Lulu' },

  // Mon profil · Matériel
  { key: 'gear_search_suffix', group: 'Mon profil · Matériel', default: ' — tapez ou choisissez…' },

  // Assistance
  { key: 'assistance_msg_bug', group: 'Assistance', default: 'Décrivez le problème : que faisiez-vous, ce qui s\'est passé, sur quel appareil / navigateur…' },
  { key: 'assistance_msg_feature', group: 'Assistance', default: 'Décrivez la fonctionnalité souhaitée et en quoi elle vous serait utile…' },
  { key: 'assistance_msg_other', group: 'Assistance', default: 'Décrivez votre demande en détail…' },

  // Outil · Frais kilométriques
  { key: 'km_montant_facture', group: 'Outil · Frais kilométriques', default: 'ex : 1000' },
  { key: 'km_montant_brut', group: 'Outil · Frais kilométriques', default: 'ex : 1200' },
  { key: 'km_montant_net', group: 'Outil · Frais kilométriques', default: 'ex : 936' },

  // Groupe · Paroles
  { key: 'paroles_editor', group: 'Groupe · Paroles', default: 'Saisissez les paroles ici...\n\nAstuce : cliquez sur les boutons ci-dessus pour insérer des marqueurs comme [Refrain], [Couplet 1]. Pour les accords, passez en mode 🎸 Accords.' },

  // Groupe · Ressources partagées
  { key: 'ressources_url_link', group: 'Groupe · Ressources partagées', default: 'https://… *' },
  { key: 'ressources_url_site', group: 'Groupe · Ressources partagées', default: 'Site web (optionnel)' },

  // Groupe · Grille d'accords
  { key: 'grille_symbol_left', group: 'Groupe · Grille d\'accords', default: 'Symbole de début (||:, Segno…)' },
  { key: 'grille_symbol_right', group: 'Groupe · Grille d\'accords', default: 'Symbole de fin (:||, Fine, Coda…)' },
  { key: 'grille_symbol_default', group: 'Groupe · Grille d\'accords', default: 'Accord ou symbole…' },

  // Groupe · Page publique (réseaux sociaux)
  { key: 'mapage_instagram', group: 'Groupe · Page publique', default: '@mongroupe' },
  { key: 'mapage_facebook', group: 'Groupe · Page publique', default: 'mongroupe ou URL complète' },
  { key: 'mapage_youtube', group: 'Groupe · Page publique', default: '@mongroupe ou URL' },
  { key: 'mapage_spotify', group: 'Groupe · Page publique', default: 'URL artiste Spotify' },
  { key: 'mapage_website', group: 'Groupe · Page publique', default: 'https://mongroupe.fr' },

  // Admin · Newsletter
  { key: 'newsletter_compose', group: 'Admin · Newsletter', default: 'Écrivez votre message…\n\nLes retours à la ligne sont conservés. Vous pouvez aussi coller du HTML.' },
]
