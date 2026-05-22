import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { BackToTop } from './BackToTop'

export default async function AidePage() {
  const session = await getServerSession(authOptions)

  const isLoggedIn = !!session
  // Visiteur non connecté : on lui montre tout (comme un chef) pour découvrir l'app
  const isCreateur = !isLoggedIn || session.user.userPlan === 'CREATEUR'
  const planLabel = !isLoggedIn ? 'Visiteur' : isCreateur ? "Chef d'orchestre" : 'Musicien'
  const planColor = !isLoggedIn
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : isCreateur
      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centre d&apos;aide</h1>
            <p className="text-gray-500 mt-1">Tout ce qu&apos;il faut savoir pour utiliser Sol au piano.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold flex-shrink-0 ${planColor}`}>
            {!isLoggedIn ? '👀' : isCreateur ? '🎼' : '🎵'} {planLabel}
          </span>
        </div>

        {/* CTA visiteur */}
        {!isLoggedIn && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-indigo-800">
              <span className="font-semibold">Sol au piano</span> est gratuit — rejoignez votre groupe et gérez vos répétitions en quelques clics.
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/connexion" className="text-xs font-medium text-indigo-600 hover:underline">Se connecter</Link>
              <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                Créer un compte →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-8">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation rapide</p>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '#profil', label: '👤 Mon profil' },
            { href: '#groupes', label: '👥 Mes groupes' },
            { href: '#repetitions', label: '🎵 Répétitions' },
            { href: '#concerts', label: '🎭 Concerts' },
            { href: '#repertoire', label: '🎼 Répertoire' },
            { href: '#setlists', label: '🎶 Setlists' },
            { href: '#grilles', label: '🎸 Grilles' },
            { href: '#plans', label: '📦 Plans' },
            { href: '#faq', label: '❓ FAQ' },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-10">

        {/* ─── PROFIL ─── */}
        <section id="profil">
          <SectionTitle icon="👤" title="Mon profil" color="blue" />
          <div className="space-y-4">
            <HelpCard title="Informations personnelles">
              <p>Depuis la page <strong>Mon profil</strong>, vous pouvez modifier :</p>
              <ul className="mt-2 space-y-1">
                <li><span className="font-medium">Nom complet</span> — visible par tous les membres de vos groupes</li>
                <li><span className="font-medium">Photo de profil</span> — apparaît dans la sidebar, les listes de membres et les répétitions (formats JPG, PNG, WebP, max 10 Mo)</li>
                <li><span className="font-medium">Instruments</span> — indiqués sur votre fiche membre dans chaque groupe</li>
                <li><span className="font-medium">Mot de passe</span> — changez-le à tout moment depuis votre profil</li>
              </ul>
            </HelpCard>

            <HelpCard title="Plan utilisateur">
              <p>Votre plan personnel détermine ce que vous pouvez faire sur la plateforme :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PlanBadgeCard
                  icon="🎵"
                  name="Musicien"
                  color="blue"
                  features={[
                    'Rejoindre des groupes existants',
                    'Participer aux répétitions',
                    'Consulter le répertoire',
                    'Voir et imprimer les setlists',
                    'Consulter les grilles d\'accords',
                  ]}
                  active={isLoggedIn && !isCreateur}
                />
                <PlanBadgeCard
                  icon="🎼"
                  name="Chef d'orchestre"
                  color="indigo"
                  features={[
                    'Tout ce que fait le Musicien',
                    'Créer et gérer des groupes',
                    'Inviter des membres',
                    'Planifier répétitions & concerts',
                    'Gérer le répertoire et les setlists',
                    'Créer et éditer les grilles d\'accords',
                  ]}
                  active={isLoggedIn && isCreateur}
                />
              </div>
            </HelpCard>
          </div>
        </section>

        {/* ─── GROUPES ─── */}
        <section id="groupes">
          <SectionTitle icon="👥" title="Mes groupes" color="indigo" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Créer un groupe" badge={{ label: "Chef d'orchestre", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Accédez à <strong>Mes groupes</strong> puis cliquez sur <strong>+ Créer un groupe</strong>.</Step>
                  <Step n={2}>Donnez un nom à votre groupe et choisissez sa visibilité :
                    <ul className="mt-1 ml-4 space-y-0.5">
                      <li><span className="font-semibold text-green-700">🌐 Public</span> — visible dans l&apos;annuaire, tout le monde peut faire une demande</li>
                      <li><span className="font-semibold text-gray-600">🔒 Privé</span> — accès uniquement par lien d&apos;invitation</li>
                      <li><span className="font-semibold text-purple-700">🙈 Masqué</span> — ni visible, ni rejoignable sans lien direct</li>
                    </ul>
                  </Step>
                  <Step n={3}>Vous devenez automatiquement <RolePill role="CHEF" /> de ce groupe.</Step>
                </ol>
                <Tip>Vous pouvez ajouter une <strong>photo de couverture</strong> en cliquant sur l&apos;icône du groupe depuis la page du groupe.</Tip>
                <Note>Le plan <strong>Gratuit</strong> permet de créer <strong>1 groupe</strong>. Les plans Pro et Premium (bientôt disponibles) permettent jusqu&apos;à 5 groupes.</Note>
              </HelpCard>
            )}

            <HelpCard title="Rejoindre un groupe public">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Depuis <strong>Mes groupes</strong>, faites défiler jusqu&apos;à la section <em>&quot;Groupes qui cherchent des musiciens&quot;</em>.</Step>
                <Step n={2}>Cliquez sur <strong>Rejoindre</strong> pour les groupes publics, ou <strong>Faire une demande</strong> pour les groupes privés.</Step>
                <Step n={3}>Pour les groupes privés, votre demande est envoyée au chef qui l&apos;accepte ou la refuse.</Step>
              </ol>
              <Tip>Les groupes qui cherchent activement des musiciens affichent les instruments recherchés (ex: 🎺 Trompette).</Tip>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Gérer les membres" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Depuis la fiche du groupe, section <strong>Membres</strong> :</p>
                <ul className="mt-2 space-y-1">
                  <li><span className="font-medium">Promouvoir un membre</span> en chef en cliquant sur son nom → modifier le rôle</li>
                  <li><span className="font-medium">Retirer un membre</span> du groupe</li>
                  <li><span className="font-medium">Inviter par lien</span> — générez un lien d&apos;invitation pour les groupes privés (bouton <em>Inviter</em>)</li>
                  <li><span className="font-medium">Demandes d&apos;adhésion</span> — apparaissent en haut de la fiche groupe, acceptez ou refusez</li>
                </ul>
                <Tip>Vous pouvez indiquer quels instruments votre groupe recherche depuis les <strong>Paramètres du groupe</strong> (icône ⚙️ dans l&apos;en-tête).</Tip>
              </HelpCard>
            )}

            <HelpCard title="Rôles dans un groupe">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <RolePill role="CHEF" />
                    <span className="text-xs text-gray-500">Chef d&apos;orchestre</span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-700">
                    <li>✓ Planifie les répétitions et concerts</li>
                    <li>✓ Gère le répertoire de morceaux</li>
                    <li>✓ Crée et édite les setlists et grilles</li>
                    <li>✓ Invite et gère les membres</li>
                    <li>✓ Accède aux paramètres du groupe</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <RolePill role="MEMBRE" />
                    <span className="text-xs text-gray-500">Membre</span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-700">
                    <li>✓ Consulte le planning des répétitions</li>
                    <li>✓ Déclare sa présence / absence</li>
                    <li>✓ Consulte le répertoire et les ressources</li>
                    <li>✓ Voit et imprime les setlists</li>
                    <li>✓ Consulte les grilles d&apos;accords</li>
                  </ul>
                </div>
              </div>
            </HelpCard>
          </div>
        </section>

        {/* ─── RÉPÉTITIONS ─── */}
        <section id="repetitions">
          <SectionTitle icon="🎵" title="Répétitions" color="blue" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Planifier une répétition" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Répétitions</strong> puis <strong>+ Nouvelle répétition</strong>.</Step>
                  <Step n={2}>Renseignez la date, le lieu, l&apos;heure de début et de fin (facultatif).</Step>
                  <Step n={3}>Sélectionnez quels membres inviter (tous par défaut) — les invités reçoivent une notification.</Step>
                  <Step n={4}>Ajoutez éventuellement des notes (consignes, thèmes à travailler…).</Step>
                </ol>
                <Tip>Depuis la fiche d&apos;une répétition, vous pouvez envoyer un <strong>rappel par e-mail</strong> aux membres en cliquant sur <em>Envoyer un rappel</em>.</Tip>
              </HelpCard>
            )}

            <HelpCard title="Déclarer sa présence">
              <p>Pour chaque répétition où vous êtes invité, vous pouvez indiquer votre statut :</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill status="PRESENT" />
                <StatusPill status="ABSENT" />
                <StatusPill status="INCERTAIN" />
              </div>
              <p className="mt-3 text-sm text-gray-600">Cliquez sur la répétition pour voir les détails et modifier votre réponse.</p>
              <Tip>Votre statut de présence est visible par le chef du groupe. Prévenez rapidement si vous ne pouvez pas venir !</Tip>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Morceaux à travailler" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Depuis la fiche d&apos;une répétition, vous pouvez associer des morceaux du répertoire à travailler lors de cette séance. Les membres voient quels morceaux sont prévus.</p>
              </HelpCard>
            )}
          </div>
        </section>

        {/* ─── CONCERTS ─── */}
        <section id="concerts">
          <SectionTitle icon="🎭" title="Concerts" color="purple" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Créer un concert" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Concerts</strong> puis <strong>+ Nouveau concert</strong>.</Step>
                  <Step n={2}>Renseignez le nom, la date, le lieu et les notes éventuelles.</Step>
                  <Step n={3}>Associez une <strong>setlist</strong> existante au concert (optionnel mais recommandé).</Step>
                </ol>
                <Tip>Une fois une setlist associée, un bouton <strong>Imprimer la setlist</strong> apparaît directement depuis la fiche concert.</Tip>
              </HelpCard>
            )}

            <HelpCard title="Voir les concerts à venir">
              <p>La page <strong>Concerts</strong> affiche tous les concerts à venir, triés par date. Si une setlist est associée, vous pouvez la consulter et l&apos;imprimer directement.</p>
              <Tip>Le tableau de bord affiche aussi le prochain concert de chacun de vos groupes, avec un accès rapide.</Tip>
            </HelpCard>
          </div>
        </section>

        {/* ─── RÉPERTOIRE ─── */}
        <section id="repertoire">
          <SectionTitle icon="🎼" title="Répertoire" color="indigo" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Ajouter un morceau" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Allez dans <strong>Répertoire</strong> puis cliquez sur <strong>+ Ajouter un morceau</strong>.</Step>
                  <Step n={2}>Renseignez le titre (obligatoire), l&apos;artiste/compositeur et des notes (tonalité, tempo…).</Step>
                  <Step n={3}>Ajoutez une <strong>durée</strong> au format <code className="bg-gray-100 rounded px-1 text-xs">MM:SS</code> (ex: <code className="bg-gray-100 rounded px-1 text-xs">3:45</code>) pour que la setlist puisse calculer sa durée totale.</Step>
                </ol>
              </HelpCard>
            )}

            <HelpCard title="Ressources d'un morceau" badge={isCreateur ? { label: "Chef pour l'upload", color: "indigo" } : undefined}>
              <p>Chaque morceau peut avoir des ressources associées :</p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: '📄', type: 'PDF', desc: 'Partitions, grilles' },
                  { icon: '🎵', type: 'Audio', desc: 'Enregistrements, backing tracks' },
                  { icon: '🖼️', type: 'Image', desc: 'Photos, captures' },
                  { icon: '🎸', type: 'Grille', desc: 'Accords, tablatures' },
                  { icon: '🔗', type: 'Lien', desc: 'YouTube, SoundCloud…' },
                  { icon: '📎', type: 'Autre', desc: 'Tout autre fichier' },
                ].map((r) => (
                  <div key={r.type} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-medium">{r.icon} {r.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                  </div>
                ))}
              </div>
              <Note>Le stockage est partagé entre tous les membres du groupe. La barre de stockage est visible sur la page d&apos;accueil du groupe.</Note>
            </HelpCard>

            <HelpCard title="Suivi de progression">
              <p>Chaque membre peut indiquer son niveau de maîtrise pour chaque morceau depuis la fiche de répétition :</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ProgressPill status="A_TRAVAILLER" />
                <ProgressPill status="EN_COURS" />
                <ProgressPill status="MAITRISE" />
              </div>
            </HelpCard>
          </div>
        </section>

        {/* ─── SETLISTS ─── */}
        <section id="setlists">
          <SectionTitle icon="🎶" title="Setlists" color="green" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Créer une setlist" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Allez dans <strong>Setlists</strong> puis cliquez sur <strong>+ Nouvelle setlist</strong>.</Step>
                  <Step n={2}>Donnez un nom à la setlist (ex: &quot;Set acoustique Fête de la Musique&quot;).</Step>
                  <Step n={3}>Cochez <strong>&quot;Calculer la durée totale&quot;</strong> si vous voulez que la setlist affiche la durée de chaque morceau et le total — les morceaux sans durée seront signalés en orange.</Step>
                </ol>
              </HelpCard>
            )}

            {isCreateur && (
              <HelpCard title="Composer et réorganiser" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Depuis la page de la setlist :</p>
                <ul className="mt-2 space-y-1">
                  <li>Cliquez sur les <strong>pastilles de morceaux</strong> en bas pour les ajouter</li>
                  <li><strong>Glissez-déposez</strong> les morceaux pour les réordonner (drag &amp; drop)</li>
                  <li>Cliquez sur <strong>✕</strong> pour retirer un morceau</li>
                  <li>Associez la setlist à un ou plusieurs <strong>concerts</strong> depuis la fiche concert</li>
                </ul>
                <Tip>Vous pouvez modifier le nom, la description et l&apos;option de durée à tout moment via le bouton <strong>Renommer</strong>.</Tip>
              </HelpCard>
            )}

            <HelpCard title="Imprimer une setlist">
              <p>Le bouton <strong>🖨️ Imprimer</strong> est accessible à tous les membres. Il ouvre une fenêtre d&apos;impression propre avec :</p>
              <ul className="mt-2 space-y-1">
                <li>Le nom du groupe et de la setlist</li>
                <li>Les concerts associés</li>
                <li>La liste numérotée des morceaux avec artistes</li>
                <li>Les durées individuelles et le total (si activé)</li>
              </ul>
              <Tip>Vous pouvez aussi imprimer directement depuis la page <strong>Concerts</strong> si une setlist y est associée.</Tip>
            </HelpCard>
          </div>
        </section>

        {/* ─── GRILLES D'ACCORDS ─── */}
        <section id="grilles">
          <SectionTitle icon="🎸" title="Grilles d'accords" color="orange" />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Créer une grille" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Grilles</strong> puis <strong>+ Nouvelle grille</strong>.</Step>
                  <Step n={2}>Renseignez le titre, le tempo, la tonalité (optionnels) et les paramètres de la grille :
                    <ul className="mt-1 ml-4 space-y-0.5">
                      <li><span className="font-medium">Mesure</span> — 4/4, 3/4, 6/8, 5/4…</li>
                      <li><span className="font-medium">Mesures par ligne</span> — 2, 3, 4 ou 6</li>
                      <li><span className="font-medium">Nombre de mesures</span> — de 8 à 80</li>
                    </ul>
                  </Step>
                  <Step n={3}>Optionnellement, liez la grille à un morceau de votre répertoire.</Step>
                  <Step n={4}>Cliquez sur <strong>Créer et éditer</strong> — vous êtes redirigé directement vers l&apos;éditeur.</Step>
                </ol>
              </HelpCard>
            )}

            <HelpCard title="Éditeur de grille" badge={isCreateur ? { label: "Chef pour l'édition", color: "indigo" } : undefined}>
              <p>La grille affiche chaque mesure divisée en <strong>zones de temps</strong> selon la signature rythmique :</p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { sig: '4/4', beats: '4 temps' }, { sig: '3/4', beats: '3 temps' },
                  { sig: '6/8', beats: '2 temps' }, { sig: '5/4', beats: '5 temps' },
                ].map((s) => (
                  <div key={s.sig} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-orange-700">{s.sig}</p>
                    <p className="text-xs text-gray-500">{s.beats}</p>
                  </div>
                ))}
              </div>
              {isCreateur ? (
                <>
                  <p>Cliquez sur une zone de temps pour l&apos;activer. Une <strong>palette</strong> apparaît en bas de l&apos;écran avec :</p>
                  <ul className="mt-2 space-y-1">
                    <li><span className="font-medium">Racines</span> — C, C#, Db, D, D#… toutes les notes</li>
                    <li><span className="font-medium">Qualités</span> — M, m, 7, M7, m7, dim, aug, sus2, sus4, 9…</li>
                    <li><span className="font-medium">Symboles</span> — répétitions (||:, :||), simile (%), coda, segno, D.C., Fine…</li>
                  </ul>
                  <Tip>
                    Utilisez <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Tab</kbd> pour passer au temps suivant,{' '}
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Maj+Tab</kbd> pour revenir en arrière,{' '}
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Échap</kbd> ou{' '}
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Entrée</kbd> pour fermer la palette.
                  </Tip>
                  <Note>La grille se sauvegarde <strong>automatiquement</strong> 800 ms après chaque modification. L&apos;indicateur &quot;✓ Sauvegardé&quot; confirme la mise à jour.</Note>
                </>
              ) : (
                <p className="mt-2 text-gray-600">En tant que membre, vous pouvez consulter toutes les grilles créées par le chef.</p>
              )}
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Symboles musicaux disponibles">
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { sym: '||:', desc: 'Début de répétition' },
                    { sym: ':||', desc: 'Fin de répétition' },
                    { sym: ':|:', desc: 'Double répétition' },
                    { sym: '%', desc: 'Simile (répéter la mesure)' },
                    { sym: '/', desc: 'Temps vide / silence' },
                    { sym: '-', desc: 'Tenir / prolonger' },
                    { sym: '𝄌', desc: 'Coda' },
                    { sym: '𝄋', desc: 'Segno' },
                    { sym: 'D.C.', desc: 'Da Capo (retour au début)' },
                    { sym: 'D.S.', desc: 'Dal Segno' },
                    { sym: 'Fine', desc: 'Fin' },
                    { sym: '⌢', desc: 'Fermate (point d\'orgue)' },
                  ].map((s) => (
                    <div key={s.sym} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <span className="text-base font-black text-indigo-700 w-8 text-center flex-shrink-0">{s.sym}</span>
                      <span className="text-xs text-gray-600">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </HelpCard>
            )}

            <HelpCard title="Section SONS & impression">
              <p>En bas de chaque grille, un champ <strong>SONS</strong> permet de noter les instruments, arrangements ou indications sonores liés au morceau.</p>
              <p className="mt-2">Le bouton <strong>🖨️ Imprimer</strong> génère une feuille propre reprenant le format standard :</p>
              <ul className="mt-1 space-y-1">
                <li>En-tête : <span className="font-medium">Tempo</span> (gauche) · <span className="font-medium">Titre + Tonalité</span> (centre) · <span className="font-medium">Mesure</span> (droite)</li>
                <li>Grille numérotée avec <strong>les zones de temps</strong> par mesure</li>
                <li>Pied de page : ligne <span className="font-medium">SONS</span></li>
              </ul>
              <Tip>La fenêtre d&apos;impression est optimisée pour A4 et fonctionne aussi depuis un mobile.</Tip>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Paramètres d'une grille" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Le bouton <strong>Paramètres</strong> permet de modifier à tout moment :</p>
                <ul className="mt-2 space-y-1">
                  <li>Le titre, tempo, tonalité</li>
                  <li>La signature rythmique — les zones de temps de chaque mesure sont automatiquement redimensionnées</li>
                  <li>Le nombre de mesures par ligne et le total</li>
                  <li>Le lien avec un morceau du répertoire</li>
                </ul>
                <Note>Si vous changez la signature rythmique, les accords déjà saisies sont conservés sur les premiers temps.</Note>
              </HelpCard>
            )}
          </div>
        </section>

        {/* ─── PLANS ─── */}
        <section id="plans">
          <SectionTitle icon="📦" title="Plans et stockage" color="purple" />
          <div className="space-y-4">

            <HelpCard title="Plans de groupe">
              <p>Chaque groupe dispose d&apos;un plan qui détermine son espace de stockage. Le stockage est <strong>partagé</strong> entre tous les membres pour les ressources (partitions, fichiers audio…).</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PlanDetailCard name="Gratuit" icon="🆓" storage="1 Go" price="Gratuit" groups="1 groupe" color="gray"
                  features={['Répétitions illimitées', 'Répertoire complet', 'Setlists & concerts', 'Suivi des présences', 'Grilles d\'accords']} />
                <PlanDetailCard name="Pro" icon="⭐" storage="5 Go" price="5,99 €/mois" groups="5 groupes" color="indigo"
                  features={['Tout du plan Gratuit', 'Support prioritaire', 'Bientôt disponible']} comingSoon />
                <PlanDetailCard name="Premium" icon="👑" storage="10 Go" price="9,90 €/mois" groups="5 groupes" color="purple"
                  features={['Tout du plan Pro', 'Statistiques avancées', 'Bientôt disponible']} comingSoon />
              </div>
            </HelpCard>

            <HelpCard title="Gérer le stockage">
              <p>La barre de stockage est visible sur la page principale de chaque groupe. Quelques conseils :</p>
              <ul className="mt-2 space-y-1">
                <li>Préférez les <strong>liens</strong> (YouTube, SoundCloud) aux fichiers audio pour économiser de l&apos;espace</li>
                <li>Compressez vos PDFs avant de les uploader</li>
                <li>Supprimez les ressources obsolètes depuis la fiche du morceau</li>
              </ul>
              <Note>Quand le quota dépasse 90 %, un avertissement apparaît sur la page du groupe.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq">
          <SectionTitle icon="❓" title="Questions fréquentes" color="gray" />
          <div className="space-y-3">
            <FaqItem question="Je ne vois pas de groupe dans l'annuaire, pourquoi ?">
              Seuls les groupes avec la visibilité <strong>Public</strong> apparaissent dans l&apos;annuaire. Les groupes Privés et Masqués ne sont accessibles que sur invitation directe.
            </FaqItem>
            <FaqItem question="Puis-je être dans plusieurs groupes à la fois ?">
              Oui, il n&apos;y a pas de limite au nombre de groupes que vous pouvez rejoindre en tant que membre.
            </FaqItem>
            {isCreateur && (
              <FaqItem question="Combien de groupes puis-je créer ?">
                Avec le plan <strong>Gratuit</strong>, vous pouvez créer <strong>1 groupe</strong>. Les plans Pro et Premium (bientôt disponibles) permettront d&apos;en créer jusqu&apos;à 5.
              </FaqItem>
            )}
            <FaqItem question="Comment changer un membre en chef d'orchestre ?">
              {isCreateur
                ? 'Depuis la page du groupe, section Membres, cliquez sur les … à côté du membre et sélectionnez "Promouvoir chef".'
                : 'Seul le chef du groupe peut modifier les rôles des membres.'}
            </FaqItem>
            <FaqItem question="Une grille d'accords peut-elle être liée à un morceau ?">
              Oui ! Lors de la création ou depuis les paramètres d&apos;une grille, vous pouvez l&apos;associer à un morceau de votre répertoire. Son titre apparaîtra sur la carte de la grille.
            </FaqItem>
            <FaqItem question="Mes ressources sont-elles visibles par tous les membres ?">
              Oui, toutes les ressources attachées à un morceau sont visibles par l&apos;ensemble des membres du groupe. Seul le chef peut en ajouter ou supprimer.
            </FaqItem>
            <FaqItem question="Comment quitter un groupe ?">
              Depuis la page du groupe, section Membres, cliquez sur votre nom puis <strong>Quitter le groupe</strong>. Attention, si vous êtes le seul chef, vous devrez d&apos;abord promouvoir un autre membre.
            </FaqItem>
            <FaqItem question="Les répétitions passées sont-elles conservées ?">
              Oui, toutes les répétitions passées restent accessibles. Seules les répétitions futures sont mises en avant sur le tableau de bord et la page du groupe.
            </FaqItem>
            <FaqItem question="J'ai oublié mon mot de passe, que faire ?">
              Sur la page de connexion, cliquez sur <strong>&quot;Mot de passe oublié&quot;</strong>. Un lien de réinitialisation vous sera envoyé par e-mail.
            </FaqItem>
          </div>
        </section>

        {/* Contact */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 text-center" id="contact">
          <p className="text-2xl mb-2">💬</p>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Vous ne trouvez pas votre réponse ?</h3>
          <p className="text-sm text-gray-600">
            Contactez-nous à{' '}
            <a href="mailto:contact@solaupiano.fr" className="text-indigo-600 hover:underline font-medium">
              contact@solaupiano.fr
            </a>
          </p>
        </div>

        {/* CTA visiteur en bas */}
        {!isLoggedIn && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-2xl mb-2">🚀</p>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Prêt à gérer vos répétitions ?</h3>
            <p className="text-sm text-gray-600 mb-4">Sol au piano est gratuit. Créez votre compte en quelques secondes.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/connexion" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                Se connecter
              </Link>
              <Link href="/inscription" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                Créer un compte gratuit →
              </Link>
            </div>
          </div>
        )}

      </div>

      <BackToTop />
    </div>
  )
}

/* ─── Small reusable components ─── */

function SectionTitle({ icon, title, color }: { icon: string; title: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    gray: 'border-gray-200 bg-gray-100 text-gray-700',
  }
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-4 ${colors[color] || colors.gray}`}>
      <span className="text-2xl">{icon}</span>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  )
}

