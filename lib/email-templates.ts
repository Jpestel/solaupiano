/**
 * Définition de tous les templates email du site.
 * subject / intro / outro sont les parties personnalisables par l'admin.
 * Les données dynamiques (dates, listes, liens) restent gérées dans le code.
 */

export interface EmailTemplateVariable {
  key: string
  description: string
}

export interface EmailTemplateDef {
  key: string
  name: string
  description: string
  defaultSubject: string
  defaultIntro: string
  defaultOutro: string
  variables: EmailTemplateVariable[]
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    key: 'rehearsal_notification',
    name: 'Nouvelle répétition',
    description: 'Envoyé aux membres quand une répétition est planifiée par le chef.',
    defaultSubject: 'Nouvelle répétition — {{groupName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nUne nouvelle répétition a été planifiée pour votre groupe {{groupName}}.',
    defaultOutro: 'À bientôt en répétition !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'date', description: 'Date de la répétition' },
      { key: 'time', description: 'Heure de la répétition' },
      { key: 'location', description: 'Lieu de la répétition' },
    ],
  },
  {
    key: 'rehearsal_auto_reminder',
    name: 'Rappel automatique répétition',
    description: 'Rappel automatique envoyé 5 jours avant une répétition.',
    defaultSubject: 'Rappel — Répétition {{groupName}} dans 5 jours',
    defaultIntro: 'Bonjour {{memberName}},\n\nN\'oubliez pas votre prochaine répétition avec {{groupName}} qui approche !',
    defaultOutro: 'On compte sur vous !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'date', description: 'Date de la répétition' },
      { key: 'time', description: 'Heure de la répétition' },
      { key: 'location', description: 'Lieu de la répétition' },
    ],
  },
  {
    key: 'attendance_reminder',
    name: 'Rappel de présence',
    description: 'Envoyé manuellement par le chef pour demander les présences.',
    defaultSubject: 'Votre présence à la répétition du {{date}} — {{groupName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nPourriez-vous confirmer votre présence à la prochaine répétition de {{groupName}} ?',
    defaultOutro: 'Merci de répondre dès que possible.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'date', description: 'Date de la répétition' },
    ],
  },
  {
    key: 'group_welcome',
    name: 'Bienvenue dans le groupe',
    description: 'Envoyé à un nouveau membre qui rejoint un groupe.',
    defaultSubject: 'Bienvenue dans {{groupName}} !',
    defaultIntro: 'Bonjour {{memberName}},\n\nVous avez rejoint le groupe {{groupName}}. Bienvenue !',
    defaultOutro: 'Nous sommes ravis de vous avoir parmi nous.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
    ],
  },
  {
    key: 'member_removed',
    name: 'Membre retiré du groupe',
    description: 'Envoyé à un membre qui a été retiré d\'un groupe.',
    defaultSubject: 'Vous avez été retiré de {{groupName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nVous avez été retiré du groupe {{groupName}}.',
    defaultOutro: 'Si vous pensez qu\'il s\'agit d\'une erreur, contactez le chef de groupe.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
    ],
  },
  {
    key: 'invitation',
    name: 'Invitation à rejoindre',
    description: 'Envoyé quand un chef invite quelqu\'un à rejoindre son groupe.',
    defaultSubject: '{{fromName}} vous invite à rejoindre Sol au piano',
    defaultIntro: 'Vous avez été invité(e) par {{fromName}} à rejoindre la plateforme Sol au piano.',
    defaultOutro: 'Créez votre compte gratuitement et rejoignez le groupe.',
    variables: [
      { key: 'fromName', description: 'Nom de l\'invitant' },
    ],
  },
  {
    key: 'email_verification',
    name: 'Vérification email',
    description: 'Envoyé à l\'inscription pour vérifier l\'adresse email.',
    defaultSubject: 'Confirmez votre adresse email — Sol au piano',
    defaultIntro: 'Bonjour {{userName}},\n\nMerci de vous être inscrit sur Sol au piano. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email.',
    defaultOutro: 'Ce lien est valable 24 heures.',
    variables: [
      { key: 'userName', description: 'Prénom de l\'utilisateur' },
    ],
  },
  {
    key: 'password_reset',
    name: 'Réinitialisation mot de passe',
    description: 'Envoyé quand un utilisateur demande à réinitialiser son mot de passe.',
    defaultSubject: 'Réinitialisation de votre mot de passe — Sol au piano',
    defaultIntro: 'Bonjour {{userName}},\n\nVous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous.',
    defaultOutro: 'Ce lien est valable 1 heure. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.',
    variables: [
      { key: 'userName', description: 'Prénom de l\'utilisateur' },
    ],
  },
  {
    key: 'new_user_admin',
    name: 'Nouvel inscrit (admin)',
    description: 'Notification envoyée à l\'admin à chaque nouvelle inscription.',
    defaultSubject: 'Nouvel inscrit sur Sol au piano — {{userName}}',
    defaultIntro: 'Un nouvel utilisateur vient de s\'inscrire sur Sol au piano.',
    defaultOutro: '',
    variables: [
      { key: 'userName', description: 'Nom du nouvel inscrit' },
      { key: 'userEmail', description: 'Email du nouvel inscrit' },
    ],
  },
  {
    key: 'weekly_digest',
    name: 'Résumé hebdomadaire',
    description: 'Résumé envoyé chaque semaine aux membres actifs.',
    defaultSubject: 'Votre résumé Sol au piano — {{week}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nVoici un résumé de l\'activité de la semaine sur Sol au piano.',
    defaultOutro: 'Bonne semaine !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'week', description: 'Semaine concernée' },
    ],
  },
  {
    key: 'annonce_admin',
    name: 'Nouvelle annonce à valider (admin)',
    description: 'Notification envoyée à l\'admin quand un membre dépose une annonce.',
    defaultSubject: '🔔 Nouvelle annonce en attente — {{annonceTitle}}',
    defaultIntro: 'Une nouvelle annonce vient d\'être déposée et attend votre validation avant d\'être publiée.',
    defaultOutro: '',
    variables: [
      { key: 'annonceTitle', description: 'Titre de l\'annonce' },
      { key: 'category', description: 'Catégorie de l\'annonce' },
      { key: 'userName', description: 'Nom du déposant' },
      { key: 'userEmail', description: 'Email du déposant' },
    ],
  },
  {
    key: 'annonce_refused',
    name: 'Annonce retirée (membre)',
    description: 'Envoyé au membre quand son annonce est refusée ou retirée par l\'admin.',
    defaultSubject: 'Votre annonce "{{annonceTitle}}" a été retirée',
    defaultIntro: 'Bonjour {{memberName}},\n\nVotre annonce {{annonceTitle}} a été retirée de la publication par l\'administrateur.',
    defaultOutro: 'Vous pouvez modifier votre annonce et la soumettre à nouveau.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'annonceTitle', description: 'Titre de l\'annonce' },
      { key: 'adminComment', description: 'Commentaire de l\'admin (si renseigné)' },
    ],
  },
]

export function getTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find(t => t.key === key)
}

/** Substitue les variables {{key}} dans un texte */
export function substituteVars(text: string, vars: Record<string, string>): string {
  let result = text
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, v)
  }
  return result
}

/** Convertit du texte brut (sauts de ligne) en paragraphes HTML */
export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 14px; color: #374151; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
