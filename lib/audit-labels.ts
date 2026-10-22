/**
 * Libellés du journal d'activité, sans aucune dépendance serveur : lus à la fois
 * par le moteur (lib/audit.ts) et par la page « Historique » (composant client).
 */

export interface AuditEntity {
  /** Clé stockée dans GroupActivity.entityType */
  key: string
  /** Nom du modèle Prisma tracé */
  model: string
  /** Avec article, pour composer « a modifié la répétition… » */
  label: string
  /** Pluriel court, pour le filtre de la page */
  filter: string
}

export const AUDIT_ENTITIES: AuditEntity[] = [
  { key: 'rehearsal', model: 'Rehearsal', label: 'la répétition', filter: 'Répétitions' },
  { key: 'attendance', model: 'Attendance', label: 'la présence', filter: 'Présences' },
  { key: 'concert_attendance', model: 'ConcertAttendance', label: 'la présence au concert', filter: 'Présences aux concerts' },
  { key: 'rehearsal_song', model: 'RehearsalSong', label: 'le programme', filter: 'Programme des répétitions' },
  { key: 'concert', model: 'Concert', label: 'le concert', filter: 'Concerts' },
  { key: 'setlist', model: 'Setlist', label: 'la setlist', filter: 'Setlists' },
  { key: 'setlist_song', model: 'SetlistSong', label: 'le contenu de la setlist', filter: 'Contenu des setlists' },
  { key: 'song', model: 'Song', label: 'le morceau', filter: 'Morceaux' },
  { key: 'chord_chart', model: 'ChordChart', label: 'la grille', filter: "Grilles d'accords" },
  { key: 'resource', model: 'Resource', label: 'la ressource', filter: 'Ressources des morceaux' },
  { key: 'pending_resource', model: 'PendingResource', label: 'la ressource proposée', filter: 'Ressources proposées' },
  { key: 'square_score', model: 'SquareScore', label: 'la partition carrée', filter: 'Partitions carrées' },
  { key: 'task_list', model: 'TaskList', label: 'la liste de tâches', filter: 'Tâches' },
  { key: 'task', model: 'Task', label: 'la tâche', filter: 'Tâches (détail)' },
  { key: 'poll', model: 'Poll', label: 'le sondage', filter: 'Sondages' },
  { key: 'poll_vote', model: 'PollVote', label: 'le vote', filter: 'Votes aux sondages' },
  { key: 'expense', model: 'GroupExpense', label: 'la dépense', filter: 'Comptabilité' },
  { key: 'unavailability', model: 'Unavailability', label: "l'indisponibilité", filter: 'Disponibilités' },
  { key: 'gallery_photo', model: 'GalleryPhoto', label: 'la photo', filter: 'Galerie (photos)' },
  { key: 'gallery_category', model: 'GalleryCategory', label: "l'album", filter: 'Galerie (albums)' },
  { key: 'shared_resource', model: 'GroupSharedResource', label: 'la ressource partagée', filter: 'Ressources partagées' },
  { key: 'tech_rider', model: 'TechRider', label: 'la fiche technique', filter: 'Fiche technique' },
  { key: 'group_page', model: 'GroupPage', label: 'la page publique', filter: 'Page publique' },
  { key: 'social_post', model: 'SocialPost', label: 'la publication', filter: 'Réseaux sociaux' },
  { key: 'voice_recording', model: 'VoiceRecording', label: "l'enregistrement", filter: 'Enregistrements' },
  { key: 'assignment', model: 'Assignment', label: 'le devoir', filter: 'Devoirs' },
  { key: 'member', model: 'GroupMember', label: 'le membre', filter: 'Membres' },
  { key: 'join_request', model: 'JoinRequest', label: "la demande d'adhésion", filter: "Demandes d'adhésion" },
  { key: 'group', model: 'Group', label: 'le groupe', filter: 'Paramètres du groupe' },
]

export const ATTENDANCE_LABELS: Record<string, string> = {
  PRESENT: 'Présent(e)',
  ABSENT: 'Absent(e)',
  INCERTAIN: 'Peut-être',
  EN_ATTENTE: 'Pas encore répondu',
}

/** Champs modifiés, en français, pour « (date, lieu) ». Un champ inconnu n'est pas affiché. */
export const FIELD_LABELS: Record<string, string> = {
  date: 'date', location: 'lieu', startTime: 'début', endTime: 'fin', notes: 'notes',
  setlistId: 'setlist', title: 'titre', name: 'nom', artist: 'artiste', description: 'description',
  tempo: 'tempo', keySignature: 'tonalité', timeSignature: 'mesure', barsPerRow: 'mesures par ligne',
  totalBars: 'nombre de mesures', cells: 'contenu', sons: 'sons', songId: 'morceau lié',
  address: 'adresse', city: 'ville', postalCode: 'code postal', isPublic: 'visibilité', isHidden: 'visibilité',
  style: 'style', lookingFor: 'recherche', type: 'type', groupRole: 'rôle', status: 'statut',
  amount: 'montant', category: 'catégorie', lyrics: 'paroles', bpm: 'tempo',
}

/** Modifications sans intérêt pour un humain : jamais journalisées seules. */
export const IGNORED_KEYS = new Set([
  'updatedAt', 'storageUsedBytes', 'photoReminderSentAt', 'cardOrder', 'moduleOrder', 'lastSeenAt',
])