function HelpCard({ title, children, badge }: {
  title: string
  children: React.ReactNode
  badge?: { label: string; color: string }
}) {
  const badgeColors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {badge && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${badgeColors[badge.color] || badgeColors.indigo}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600 space-y-2">{children}</div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <span>{children}</span>
    </li>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-800">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">💡</span>
      <span>{children}</span>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">⚠️</span>
      <span>{children}</span>
    </div>
  )
}

function RolePill({ role }: { role: 'CHEF' | 'MEMBRE' }) {
  return role === 'CHEF'
    ? <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Chef d&apos;orchestre</span>
    : <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Membre</span>
}

function StatusPill({ status }: { status: 'PRESENT' | 'ABSENT' | 'INCERTAIN' }) {
  const s = {
    PRESENT: { label: '✓ Présent', cls: 'bg-green-100 text-green-700 border-green-200' },
    ABSENT: { label: '✗ Absent', cls: 'bg-red-100 text-red-700 border-red-200' },
    INCERTAIN: { label: '? Incertain', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  }[status]
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function ProgressPill({ status }: { status: 'A_TRAVAILLER' | 'EN_COURS' | 'MAITRISE' }) {
  const s = {
    A_TRAVAILLER: { label: '🔴 À travailler', cls: 'bg-red-50 text-red-700 border-red-200' },
    EN_COURS: { label: '🟡 En cours', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    MAITRISE: { label: '🟢 Maîtrisé', cls: 'bg-green-50 text-green-700 border-green-200' },
  }[status]
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function PlanBadgeCard({ icon, name, color, features, active }: {
  icon: string; name: string; color: string; features: string[]; active: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-300 bg-blue-50',
    indigo: 'border-indigo-300 bg-indigo-50',
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${active ? colors[color] : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-sm font-bold ${active ? (color === 'indigo' ? 'text-indigo-700' : 'text-blue-700') : 'text-gray-600'}`}>{name}</span>
        {active && <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">Votre plan</span>}
      </div>
      <ul className="space-y-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlanDetailCard({ name, icon, storage, price, groups, color, features, comingSoon }: {
  name: string; icon: string; storage: string; price: string; groups: string
  color: string; features: string[]; comingSoon?: boolean
}) {
  const colors: Record<string, string> = { gray: 'border-gray-200', indigo: 'border-indigo-200', purple: 'border-purple-200' }
  const textColors: Record<string, string> = { gray: 'text-gray-700', indigo: 'text-indigo-700', purple: 'text-purple-700' }
  return (
    <div className={`rounded-xl border-2 ${colors[color]} bg-white p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-sm font-bold ${textColors[color]}`}>{name}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 mb-0.5">{storage}</p>
      <p className="text-xs text-gray-500 mb-1">{groups}</p>
      <p className={`text-xs font-semibold mb-3 ${comingSoon ? 'text-gray-400' : 'text-green-600'}`}>{price}</p>
      <ul className="space-y-1">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-1.5 text-xs ${comingSoon && f.includes('Bientôt') ? 'text-gray-400 italic' : 'text-gray-600'}`}>
            <span className={`mt-0.5 flex-shrink-0 ${comingSoon && f.includes('Bientôt') ? 'text-gray-300' : 'text-green-500'}`}>✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900 mb-1.5">Q : {question}</p>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  )
}
