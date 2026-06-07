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
    key: 'poll_created',
    name: 'Nouveau sondage',
    description: 'Envoyé aux membres quand le chef crée un sondage de dates.',
    defaultSubject: 'Nouveau sondage — {{groupName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nUn nouveau sondage « {{pollTitle}} » a été créé pour votre groupe {{groupName}}. Merci d\'indiquer vos disponibilités pour les dates proposées.',
    defaultOutro: 'Votre réponse aide le groupe à choisir la meilleure date !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'pollTitle', description: 'Titre du sondage' },
    ],
  },
  {
    key: 'evaluation_reminder',
    name: 'Rappel d\'auto-évaluation',
    description: 'Envoyé le lendemain d\'une répétition aux musiciens présents qui n\'ont pas encore laissé d\'évaluation.',
    defaultSubject: 'Votre avis sur la répétition de {{groupName}} ?',
    defaultIntro: 'Bonjour {{memberName}},\n\nVous étiez présent(e) à la répétition de {{groupName}} du {{date}}. Prenez un instant pour laisser votre auto-évaluation : votre ressenti, les morceaux travaillés et vos suggestions aident le groupe à progresser.',
    defaultOutro: 'Merci pour votre retour !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'date', description: 'Date de la répétition' },
    ],
  },
  {
    key: 'perf_alert',
    name: 'Alerte performance serveur',
    description: 'Envoyé à l\'admin quand un seuil critique du serveur est franchi (CPU, mémoire, disque).',
    defaultSubject: '⚠️ Alerte performance — {{metric}}',
    defaultIntro: 'Un seuil critique a été franchi sur le serveur Sol au piano.',
    defaultOutro: 'Consultez Admin → Performance pour le détail.',
    variables: [
      { key: 'metric', description: 'Indicateur concerné' },
      { key: 'detail', description: 'Détail des valeurs' },
    ],
  },
  {
    key: 'concert_evaluation_reminder',
    name: 'Rappel d\'évaluation de concert',
    description: 'Envoyé le lendemain d\'un concert aux musiciens présents qui n\'ont pas encore laissé d\'évaluation.',
    defaultSubject: 'Votre avis sur le concert {{concertName}} ?',
    defaultIntro: 'Bonjour {{memberName}},\n\nVous étiez présent(e) au concert « {{concertName}} » de {{groupName}} du {{date}}. Prenez un instant pour laisser votre évaluation : votre ressenti, les morceaux joués et vos suggestions aident le groupe à progresser.',
    defaultOutro: 'Merci pour votre retour !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'concertName', description: 'Nom du concert' },
      { key: 'date', description: 'Date du concert' },
    ],
  },
  {
    key: 'concert_notification',
    name: 'Nouveau concert (présence)',
    description: 'Envoyé aux membres quand un concert est créé, pour recueillir leur présence (présent / peut-être / absent).',
    defaultSubject: '🎭 Nouveau concert : {{concertName}} — {{groupName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\n{{groupName}} a programmé un concert. Merci d\'indiquer si vous serez présent(e).',
    defaultOutro: 'Votre réponse aide à organiser le concert. Merci !',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'concertName', description: 'Nom du concert' },
      { key: 'date', description: 'Date du concert' },
      { key: 'location', description: 'Lieu du concert' },
    ],
  },
  {
    key: 'concert_validation_reminder',
    name: 'Concert — rappel de confirmation (obligatoires)',
    description: "Envoyé aux musiciens devant obligatoirement être présents et qui n'ont pas encore confirmé, à l'approche de la date limite.",
    defaultSubject: '⏳ Confirmez votre présence — {{concertName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nVotre présence est indispensable pour que le concert « {{concertName}} » de {{groupName}} ({{date}}) puisse avoir lieu. Merci de confirmer avant le {{deadline}}.',
    defaultOutro: 'Sans confirmation de tous les musiciens requis avant cette date, le concert sera malheureusement annulé.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'concertName', description: 'Nom du concert' },
      { key: 'date', description: 'Date du concert' },
      { key: 'deadline', description: 'Date limite de confirmation' },
    ],
  },
  {
    key: 'concert_cancelled',
    name: 'Concert annulé (faute de confirmation)',
    description: "Envoyé à tous les membres conviés quand un concert est annulé car tous les musiciens requis n'ont pas confirmé à temps.",
    defaultSubject: '❌ Concert annulé — {{concertName}}',
    defaultIntro: 'Bonjour {{memberName}},\n\nLe concert « {{concertName}} » de {{groupName}} prévu le {{date}} est malheureusement annulé : tous les musiciens indispensables n\'ont pas confirmé leur présence dans les délais.',
    defaultOutro: 'Merci de votre compréhension. Le groupe pourra reprogrammer une date.',
    variables: [
      { key: 'memberName', description: 'Prénom du membre' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'concertName', description: 'Nom du concert' },
      { key: 'date', description: 'Date du concert' },
    ],
  },
  {
    key: 'resource_link_request',
    name: 'Demande de liens de ressources (admin)',
    description: 'Envoyé à l\'admin quand un groupe demande d\'activer ou désactiver des liens de ressources proposés à l\'ajout d\'un morceau.',
    defaultSubject: 'Demande de liens — {{groupName}}',
    defaultIntro: 'Bonjour,\n\nLe groupe « {{groupName}} » (via {{requesterName}}) souhaite modifier les liens de ressources proposés à l\'ajout d\'un morceau.',
    defaultOutro: 'Vous pouvez gérer ces liens depuis Admin → Liens de ressources.',
    variables: [
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'requesterName', description: 'Nom du demandeur' },
    ],
  },
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
  {
    key: 'resource_submission',
    name: 'Soumission de fichier (chef)',
    description: 'Envoyé aux chefs quand un membre propose un fichier pour un morceau.',
    defaultSubject: 'Nouvelle soumission pour « {{songTitle}} » — {{groupName}}',
    defaultIntro: '{{submitterName}} a soumis un fichier pour le morceau « {{songTitle}} » dans le groupe {{groupName}}.',
    defaultOutro: 'Acceptez ou refusez ce fichier depuis le répertoire du groupe. Les fichiers refusés sont supprimés automatiquement.',
    variables: [
      { key: 'submitterName', description: 'Nom du membre qui soumet' },
      { key: 'songTitle', description: 'Titre du morceau' },
      { key: 'groupName', description: 'Nom du groupe' },
      { key: 'fileName', description: 'Nom du fichier soumis' },
    ],
  },
  {
    key: 'tech_rider',
    name: 'Envoi de fiche technique',
    description: 'Envoyé par le chef à un organisateur pour transmettre la fiche technique du groupe.',
    defaultSubject: 'Fiche technique — {{groupName}}',
    defaultIntro: 'Bonjour,\n\nVeuillez trouver ci-dessous la fiche technique de {{groupName}}.',
    defaultOutro: 'N\'hésitez pas à nous contacter pour toute question concernant cette fiche.',
    variables: [
      { key: 'groupName', description: 'Nom du groupe' },
    ],
  },
  {
    key: 'group_page_contact',
    name: 'Message via page publique',
    description: 'Envoyé aux chefs quand un visiteur écrit via le formulaire de contact de la page publique.',
    defaultSubject: '💬 Nouveau message de {{senderName}} — {{groupName}}',
    defaultIntro: 'Vous avez reçu un nouveau message via la page publique du groupe {{groupName}}.',
    defaultOutro: 'Répondez directement à cet e-mail pour recontacter {{senderName}}.',
    variables: [
      { key: 'senderName', description: 'Nom de l\'expéditeur' },
      { key: 'senderEmail', description: 'Email de l\'expéditeur' },
      { key: 'groupName', description: 'Nom du groupe' },
    ],
  },
  {
    key: 'support_ticket_admin',
    name: 'Ticket support reçu (admin)',
    description: 'Notification envoyée à l\'admin à la réception d\'un nouveau ticket d\'assistance.',
    defaultSubject: '[Support #{{ticketId}}] {{ticketSubject}}',
    defaultIntro: 'Un nouveau ticket d\'assistance vient d\'être soumis.',
    defaultOutro: '',
    variables: [
      { key: 'ticketId', description: 'Numéro du ticket' },
      { key: 'ticketSubject', description: 'Sujet du ticket' },
      { key: 'category', description: 'Catégorie de la demande' },
      { key: 'userName', description: 'Nom du demandeur' },
      { key: 'userEmail', description: 'Email du demandeur' },
    ],
  },
  {
    key: 'support_confirmation',
    name: 'Confirmation de demande (membre)',
    description: 'Accusé de réception envoyé à l\'utilisateur après l\'envoi d\'une demande d\'assistance.',
    defaultSubject: 'Votre demande a bien été reçue — #{{ticketId}}',
    defaultIntro: 'Bonjour {{userName}},\n\nNous avons bien reçu votre message et reviendrons vers vous rapidement.',
    defaultOutro: 'Vous pouvez suivre l\'avancement de votre demande depuis la page Assistance.',
    variables: [
      { key: 'userName', description: 'Prénom du demandeur' },
      { key: 'ticketId', description: 'Numéro du ticket' },
      { key: 'ticketSubject', description: 'Sujet du ticket' },
    ],
  },
  {
    key: 'support_reply',
    name: 'Réponse à une demande (membre)',
    description: 'Envoyé à l\'utilisateur quand l\'admin répond à son ticket d\'assistance.',
    defaultSubject: 'Réponse à votre demande #{{ticketId}} — {{ticketSubject}}',
    defaultIntro: 'Bonjour {{userName}},\n\nL\'équipe Sol au piano a répondu à votre demande d\'assistance.',
    defaultOutro: 'Vous pouvez consulter votre demande et y répondre depuis la page Assistance.',
    variables: [
      { key: 'userName', description: 'Prénom du demandeur' },
      { key: 'ticketId', description: 'Numéro du ticket' },
      { key: 'ticketSubject', description: 'Sujet du ticket' },
      { key: 'adminReply', description: 'Réponse de l\'administrateur' },
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
