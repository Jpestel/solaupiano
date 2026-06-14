import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { BackToTop } from './BackToTop'
import { TutorialVideoSection } from './TutorialVideoSection'
import { SectionTutorials } from '@/components/ui/SectionTutorials'
import { prisma } from '@/lib/prisma'
import { generateFeatureList, planIcon, storageLabel, type DbPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export default async function AidePage() {
  const session = await getServerSession(authOptions)
  const [dbPlans, tutorials] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }) as Promise<DbPlan[]>,
    prisma.tutorial.findMany({ where: { published: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }], select: { id: true, title: true, description: true, moduleKey: true, videoPath: true } }),
  ])

  const isLoggedIn = !!session
  // Visiteur non connecté : on lui montre tout (comme un chef) pour découvrir l'app
  const isCreateur = !isLoggedIn || session.user.userPlan === 'CREATEUR'
  const planLabel = !isLoggedIn ? 'Visiteur' : isCreateur ? "Chef d'orchestre" : 'Musicien'
  // Helper : tutoriels filtrés par catégorie pour injection inline
  const tf = (key: string) => tutorials.filter(t => t.moduleKey === key)
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
            { href: '#disponibilites', label: '🗓 Disponibilités' },
            { href: '#sondages', label: '📊 Sondages' },
            { href: '#concerts', label: '🎭 Concerts' },
            { href: '#evaluation', label: '⭐ Auto-évaluation' },
            { href: '#plan-scene', label: '🗺️ Plan de scène' },
            { href: '#fiche-technique', label: '📋 Fiche technique' },
            { href: '#ma-page', label: '🌐 Page publique' },
            { href: '#tchat', label: '💬 Tchat' },
            { href: '#ressources', label: '📒 Ressources' },
            { href: '#comptabilite', label: '💶 Comptabilité' },
            { href: '#galerie', label: '📸 Galerie' },
            { href: '#social', label: '📣 Réseaux sociaux' },
            { href: '#repertoire', label: '🎼 Répertoire' },
            { href: '#setlists', label: '🎶 Setlists' },
            { href: '#grilles', label: '🎸 Grilles' },
            { href: '#paroles', label: '🎤 Paroles' },
            { href: '#tablatures', label: '🎸 Tablatures' },
            { href: '#sequences', label: '🎚 Séquences' },
            { href: '#lecteur-flottant', label: '🎧 Lecteur audio' },
            { href: '#annotation', label: '🔊 Partition annotée' },
            { href: '#accords', label: '🎹 Accords' },
            { href: '#accordeur', label: '🎙️ Accordeur' },
            { href: '#metronome', label: '🥁 Métronome' },
            { href: '#portee', label: '🎼 Portée' },
            { href: '#lecteur-partition', label: '🎼 Lecteur partition' },
            { href: '#video-audio', label: '🎬 Vidéo→MP3' },
            { href: '#images-pdf', label: '🖼️ Photos→PDF' },
            { href: '#cachet-guso', label: '💶 Cachet GUSO' },
            { href: '#stats', label: '📊 Statistiques' },
            { href: '#annonces', label: '📢 Annonces' },
            { href: '#blog', label: '📰 Blog' },
            { href: '#plans', label: '📦 Plans' },
            { href: '#assistance', label: '🆘 Assistance' },
            { href: '#faq', label: '❓ FAQ' },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* ─── TUTORIELS VIDÉO ─── */}
      {tutorials.length > 0 && (
        <TutorialVideoSection tutorials={tutorials} />
      )}

      <div className="space-y-10">

        {/* ─── PROFIL ─── */}
        <section id="profil">
          <SectionTitle icon="👤" title="Mon profil" color="blue" tutorials={tf('feature_profil')} />
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

            <HelpCard title="Mon matériel 🎛️">
              <p>Renseignez votre <strong>setup complet</strong> (instruments, claviers, amplis, micros, effets, câbles, accessoires…) une seule fois sur votre profil.</p>
              <Tip>Ce matériel est ensuite réutilisable, notamment pour <strong>pré-remplir la fiche technique</strong> de vos groupes.</Tip>
            </HelpCard>

            <HelpCard title="Mes rôles">
              <p>Votre profil récapitule votre <strong>rôle dans chacun de vos groupes</strong> : 👑 Chef d&apos;orchestre, ⭐ Co-chef ou 🎵 Membre.</p>
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
                    'Créer et éditer les tablatures',
                  ]}
                  active={isLoggedIn && isCreateur}
                />
              </div>
            </HelpCard>
          </div>
        </section>

        {/* ─── GROUPES ─── */}
        <section id="groupes">
          <SectionTitle icon="👥" title="Mes groupes" color="indigo" tutorials={tf('feature_groupes')} />
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
                <Note>
                  {(() => {
                    const freePlan = dbPlans.find(p => p.key === 'FREE') ?? dbPlans[0]
                    const paidPlans = dbPlans.filter(p => p.priceMonthly !== null)
                    if (!freePlan) return 'Consultez la page Tarifs pour découvrir les plans disponibles.'
                    return <>Le plan <strong>{freePlan.label}</strong> permet de créer <strong>{freePlan.maxGroups} groupe</strong>
                      {freePlan.maxMembersPerGroup ? ` (${freePlan.maxMembersPerGroup} membres max)` : ''}
                      {freePlan.maxSongsPerGroup ? ` (${freePlan.maxSongsPerGroup} morceaux max)` : ''}.
                      {paidPlans.length > 0 && <> Les plans payants permettent plus de groupes, de membres et de fonctionnalités.</>}
                    </>
                  })()}
                </Note>
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
                    <li>✓ Consulte les statistiques du groupe</li>
                    <li>✓ Crée des estimations de cachet pour les concerts</li>
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
                    <li>✓ Consulte les tablatures</li>
                  </ul>
                </div>
              </div>
              <Note>Un groupe peut avoir <strong>plusieurs chefs</strong>. Le fondateur du groupe peut nommer des co-chefs depuis le panneau membres, et configurer finement leurs permissions depuis la section <em>Permissions des co-chefs</em> en bas de la page du groupe. Les modules contrôlables sont : Répétitions, Répertoire, Ressources, Setlists, Concerts, Grilles d&apos;accords, Membres, Statistiques et <strong>Estimation de cachet</strong>.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── RÉPÉTITIONS ─── */}
        <section id="repetitions">
          <SectionTitle icon="🎵" title="Répétitions" color="blue" tutorials={tf('feature_repetitions')} />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Planifier une répétition" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Répétitions</strong> puis <strong>+ Nouvelle répétition</strong>.</Step>
                  <Step n={2}>Renseignez la date, le lieu, l&apos;heure de début et de fin (facultatif).</Step>
                  <Step n={3}>Sélectionnez quels membres inviter (tous par défaut) — les invités reçoivent une notification.</Step>
                  <Step n={4}>Ajoutez éventuellement des notes (consignes, thèmes à travailler…).</Step>
                </ol>
                <Tip>Depuis la fiche d&apos;une répétition, vous pouvez envoyer un <strong>rappel manuel par e-mail</strong> aux membres en cliquant sur <em>Envoyer un rappel</em>.</Tip>
                <Note>Un <strong>rappel automatique</strong> est envoyé par email à tous les membres <strong>5 jours avant</strong> chaque répétition. Chaque membre peut désactiver ces rappels depuis son profil (section Notifications).</Note>
              </HelpCard>
            )}

            <HelpCard title="Déclarer sa présence">
              <p>Pour chaque répétition où vous êtes invité, vous pouvez indiquer votre statut :</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill status="PRESENT" />
                <StatusPill status="ABSENT" />
                <StatusPill status="INCERTAIN" />
              </div>
              <p className="mt-3 text-sm text-gray-600">Modifiez votre réponse directement dans la liste (boutons de présence) ou depuis la fiche de la répétition.</p>
              <Tip>Votre statut de présence est visible par le chef du groupe. Prévenez rapidement si vous ne pouvez pas venir !</Tip>
            </HelpCard>

            <HelpCard title="Évaluer la répétition">
              <p>Une fois la répétition terminée, si vous étiez <strong>présent</strong>, vous pouvez laisser une <strong>auto-évaluation</strong> (étoiles) — voir la section <a href="#evaluation" className="text-indigo-600 hover:underline">Auto-évaluation</a>.</p>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Morceaux à travailler" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Depuis la fiche d&apos;une répétition, vous pouvez associer des morceaux du répertoire à travailler lors de cette séance. Les membres voient quels morceaux sont prévus.</p>
              </HelpCard>
            )}
          </div>
        </section>

        {/* ─── DISPONIBILITÉS ─── */}
        <section id="disponibilites">
          <SectionTitle icon="🗓" title="Disponibilités" color="orange" tutorials={tf('feature_disponibilites')} />
          <div className="space-y-4">
            <HelpCard title="Indiquer ses indisponibilités">
              <p>Chaque membre (chef inclus) déclare ses dates d&apos;indisponibilité depuis la carte <strong>🗓 Disponibilités</strong> du groupe.</p>
              <ul className="mt-2 space-y-1">
                <li>Une <strong>date</strong> seule, ou une <strong>plage</strong> (« Du … Au … »)</li>
                <li>Un <strong>motif</strong> optionnel (vacances, travail, déplacement…)</li>
                <li>Chacun gère librement ses propres indisponibilités</li>
              </ul>
            </HelpCard>
            <HelpCard title="Savoir qui est disponible" badge={{ label: 'Pratique pour le chef', color: 'indigo' }}>
              <p>L&apos;outil <strong>🔎 Vérifier une date</strong> affiche, pour un jour donné, qui est <strong>disponible ✅</strong> et qui ne l&apos;est pas <strong>⛔</strong> (avec le motif).</p>
              <Tip>Au moment de <strong>créer une répétition ou un concert</strong>, un bandeau sous le champ Date signale automatiquement les membres indisponibles ce jour-là.</Tip>
            </HelpCard>
          </div>
        </section>

        {/* ─── SONDAGES ─── */}
        <section id="sondages">
          <SectionTitle icon="📊" title="Sondages (dates)" color="violet" tutorials={tf('feature_sondages')} />
          <div className="space-y-4">
            {isCreateur && (
              <HelpCard title="Créer un sondage" badge={{ label: 'Chef seulement', color: 'indigo' }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Ouvrez la carte <strong>📊 Sondages</strong> du groupe puis <strong>+ Nouveau sondage</strong>.</Step>
                  <Step n={2}>Donnez un titre (ex : « Date de la prochaine répétition »), puis ajoutez plusieurs <strong>dates proposées</strong> (avec une note optionnelle : heure, salle…).</Step>
                  <Step n={3}>Chaque membre répondra <strong>Présent / Absent / Incertain</strong> pour chaque date.</Step>
                </ol>
                <Tip>Vous pouvez <strong>clôturer</strong> un sondage (plus de votes) ou le supprimer à tout moment.</Tip>
              </HelpCard>
            )}
            <HelpCard title="Répondre et lire les résultats">
              <p>Dans la section <strong>Ma réponse</strong>, indiquez votre disponibilité pour chaque date (modifiable tant que le sondage est ouvert).</p>
              <p className="mt-2">Le tableau de <strong>résultats</strong> récapitule les réponses de tous les membres, avec les <strong>totaux par date</strong> (<span className="text-green-700">✅ présents</span> / <span className="text-amber-600">❓ incertains</span> / <span className="text-red-600">⛔ absents</span>) et une <strong>⭐ meilleure date</strong> (celle qui réunit le plus de présents).</p>
            </HelpCard>
          </div>
        </section>

        {/* ─── CONCERTS ─── */}
        <section id="concerts">
          <SectionTitle icon="🎭" title="Concerts" color="purple" tutorials={tf('feature_concerts')} />
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
              <p>La page <strong>Concerts</strong> affiche tous les concerts (le <strong>nom du groupe en concert</strong> y figure), triés par date. Si une setlist est associée, vous pouvez la consulter et l&apos;imprimer directement.</p>
              <Tip>Le tableau de bord affiche aussi le prochain concert de chacun de vos groupes, avec un accès rapide.</Tip>
            </HelpCard>

            <HelpCard title="Présence & auto-évaluation">
              <p>Comme pour les répétitions, chaque membre indique sa <strong>présence</strong> (✅ Présent / ❓ Incertain / ⛔ Absent) directement sur la carte du concert.</p>
              <p className="mt-2">Une fois le concert passé, les musiciens présents peuvent laisser une <strong>auto-évaluation</strong> (voir la section <a href="#evaluation" className="text-indigo-600 hover:underline">Auto-évaluation</a>).</p>
            </HelpCard>
          </div>
        </section>

        {/* ─── AUTO-ÉVALUATION ─── */}
        <section id="evaluation">
          <SectionTitle icon="⭐" title="Auto-évaluation (répétitions & concerts)" color="violet" tutorials={tf('feature_evaluation')} />
          <div className="space-y-4">
            <HelpCard title="Évaluer après coup">
              <p>Une fois une <strong>répétition</strong> ou un <strong>concert</strong> terminé, chaque <strong>musicien présent</strong> peut laisser une évaluation (étoiles ⭐ de 1 à 5) :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Ma performance</strong> — votre propre jeu</li>
                <li><strong>Les autres musiciens</strong> — un par un</li>
                <li><strong>Les morceaux travaillés / joués</strong> — un par un</li>
                <li><strong>La performance du groupe</strong></li>
                <li>+ une <strong>suggestion</strong> libre pour la prochaine fois (facultatif)</li>
              </ul>
              <Note>Réservé aux <strong>présents</strong>, et seulement une fois l&apos;événement <strong>terminé</strong>. Pendant une répétition en cours, un message indique « Évaluation disponible dès la fin ».</Note>
            </HelpCard>

            <HelpCard title="Résultats & note globale">
              <p>Dans la liste des répétitions / concerts passés, chaque ligne affiche la <strong>note globale ⭐</strong> (moyenne du groupe) et un bouton <strong>Détail</strong> qui montre les notes par morceau, la suggestion, etc.</p>
              <p className="mt-2">Vous voyez aussi votre <strong>moyenne reçue</strong> (👤) — anonyme.</p>
            </HelpCard>

            <HelpCard title="Confidentialité des notes entre musiciens">
              <p>Par défaut (mode <strong>prudent</strong>), les notes que les musiciens se donnent entre eux <strong>ne sont pas nominatives</strong> : chacun voit seulement sa propre moyenne reçue. Le chef peut changer ce réglage dans <strong>Paramètres du groupe</strong> (masquées / moyenne perçue / visibles).</p>
            </HelpCard>

            <HelpCard title="Rappels par e-mail">
              <p>Le lendemain d&apos;un événement non évalué, un e-mail invite les présents à laisser leur avis. S&apos;ils n&apos;étaient finalement pas là, un lien <strong>« Me marquer absent »</strong> met à jour leur présence en un clic (leur évaluation éventuelle est alors retirée).</p>
              <Tip>Vous pouvez désactiver ces rappels dans <strong>Mon profil</strong> → préférences e-mail.</Tip>
            </HelpCard>

            <Note>Module activable par l&apos;administrateur selon l&apos;offre du groupe. S&apos;il n&apos;est pas inclus, l&apos;évaluation n&apos;apparaît pas.</Note>
          </div>
        </section>

        {/* ─── PLAN DE SCÈNE ─── */}
        <section id="plan-scene">
          <SectionTitle icon="🗺️" title="Plan de scène" color="orange" tutorials={tf('feature_plan_scene')} />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Créer un plan de scène" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>Chaque concert dispose de son propre plan de scène. Pour y accéder :</p>
                <ol className="space-y-2 mt-2">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Concerts</strong>.</Step>
                  <Step n={2}>Sur la carte d&apos;un concert, cliquez sur le badge <strong>🗺️ Plan de scène →</strong>.</Step>
                  <Step n={3}>Les membres du groupe apparaissent dans le panneau de gauche. Faites-les glisser sur la scène.</Step>
                  <Step n={4}>Le plan est sauvegardé automatiquement à chaque modification.</Step>
                </ol>
              </HelpCard>
            )}

            <HelpCard title="Placer les musiciens sur scène">
              <p>Chaque musicien est représenté par un <strong>token coloré</strong> indiquant son nom et son instrument :</p>
              <ul className="mt-2 space-y-1">
                <li>Faites glisser un token depuis le panneau gauche pour le <strong>placer sur scène</strong></li>
                <li>Les tokens déjà sur scène sont <strong>repositionnables librement</strong> par drag &amp; drop</li>
                <li>Double-cliquez (ou cliquez sur ✕) sur un token pour le <strong>retirer</strong> de la scène</li>
                <li>La position est enregistrée en <strong>pourcentage</strong> — le plan s&apos;adapte à toutes les tailles d&apos;écran</li>
              </ul>
              <Tip>Chaque membre a une couleur distincte. L&apos;icône de son instrument principal s&apos;affiche sur le token pour repérer rapidement la disposition.</Tip>
            </HelpCard>

            <HelpCard title="Orientation et partage">
              <ul className="mt-1 space-y-1">
                <li>La scène est représentée avec une <strong>perspective de profondeur</strong> (avant-scène en bas, fond de scène en haut)</li>
                <li>Un effet <strong>spotlight</strong> visuel rappelle les conditions réelles</li>
                <li>Le plan est accessible à <strong>tous les membres</strong> du groupe en lecture — seul le chef peut le modifier</li>
              </ul>
            </HelpCard>

          </div>
        </section>

        {/* ─── FICHE TECHNIQUE ─── */}
        <section id="fiche-technique">
          <SectionTitle icon="📋" title="Fiche technique" color="rose" tutorials={tf('feature_fiche_technique')} />
          <div className="space-y-4">

            <HelpCard title="À quoi sert la fiche technique ?">
              <p>La fiche technique est le document indispensable pour les organisateurs de concerts. Elle regroupe toutes les informations techniques dont ils ont besoin : configuration scène, besoins son, lumières et loges.</p>
              <p className="mt-2">Elle est attachée au <strong>groupe</strong> — un seul document réutilisable pour tous vos concerts.</p>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Créer et éditer la fiche technique" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>Fiche tech.</strong> dans le menu de navigation.</Step>
                  <Step n={2}>La fiche est organisée en <strong>5 onglets</strong> :
                    <ul className="mt-1 ml-4 space-y-0.5">
                      <li><span className="font-medium">Général</span> — nom du groupe, contact technique, durée du set, besoins électriques</li>
                      <li><span className="font-medium">Scène</span> — dimensions requises, tableau des musiciens avec leurs instruments et besoins</li>
                      <li><span className="font-medium">Son</span> — tableau des canaux (instruments, type de micro/DI, monitoring)</li>
                      <li><span className="font-medium">Lumières</span> — notes d&apos;ambiance, effets souhaités, contre-indications</li>
                      <li><span className="font-medium">Loges</span> — nombre de personnes, repas, boissons, autres besoins</li>
                    </ul>
                  </Step>
                  <Step n={3}>Cliquez sur <strong>Pré-remplir depuis les membres</strong> pour importer automatiquement les noms et instruments des musiciens du groupe dans les tableaux Scène et Son.</Step>
                  <Step n={4}>La fiche est sauvegardée en cliquant sur <strong>Enregistrer</strong>.</Step>
                </ol>
                <Tip>Les tableaux Scène et Son sont dynamiques : cliquez sur <strong>+ Ligne</strong> pour ajouter des entrées et sur <strong>✕</strong> pour en supprimer.</Tip>
              </HelpCard>
            )}

            <HelpCard title="Partager la fiche technique">
              <p>Trois façons de transmettre la fiche à un organisateur :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-bold text-blue-700 mb-1">🔗 Lien public</p>
                  <p className="text-xs text-gray-600">Génère un lien unique et sécurisé, accessible sans connexion. Copiez-le et envoyez-le par e-mail ou messagerie.</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-sm font-bold text-indigo-700 mb-1">📧 Envoi e-mail</p>
                  <p className="text-xs text-gray-600">Envoyez la fiche directement par e-mail depuis l&apos;application — renseignez l&apos;adresse de l&apos;organisateur et le sujet.</p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <p className="text-sm font-bold text-rose-700 mb-1">🖨️ Impression PDF</p>
                  <p className="text-xs text-gray-600">Imprimez ou exportez en PDF via la fenêtre d&apos;impression du navigateur depuis le lien public.</p>
                </div>
              </div>
              <Note>Le lien public peut être <strong>révoqué</strong> à tout moment depuis la fiche — l&apos;ancien lien devient immédiatement inaccessible.</Note>
            </HelpCard>

          </div>
        </section>

        {/* ─── PAGE PUBLIQUE ─── */}
        <section id="ma-page">
          <SectionTitle icon="🌐" title="Page publique du groupe" color="teal" tutorials={tf('feature_ma_page')} />
          <div className="space-y-4">

            <HelpCard title="À quoi sert la page publique ?">
              <p>Chaque groupe peut avoir sa propre <strong>mini-page web</strong> accessible sans connexion, sous l&apos;adresse :</p>
              <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-sm text-indigo-700">
                https://solaupiano.fr/<span className="font-bold">nom-du-groupe</span>
              </div>
              <p className="mt-2 text-gray-600">Cette page sert de <strong>vitrine</strong> pour présenter le groupe au public, aux organisateurs et aux futurs membres.</p>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Créer et configurer la page" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans votre groupe, cliquez sur <strong>🌐 Ma page</strong> dans le menu de navigation.</Step>
                  <Step n={2}>Onglet <strong>Config</strong> — choisissez votre URL personnalisée (slug), publiez la page et personnalisez les 4 couleurs (primaire, accent, fond, texte). Un aperçu du dégradé de bannière s&apos;affiche en temps réel.</Step>
                  <Step n={3}>Onglet <strong>Contenu</strong> — rédigez la bannière (titre, sous-titre) et la biographie du groupe.</Step>
                  <Step n={4}>Onglet <strong>Membres</strong> — uploadez une photo pour chaque musicien, ajoutez un nom d&apos;affichage, un instrument et une courte bio. Réordonnez-les avec les flèches ↑↓ et masquez/affichez chacun individuellement.</Step>
                  <Step n={5}>Onglet <strong>Options</strong> — activez/désactivez la section concerts à venir, le formulaire de contact, et renseignez les liens réseaux sociaux.</Step>
                </ol>
                <Note>La page reste en <strong>mode brouillon</strong> tant que vous n&apos;avez pas activé le bouton <em>&quot;Publier la page&quot;</em>. Seul un chef peut la voir en mode brouillon.</Note>
              </HelpCard>
            )}

            <HelpCard title="Contenu de la page publique">
              <p>Une fois publiée, la page affiche :</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: '🎨', label: 'Bannière', desc: 'Dégradé personnalisé avec titre et sous-titre' },
                  { icon: '📖', label: 'Bio', desc: 'Histoire du groupe en texte libre' },
                  { icon: '👥', label: 'Membres', desc: 'Photos, instruments et présentations' },
                  { icon: '🎭', label: 'Concerts', desc: 'Prochaines dates à venir automatiques' },
                  { icon: '✉️', label: 'Contact', desc: 'Formulaire pour envoyer un message au chef' },
                  { icon: '📱', label: 'Réseaux', desc: 'Instagram, Facebook, YouTube, Spotify…' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-medium">{s.icon} {s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
              <Tip>Les prochains concerts sont alimentés <strong>automatiquement</strong> depuis les concerts de votre groupe — pas besoin de les saisir à nouveau.</Tip>
            </HelpCard>

            <HelpCard title="Formulaire de contact intégré">
              <p>Les visiteurs peuvent envoyer un message directement depuis la page sans avoir de compte Sol au piano :</p>
              <ul className="mt-2 space-y-1">
                <li>Le message est transmis par <strong>e-mail aux chefs du groupe</strong></li>
                <li>L&apos;adresse e-mail de l&apos;expéditeur est en <strong>répondre-à</strong> pour une réponse directe</li>
                <li>Un filtre anti-spam est intégré (honeypot)</li>
              </ul>
            </HelpCard>

            <HelpCard title="URL et gestion des doublons">
              <p>L&apos;URL est générée automatiquement depuis le nom du groupe (caractères spéciaux supprimés, espaces remplacés par des tirets). Si un slug est déjà pris, un suffixe est ajouté :</p>
              <div className="mt-2 font-mono text-xs space-y-1 text-gray-600">
                <div>solaupiano.fr/<span className="text-indigo-700">les-aigles</span></div>
                <div>solaupiano.fr/<span className="text-indigo-700">les-aigles-2</span></div>
                <div>solaupiano.fr/<span className="text-indigo-700">les-aigles-3</span></div>
              </div>
              <Tip>Vous pouvez personnaliser le slug dans l&apos;onglet Config — choisissez une URL mémorisable pour faciliter le partage.</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── TCHAT ─── */}
        <section id="tchat">
          <SectionTitle icon="💬" title="Messagerie du groupe (Tchat)" color="rose" tutorials={tf('feature_tchat')} />
          <div className="space-y-4">
            <HelpCard title="Discuter entre membres">
              <p>Le <strong>Tchat</strong> est un fil de discussion privé, réservé aux membres d&apos;un même groupe.</p>
              <ul className="mt-2 space-y-1">
                <li>Messages en quasi temps réel (rafraîchissement automatique)</li>
                <li><strong>Emojis</strong> et <strong>liens cliquables</strong> automatiques</li>
                <li>Un badge signale les <strong>nouveaux messages</strong> non lus</li>
              </ul>
              <Note>Chacun peut supprimer ses propres messages ; le chef (et l&apos;admin) peuvent modérer n&apos;importe quel message.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── RESSOURCES PARTAGÉES ─── */}
        <section id="ressources">
          <SectionTitle icon="📒" title="Ressources partagées (carnet du groupe)" color="teal" tutorials={tf('feature_ressources_partagees')} />
          <div className="space-y-4">
            <HelpCard title="Partager des ressources entre membres">
              <p>Le <strong>carnet</strong> rassemble tout ce que le groupe veut garder sous la main :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Liens</strong> vers des sites web</li>
                <li><strong>Boutiques</strong> de musiciens (adresse physique)</li>
                <li><strong>Contacts</strong> (téléphone, email)</li>
                <li><strong>Notes</strong> libres</li>
                <li><strong>Fichiers</strong> (décomptés du quota de stockage du groupe)</li>
              </ul>
              <Note>Visible uniquement par les membres du groupe.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── GALERIE ─── */}
        <section id="galerie">
          <SectionTitle icon="📸" title="Galerie photos" color="violet" tutorials={tf('feature_galerie')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert">
              <p>Centralisez toutes les <strong>photos des répétitions et des concerts</strong> en un seul endroit. Chaque membre partage ses clichés depuis son téléphone, tout le monde peut les récupérer, et le chef fait le ménage quand c&apos;est fait pour ne pas saturer le stockage.</p>
              <Tip>Idéal pour alimenter facilement les <strong>réseaux sociaux</strong> du groupe : la personne qui les gère retrouve toutes les photos déjà rassemblées.</Tip>
            </HelpCard>

            <HelpCard title="Ajouter ses photos (tous les membres)">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Ouvrez la carte <strong>📸 Galerie</strong> du groupe.</Step>
                <Step n={2}>Choisissez <strong>obligatoirement</strong> une association : une <strong>répétition</strong>, un <strong>concert</strong> (triés du plus proche au plus lointain) ou une <strong>catégorie</strong>.</Step>
                <Step n={3}>Touchez <strong>📷 Ajouter des photos</strong> : prenez une photo ou sélectionnez-en <strong>plusieurs d&apos;un coup</strong> dans votre pellicule.</Step>
              </ol>
              <Note>Chaque photo est <strong>automatiquement optimisée à moins de 500 Ko</strong> sur votre téléphone avant l&apos;envoi : c&apos;est plus rapide et ça économise le stockage, tout en gardant une belle qualité.</Note>
            </HelpCard>

            <HelpCard title="Créer une catégorie">
              <p>Si aucune répétition ni concert ne correspond (séance studio, tournage de clip, photos diverses…), créez une <strong>catégorie</strong> via <strong>➕ Créer une catégorie</strong>. Elle devient un album à part entière.</p>
            </HelpCard>

            <HelpCard title="Récupérer / télécharger une photo">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Touchez une photo pour l&apos;ouvrir en grand.</Step>
                <Step n={2}>Appuyez sur <strong>⬇ Télécharger</strong> en haut de l&apos;écran.</Step>
                <Step n={3}>Sur mobile, vous pouvez aussi faire un <strong>appui long sur la photo</strong> puis « Enregistrer l&apos;image ».</Step>
              </ol>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Gérer & faire le ménage" badge={{ label: 'Chef seulement', color: 'indigo' }}>
                <ul className="mt-1 space-y-1">
                  <li>Supprimer <strong>n&apos;importe quelle photo</strong> (chaque membre peut supprimer les siennes)</li>
                  <li><strong>Vider la galerie</strong> entièrement en un clic</li>
                  <li><strong>Supprimer un album de catégorie</strong> et ses photos depuis son en-tête</li>
                </ul>
                <Note>Toute suppression <strong>libère immédiatement l&apos;espace de stockage</strong> du groupe.</Note>
              </HelpCard>
            )}

            <HelpCard title="Rappel automatique avant la répétition">
              <p><strong>30 minutes avant</strong> chaque répétition, les membres qui ont indiqué être <strong>présents</strong> reçoivent un email les invitant à partager leurs meilleures photos dans la Galerie à l&apos;issue de la séance.</p>
              <Note>Le module <strong>Galerie</strong> peut être inclus ou non selon l&apos;offre du groupe (il apparaît grisé 🔒 s&apos;il n&apos;est pas inclus).</Note>
            </HelpCard>

          </div>
        </section>

        {/* ─── RÉSEAUX SOCIAUX ─── */}
        <section id="social">
          <SectionTitle icon="📣" title="Atelier réseaux sociaux" color="sky" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="À quoi ça sert">
              <p>Composez et partagez rapidement des <strong>posts pour les réseaux sociaux</strong> à partir des <strong>photos de la Galerie</strong> du groupe — idéal pour animer la communauté sans quitter l&apos;appli.</p>
            </HelpCard>
            <HelpCard title="Créer et partager un post" badge={{ label: 'Chef / co-chef autorisé', color: 'indigo' }}>
              <ol className="space-y-2 mt-1">
                <Step n={1}>Ouvrez la carte <strong>📣 Réseaux</strong> du groupe.</Step>
                <Step n={2}><strong>Sélectionnez des photos</strong> de la Galerie (plusieurs possibles, numérotées dans l&apos;ordre).</Step>
                <Step n={3}><strong>Indiquez qui apparaît</strong> sur les photos/vidéos (voir « Droit à l&apos;image » ci-dessous).</Step>
                <Step n={4}>Rédigez la <strong>légende</strong> : bouton <strong>✨ Suggérer un texte</strong> et <strong>hashtags</strong> rapides.</Step>
                <Step n={5}>Cliquez <strong>📤 Partager</strong>.</Step>
              </ol>
              <Note>📱 Sur <strong>mobile</strong>, « Partager » ouvre directement Instagram, Facebook, WhatsApp… avec l&apos;image. Comme ces apps n&apos;importent pas le texte joint, la <strong>légende est copiée</strong> automatiquement : faites un <strong>appui long → Coller</strong> dans l&apos;app. Sur <strong>ordinateur</strong>, utilisez <strong>📋 Copier la légende</strong> + <strong>⬇ Télécharger</strong> l&apos;image.</Note>
              <Tip>Vous pouvez <strong>💾 enregistrer</strong> un post pour le <strong>réutiliser</strong> plus tard (liste « Posts enregistrés »).</Tip>
            </HelpCard>
            <HelpCard title="Droit à l'image (obligatoire)" badge={{ label: 'RGPD', color: 'indigo' }}>
              <p>Pour respecter le <strong>droit à l&apos;image</strong>, chaque membre doit <strong>accepter ou refuser</strong> la diffusion de son visage (photos/vidéos) sur les réseaux. Une <strong>bannière</strong> s&apos;affiche sur la page du groupe ; le choix est modifiable à tout moment.</p>
              <ul className="mt-2 space-y-1">
                <li>Avant de partager, le chef <strong>indique qui apparaît</strong> sur les médias.</li>
                <li>Seuls les membres ayant <strong>accepté</strong> peuvent être identifiés. Un membre qui a <strong>refusé</strong> (⛔) ou <strong>pas encore répondu</strong> (⏳) ne peut pas être sélectionné.</li>
                <li>Si personne n&apos;est reconnaissable (instruments, de dos…), cochez <strong>« Aucune personne identifiable »</strong>.</li>
                <li>Tant que ce choix n&apos;est pas fait, <strong>Partager / Télécharger / Enregistrer</strong> restent bloqués.</li>
              </ul>
              <Note>Ne publiez <strong>jamais</strong> une photo où une personne ayant refusé est reconnaissable.</Note>
            </HelpCard>
            <HelpCard title="Qui peut publier ?">
              <p>Réservé au <strong>chef d&apos;orchestre</strong> et aux <strong>co-chefs</strong> à qui le fondateur a accordé le droit <strong>« Réseaux sociaux → Publier »</strong> (configurable dans <em>Permissions des co-chefs</em>, en bas de la page du groupe).</p>
              <Note>Le module peut être inclus ou non selon l&apos;offre du groupe (il apparaît grisé 🔒 s&apos;il n&apos;est pas inclus).</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── COMPTABILITÉ / CAISSE ─── */}
        <section id="comptabilite">
          <SectionTitle icon="💶" title="Comptabilité / caisse" color="orange" tutorials={tf('feature_comptabilite')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert">
              <p>Suivez les <strong>dépenses partagées</strong> du groupe : location de salle, achat de matériel, frais communs… et gardez la trace de <strong>qui a avancé l&apos;argent</strong> et de <strong>qui doit combien</strong>.</p>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Enregistrer une dépense" badge={{ label: 'Chef seulement', color: 'indigo' }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Depuis la page du groupe, ouvrez <strong>💶 Comptabilité</strong> puis <strong>+ Nouvelle dépense</strong>.</Step>
                  <Step n={2}>Renseignez le <strong>libellé</strong> (ex : &quot;Location studio – janvier&quot;), le <strong>montant</strong> et la <strong>date / période</strong> concernée.</Step>
                  <Step n={3}>Indiquez <strong>qui a payé</strong> (le membre qui a avancé l&apos;argent).</Step>
                  <Step n={4}>Choisissez la <strong>répartition</strong> : <strong>égale</strong> entre tous les membres, ou <strong>personnalisée</strong> (un montant par membre).</Step>
                </ol>
                <Note>La part de la personne qui a avancé l&apos;argent est automatiquement marquée <strong>réglée</strong>.</Note>
              </HelpCard>
            )}

            <HelpCard title="Qui a payé, qui doit">
              <p>Pour chaque dépense, vous voyez la <strong>part de chaque membre</strong> et si elle est <strong>réglée</strong> ou <strong>en attente</strong>.</p>
              <ul className="mt-2 space-y-1">
                <li>Cochez une part comme <strong>payée</strong> quand un membre a remboursé</li>
                <li>Un <strong>récapitulatif</strong> indique le total dépensé et le <strong>solde de chacun</strong> (avance / dette)</li>
              </ul>
              <Tip>Idéal pour les groupes qui se partagent la location d&apos;une salle ou tout autre frais récurrent.</Tip>
              <Note>Le module <strong>Comptabilité</strong> peut être inclus ou non selon l&apos;offre du groupe (il apparaît grisé 🔒 s&apos;il n&apos;est pas inclus).</Note>
            </HelpCard>

          </div>
        </section>

        {/* ─── RÉPERTOIRE ─── */}
        <section id="repertoire">
          <SectionTitle icon="🎼" title="Répertoire" color="indigo" tutorials={tf('feature_repertoire')} />
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
              <Note>Le quota de stockage est <strong>partagé entre tous vos groupes</strong> (pas un quota par groupe). La barre visible sur chaque groupe affiche la consommation totale de votre compte.</Note>
            </HelpCard>

            <HelpCard title="Tempo & métronome par morceau">
              <p>Renseignez le <strong>tempo (BPM)</strong> d&apos;un morceau : un badge <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">🥁 BPM</span> apparaît et lance un <strong>métronome visuel et sonore</strong> (son coupable avant le lancement).</p>
              <ul className="mt-2 space-y-1">
                <li>Affichage <strong>plein écran</strong> (gros repère) ou <strong>fenêtre flottante</strong> déplaçable et redimensionnable</li>
                <li>La fenêtre reste <strong>toujours au premier plan</strong>, même au-dessus d&apos;une partition PDF ouverte en plein écran</li>
              </ul>
              <Tip>Le tempo sert aussi de base au <strong>prompteur</strong> de paroles et au <strong>décompte</strong> du mode séquences.</Tip>
            </HelpCard>

            <HelpCard title="Outils par morceau">
              <p>Sur chaque morceau, des boutons donnent accès à :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>🎤 Paroles</strong> (avec prompteur), <strong>🎸 Tablature</strong>, <strong>🎚 Séquences</strong> (backing tracks)</li>
                <li>Les <strong>vidéos</strong> attachées se lisent dans une fenêtre intégrée à l&apos;application</li>
              </ul>
              <Note>Les modules <strong>Paroles</strong>, <strong>Métronome</strong> et <strong>Séquences</strong> peuvent être inclus ou non selon l&apos;offre du groupe (ils apparaissent grisés 🔒 si non inclus).</Note>
            </HelpCard>

            <HelpCard title="Suivi de progression">
              <p>Depuis la fiche d&apos;une répétition, chaque membre indique son <strong>pourcentage de maîtrise</strong> (de 0 à 100 %) pour chaque morceau — bien plus précis qu&apos;un simple « à travailler / en cours / maîtrisé ».</p>
              <ol className="space-y-2 mt-2">
                <Step n={1}>Sur un morceau, cliquez sur le <strong>bouton de progression</strong> (il affiche une petite barre et votre % actuel).</Step>
                <Step n={2}>Réglez votre niveau avec le <strong>curseur</strong> (par pas de 5 %) ou un <strong>préréglage rapide</strong> : 0 / 25 / 50 / 75 / 100 %.</Step>
              </ol>
              <p className="mt-3">La couleur et le libellé s&apos;adaptent automatiquement à votre pourcentage :</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ProgressPct percent={0} />
                <ProgressPct percent={20} />
                <ProgressPct percent={50} />
                <ProgressPct percent={80} />
                <ProgressPct percent={100} />
              </div>
              <Tip>Côté chef, le panneau de suivi affiche le % de chaque membre, le nombre de membres à 100 %, et la <strong>moyenne de maîtrise du groupe</strong> pour chaque morceau.</Tip>
            </HelpCard>
          </div>
        </section>

        {/* ─── SETLISTS ─── */}
        <section id="setlists">
          <SectionTitle icon="🎶" title="Setlists" color="green" tutorials={tf('feature_setlists')} />
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
          <SectionTitle icon="🎸" title="Grilles d'accords" color="orange" tutorials={tf('feature_grilles')} />
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

            {isCreateur && (
              <HelpCard title="Dupliquer une grille" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>La duplication permet de créer une <strong>copie complète</strong> d&apos;une grille (accords, marqueurs, tempo, tonalité) avec un nouveau titre — idéal pour personnaliser une version par musicien.</p>
                <ol className="space-y-2 mt-3">
                  <Step n={1}>Depuis la liste des grilles, cliquez sur <strong>Dupliquer</strong> sur la carte de la grille à copier.</Step>
                  <Step n={2}>Modifiez le titre proposé (pré-rempli avec <em>&quot;Titre — copie&quot;</em>).
                    <br /><span className="text-gray-500 text-xs">Exemples : &quot;Autumn Leaves — Pianiste&quot;, &quot;La Vie en Rose — Chanteur&quot;</span>
                  </Step>
                  <Step n={3}>Cliquez sur <strong>Dupliquer et ouvrir</strong> — vous êtes redirigé vers l&apos;éditeur de la nouvelle grille.</Step>
                </ol>
                <Tip>Chaque copie est indépendante : vous pouvez ajouter des annotations, modifier des accords ou changer le titre sans affecter la grille originale.</Tip>
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
                <p className="mb-2">Les barres de reprise et indications de navigation se placent dans la <strong>bandelette supérieure</strong> de chaque mesure (séparée des accords) :</p>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { sym: '||:', desc: 'Début de répétition', side: 'Gauche mesure' },
                    { sym: ':||', desc: 'Fin de répétition', side: 'Droite mesure' },
                    { sym: ':|:', desc: 'Double répétition', side: 'Droite mesure' },
                    { sym: '%', desc: 'Simile (répéter la mesure)', side: 'Temps' },
                    { sym: '/', desc: 'Temps vide / silence', side: 'Temps' },
                    { sym: '-', desc: 'Tenir / prolonger', side: 'Temps' },
                    { sym: 'Coda', desc: 'Coda', side: 'Droite mesure' },
                    { sym: 'Segno', desc: 'Segno (renvoi)', side: 'Gauche mesure' },
                    { sym: 'D.C.', desc: 'Da Capo (retour au début)', side: 'Droite mesure' },
                    { sym: 'D.S.', desc: 'Dal Segno', side: 'Droite mesure' },
                    { sym: 'Fine', desc: 'Fin', side: 'Droite mesure' },
                    { sym: '⌢', desc: 'Fermate (point d\'orgue)', side: 'Droite mesure' },
                  ].map((s) => (
                    <div key={s.sym} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <span className="text-sm font-black text-indigo-700 w-10 text-center flex-shrink-0 font-mono">{s.sym}</span>
                      <div>
                        <p className="text-xs text-gray-600">{s.desc}</p>
                        <p className="text-[10px] text-gray-400">{s.side}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Tip>Les barres de reprise (<strong>||:</strong>, <strong>:||</strong>) n&apos;occupent pas d&apos;espace dans les cases d&apos;accords — elles sont affichées dans une bandelette dédiée en haut de chaque mesure.</Tip>
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

        {/* ─── PAROLES ─── */}
        <section id="paroles">
          <SectionTitle icon="🎤" title="Paroles" color="rose" tutorials={tf('feature_paroles')} />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Saisir les paroles d'un morceau" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans le <strong>Répertoire</strong>, cliquez sur le bouton <strong>🎤 Paroles</strong> à droite de n&apos;importe quel morceau.</Step>
                  <Step n={2}>L&apos;onglet <strong>✏️ Éditeur</strong> s&apos;ouvre. Tapez les paroles directement dans la zone de texte.</Step>
                  <Step n={3}>Structurez les paroles en cliquant sur les boutons de marqueurs : <span className="inline-flex items-center rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">Refrain</span> <span className="inline-flex items-center rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-700">Couplet 1</span> <span className="inline-flex items-center rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-xs font-bold text-purple-700">Bridge</span>…</Step>
                </ol>
                <Note>La sauvegarde est <strong>automatique</strong> — 800 ms après la dernière frappe. L&apos;indicateur &quot;✓ Sauvegardé&quot; le confirme.</Note>
              </HelpCard>
            )}

            {isCreateur && (
              <HelpCard title="Ajouter des accords 🎸" badge={{ label: 'Nouveau', color: 'violet' }}>
                <p>L&apos;éditeur propose deux sous-modes : <strong>✏️ Texte</strong> (pour écrire les paroles et les marqueurs) et <strong>🎸 Accords</strong> (pour poser les accords <em>au-dessus des mots</em>, sans rien décaler).</p>
                <p className="mt-2 font-semibold text-gray-700">En mode 🎸 Accords :</p>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Choisissez un accord dans la <strong>palette</strong> en haut — il s&apos;<strong>arme</strong> (ex : « Actif : <span className="rounded bg-violet-600 px-1.5 py-0.5 text-xs text-white">C</span> »).</Step>
                  <Step n={2}>Cliquez <strong>directement sur la lettre</strong> des paroles où vous voulez l&apos;accord → il se pose pile au-dessus du mot.</Step>
                  <Step n={3}>L&apos;accord reste armé : enchaînez les clics pour le poser à plusieurs endroits. Cliquez un autre accord pour changer, ou <strong>✕ Désarmer</strong>.</Step>
                  <Step n={4}>Pour <strong>retirer</strong> un accord déjà posé, cliquez simplement dessus. Le repère <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs">↵</kbd> en fin de ligne pose un accord final.</Step>
                </ol>
                <p className="mt-3">La palette regroupe <strong>11 familles</strong> (Majeurs, Mineurs, Majeurs/Mineurs altérés, 7e, Maj7, Sus/add, 6/9, Dim/Aug, Basses…) en défilement horizontal, plus un champ <strong>« Autre… »</strong> pour tout accord spécial (<code className="bg-violet-50 text-violet-700 rounded px-1">Gm7</code>, <code className="bg-violet-50 text-violet-700 rounded px-1">D/F#</code>…).</p>
                <Tip>Le bandeau d&apos;accords <strong>reste collé en haut</strong> de la zone : vous gardez la palette sous la main même en faisant défiler un long texte.</Tip>
                <Note>Pour les habitués : en mode Texte, vous pouvez aussi taper les accords entre crochets dans la ligne, notation ChordPro : <code className="bg-gray-100 rounded px-1">[C]Au [G]clair de la [Am]lune</code>.</Note>
              </HelpCard>
            )}

            <HelpCard title="Affichage : Paroles / Accords / Les deux">
              <p>Dès qu&apos;un morceau contient des accords, un sélecteur apparaît. <strong>Chaque musicien</strong> choisit ce qu&apos;il veut voir :</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">🎤 Paroles</span>
                <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">🎸 Accords</span>
                <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">🎼 Les deux</span>
              </div>
              <p className="mt-3">Le chanteur affiche les paroles seules, le guitariste juste la grille d&apos;accords, et chacun garde sa préférence. Le choix est <strong>mémorisé sur l&apos;appareil</strong> et s&apos;applique partout : aperçu, mode scène, prompteur et impression.</p>
            </HelpCard>

            <HelpCard title="Marqueurs de structure">
              <p>Les marqueurs permettent de repérer instantanément les sections d&apos;un morceau. Chaque type a sa couleur :</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Intro',       bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
                  { label: 'Couplet 1/2', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
                  { label: 'Pré-refrain', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200'  },
                  { label: 'Refrain',     bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-200'   },
                  { label: 'Bridge',      bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                  { label: 'Outro',       bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200'   },
                  { label: 'Spoken',      bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200'   },
                  { label: '×2 / ×3',    bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
                ].map((m) => (
                  <div key={m.label} className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${m.bg} ${m.text} ${m.border}`}>
                    {m.label}
                  </div>
                ))}
              </div>
              <Tip>
                Vous pouvez aussi taper les marqueurs directement au clavier entre crochets :{' '}
                <code className="bg-gray-100 rounded px-1">[Refrain]</code>{' '}
                <code className="bg-gray-100 rounded px-1">[Couplet 2]</code>
              </Tip>
            </HelpCard>

            <HelpCard title="Aperçu et lecture">
              <p>L&apos;onglet <strong>👁 Aperçu</strong> affiche les paroles mises en forme avec les badges de section colorés — accessible à <strong>tous les membres</strong> du groupe, même sans droit d&apos;édition.</p>
              <p className="mt-2">Un badge <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">🎤 Paroles</span> apparaît sur les morceaux du répertoire qui ont déjà des paroles saisies.</p>
            </HelpCard>

            <HelpCard title="Mode scène 🎭">
              <p>Le bouton <strong>Mode scène</strong> (accessible à tous) ouvre un affichage plein écran optimisé pour la scène ou les répétitions :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Fond noir</strong>, texte blanc grande taille — lisible de loin</li>
                <li><strong>Badges de section</strong> bien visibles pour se repérer rapidement</li>
                <li><strong>Défilement tactile</strong> — parfait sur tablette en coulisse</li>
              </ul>
              <p className="mt-2 text-gray-600">Appuyez sur <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs">Échap</kbd> ou le bouton <em>Quitter</em> pour revenir à la vue normale.</p>
              <Tip>Pensez à passer le téléphone ou la tablette en mode ne pas déranger avant de monter sur scène !</Tip>
            </HelpCard>

            <HelpCard title="Prompteur 📜 (défilement automatique)">
              <p>Le bouton <strong>📜 Prompteur</strong> (depuis les paroles ou depuis le Mode scène) fait <strong>défiler automatiquement</strong> les paroles, à une vitesse déduite du <strong>tempo (BPM)</strong> du morceau.</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Délai de démarrage</strong> réglable : laissez passer une intro musicale, ou le temps de lire la 1ère phrase</li>
                <li><strong>Vitesse</strong> et <strong>taille de police</strong> ajustables en direct, pause / reprise</li>
                <li>Repère de lecture central, molette pour recaler manuellement</li>
                <li><strong>Accords</strong> : si le morceau en contient, choisissez l&apos;affichage (Paroles / Accords / Les deux) dans l&apos;écran de réglages</li>
              </ul>
              <Tip>Pour un défilement bien calé, renseignez le <strong>tempo</strong> du morceau dans le répertoire.</Tip>
            </HelpCard>

            <HelpCard title="Impression des paroles">
              <p>Le bouton <strong>🖨️ Imprimer</strong> génère une feuille A4 propre avec :</p>
              <ul className="mt-2 space-y-1">
                <li>En-tête : titre, artiste et nom du groupe</li>
                <li>Les paroles structurées — marqueurs en couleur, texte en police de lecture</li>
              </ul>
              <Tip>Pratique pour distribuer les paroles en répétition ou les avoir en main pendant un concert.</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── TABLATURES ─── */}
        <section id="tablatures">
          <SectionTitle icon="🎸" title="Tablatures" color="indigo" tutorials={tf('feature_tablatures')} />
          <div className="space-y-4">

            {isCreateur && (
              <HelpCard title="Ouvrir l'éditeur de tablature" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Dans le <strong>Répertoire</strong>, cliquez sur le bouton <strong>🎸 Tablature</strong> à droite du morceau souhaité.</Step>
                  <Step n={2}>Choisissez l&apos;instrument dans la barre de contrôle :
                    <ul className="mt-1 ml-4 space-y-0.5">
                      <li><span className="font-medium">Guitare</span> — 6 cordes (E A D G B e)</li>
                      <li><span className="font-medium">Basse</span> — 4 cordes (E A D G)</li>
                      <li><span className="font-medium">Ukulélé</span> — 4 cordes (G C E A)</li>
                    </ul>
                  </Step>
                  <Step n={3}>Sélectionnez le nombre de <strong>cases par mesure</strong> (4, 8 ou 16) selon la densité rythmique du morceau.</Step>
                  <Step n={4}>Cliquez sur une cellule et tapez le numéro de case ou une technique. Naviguez avec les flèches.</Step>
                </ol>
                <Note>La sauvegarde est <strong>automatique</strong> — 800 ms après la dernière frappe. Un badge <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">🎸 Tablature</span> apparaît sur le morceau dans le répertoire une fois enregistrée.</Note>
              </HelpCard>
            )}

            <HelpCard title="Instruments supportés">
              <p>La grille de tablature s&apos;adapte automatiquement à l&apos;instrument sélectionné :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: 'Guitare', emoji: '🎸', strings: ['e', 'B', 'G', 'D', 'A', 'E'], color: 'indigo' },
                  { name: 'Basse', emoji: '🎵', strings: ['G', 'D', 'A', 'E'], color: 'blue' },
                  { name: 'Ukulélé', emoji: '🌺', strings: ['A', 'E', 'C', 'G'], color: 'amber' },
                ].map((instr) => {
                  const bgColors: Record<string, string> = { indigo: 'bg-indigo-50 border-indigo-100', blue: 'bg-blue-50 border-blue-100', amber: 'bg-amber-50 border-amber-100' }
                  const textColors: Record<string, string> = { indigo: 'text-indigo-700', blue: 'text-blue-700', amber: 'text-amber-700' }
                  return (
                    <div key={instr.name} className={`rounded-lg border p-3 ${bgColors[instr.color]}`}>
                      <p className={`text-sm font-bold mb-1.5 ${textColors[instr.color]}`}>{instr.emoji} {instr.name}</p>
                      <div className="flex gap-1 font-mono text-xs">
                        {instr.strings.map((s, i) => (
                          <span key={i} className="flex flex-col items-center gap-0.5">
                            <span className={`font-bold ${textColors[instr.color]}`}>{s}</span>
                            <span className="text-gray-300 text-[10px]">─</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{instr.strings.length} cordes · du haut vers le bas</p>
                    </div>
                  )
                })}
              </div>
              <Tip>Changer d&apos;instrument efface toutes les notes saisies — une confirmation est demandée avant de réinitialiser.</Tip>
            </HelpCard>

            <HelpCard title="Techniques de jeu disponibles">
              <p>Chaque cellule accepte jusqu&apos;à 3 caractères. Les notations courantes sont supportées :</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { sym: '0–24',  desc: 'Case (frette)',       ex: '7' },
                  { sym: 'x',     desc: 'Corde étouffée',      ex: 'x' },
                  { sym: 'hN',    desc: 'Hammer-on',           ex: 'h9' },
                  { sym: 'pN',    desc: 'Pull-off',            ex: 'p7' },
                  { sym: '/N',    desc: 'Slide montant',       ex: '/9' },
                  { sym: '\\N',   desc: 'Slide descendant',    ex: '\\5' },
                  { sym: 'bN',    desc: 'Bend (montée de ton)',ex: 'b9' },
                  { sym: '──',    desc: 'Case vide (silence)', ex: '' },
                ].map((t) => (
                  <div key={t.sym} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-bold font-mono text-indigo-700 mb-0.5">{t.sym}</p>
                    <p className="text-xs text-gray-600">{t.desc}</p>
                    {t.ex && <p className="text-[10px] text-gray-400 mt-0.5">ex : <code className="bg-white rounded px-1">{t.ex}</code></p>}
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Navigation clavier" badge={isCreateur ? { label: "Chef seulement", color: "indigo" } : undefined}>
              {isCreateur ? (
                <>
                  <p>L&apos;éditeur est entièrement navigable au clavier pour saisir rapidement :</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: '← →', action: 'Case précédente / suivante' },
                      { key: '↑ ↓', action: 'Corde plus haute / plus basse' },
                      { key: 'Tab', action: 'Avancer d\'une case (même corde)' },
                      { key: 'Maj+Tab', action: 'Reculer d\'une case' },
                      { key: '⌫ Delete', action: 'Effacer la cellule active' },
                      { key: 'Clic', action: 'Sélectionner directement une cellule' },
                    ].map((k) => (
                      <div key={k.key} className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                        <kbd className="flex-shrink-0 rounded bg-white border border-gray-300 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700 shadow-sm whitespace-nowrap">{k.key}</kbd>
                        <span className="text-xs text-gray-600">{k.action}</span>
                      </div>
                    ))}
                  </div>
                  <Tip>La cellule sélectionnée s&apos;affiche en fond <span className="inline-block rounded bg-indigo-500 text-white px-1 text-xs">bleu</span>. Tapez directement la valeur pour la remplacer.</Tip>
                </>
              ) : (
                <p>La tablature est consultable en lecture seule. Cliquez sur les cellules pour les voir — la saisie est réservée au chef du groupe.</p>
              )}
            </HelpCard>

            <HelpCard title="Gérer les mesures" badge={{ label: "Chef seulement", color: "indigo" }}>
              <p>Utilisez les boutons de la barre de contrôle pour ajuster la structure :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>+ Mesure</strong> — ajoute une mesure vide à la fin</li>
                <li><strong>− Mesure</strong> — supprime la dernière mesure (désactivé si une seule mesure)</li>
                <li><strong>Cases/mesure</strong> — 4, 8 ou 16 subdivisions par mesure (⚠ efface les notes)</li>
              </ul>
              <Tip>La grille défile horizontalement si elle dépasse la largeur de l&apos;écran — pratique sur mobile ou tablette.</Tip>
            </HelpCard>

            <HelpCard title="Impression de la tablature">
              <p>Le bouton <strong>🖨️ Imprimer</strong> (accessible à tous) génère une feuille A4 au format standard :</p>
              <ul className="mt-2 space-y-1">
                <li>En-tête : titre, artiste, nom du groupe et instrument</li>
                <li>Grille avec cordes identifiées et barres de mesure</li>
                <li>Optimisé pour impression monochrome (police monospace Courier)</li>
              </ul>
            </HelpCard>

          </div>
        </section>

        {/* ─── SÉQUENCES ─── */}
        <section id="sequences">
          <SectionTitle icon="🎚" title="Séquences & backing tracks" color="green" tutorials={tf('feature_sequences')} />
          <div className="space-y-4">
            <HelpCard title="Ajouter des séquences à un morceau" badge={{ label: 'Chef seulement', color: 'indigo' }}>
              <p>Depuis un morceau du répertoire, bouton <strong>🎚 Séquences</strong> : importez des <strong>backing tracks</strong> audio (MP3, WAV, OGG…) ou des fichiers <strong>MIDI</strong> (.mid).</p>
              <Note>Les fichiers sont décomptés du quota de stockage du groupe.</Note>
            </HelpCard>
            <HelpCard title="Lecteur audio avec séparation click / backing">
              <p>Pour chaque séquence audio, choisissez le mode de sortie :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Stéréo normale</strong></li>
                <li><strong>Click G / Backing D</strong> : clic dans le canal gauche, playback dans le canal droit, avec <strong>volumes indépendants</strong> et coupure possible du clic</li>
              </ul>
              <p className="mt-2">Les fichiers MIDI sont lus par un synthé du navigateur (pré-écoute des notes).</p>
            </HelpCard>
            <HelpCard title="Travailler un passage à la maison">
              <p>Le lecteur intègre tout pour répéter efficacement chez soi :</p>
              <ul className="mt-2 space-y-1">
                <li>🌊 <strong>Forme d&apos;onde</strong> — visualisez les nuances et cliquez dessus pour vous positionner</li>
                <li>🐢 <strong>Vitesse / ralenti</strong> (0,5× à 1,25×) — la <strong>tonalité reste inchangée</strong></li>
                <li>🔁 <strong>Boucle A–B</strong> — réglez <strong>A</strong> et <strong>B</strong> par <strong>⏱ capture</strong> (position de lecture) ou en <strong>tapant le temps</strong> (ex. <code className="bg-gray-100 rounded px-1">3:03</code>), puis activez la boucle</li>
                <li>⭐ <strong>Boucles sauvegardées</strong> — enregistrez vos passages (💾), rechargez-les en 1 clic, <strong>modifiez-les</strong> (✏️) ou supprimez-les. Personnelles à chaque membre.</li>
                <li>⏳ <strong>Départ différé</strong> — un compte à rebours (3 / 5 / 10 s ou libre) avant le démarrage, le temps de prendre l&apos;instrument</li>
              </ul>
              <Tip>Combinez : un backing « sans votre instrument » (via Moises), ralenti à 0,75× <em>et</em> boucle A–B sauvegardée sur le passage difficile.</Tip>
            </HelpCard>
            <HelpCard title="Mode scène (par setlist)">
              <p>Depuis une <strong>setlist</strong>, le bouton <strong>🎚 Mode séquences</strong> enchaîne automatiquement les backing tracks des morceaux : <strong>décompte au tempo</strong>, lecture, précédent / suivant et <strong>enchaînement automatique</strong>.</p>
            </HelpCard>
          </div>
        </section>

        {/* ─── LECTEUR AUDIO FLOTTANT ─── */}
        <section id="lecteur-flottant">
          <SectionTitle icon="🎧" title="Lecteur audio flottant" color="indigo" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="Écouter un audio par-dessus une partition">
              <p>Dans le <strong>Répertoire</strong> d&apos;un groupe, un bouton flottant <strong>🎧 Lecteur audio</strong> (en bas à droite) permet de jouer <strong>n&apos;importe quel audio du groupe</strong> (backing tracks &amp; ressources audio) tout en consultant autre chose.</p>
              <ul className="mt-2 space-y-1">
                <li>Choisissez un audio dans la liste, il s&apos;ouvre avec tous les outils (waveform, boucle A–B, ralenti)</li>
                <li>Le lecteur <strong>flotte par-dessus</strong> : ouvrez une <strong>partition PDF</strong> d&apos;un morceau et l&apos;audio continue</li>
                <li><strong>Réduisez-le</strong> (▾) : la lecture <strong>continue</strong> en arrière-plan, une pastille verte indique qu&apos;un audio est chargé</li>
              </ul>
            </HelpCard>
          </div>
        </section>

        {/* ─── PARTITION ANNOTÉE (points d'écoute) ─── */}
        <section id="annotation">
          <SectionTitle icon="🔊" title="Partition annotée (points d'écoute)" color="rose" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="À quoi ça sert">
              <p>Posez des repères <strong>🔊</strong> directement sur une partition (<strong>image</strong> ou <strong>PDF</strong>) pour <strong>lancer l&apos;audio à l&apos;endroit voulu</strong> d&apos;un simple clic — parfait pour bosser un passage précis avec le son.</p>
            </HelpCard>
            <HelpCard title="Comment faire">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Dans le <strong>Répertoire</strong>, sur une ressource <strong>PDF</strong> ou <strong>image</strong>, cliquez <strong>🔊 Annoter</strong>.</Step>
                <Step n={2}>En bas, choisissez l&apos;<strong>audio</strong> (le backing track du morceau) et lancez la lecture.</Step>
                <Step n={3}>Passez en mode <strong>✎ Éditer</strong>, amenez l&apos;audio sur le passage voulu, puis <strong>cliquez sur la partition</strong> : un <strong>🔊</strong> s&apos;y pose, calé sur le temps actuel.</Step>
                <Step n={4}>Repassez en <strong>▶ Écouter</strong> et <strong>cliquez un 🔊</strong> : l&apos;audio démarre pile à ce moment.</Step>
              </ol>
              <Note>Cliquez un 🔊 en mode Éditer pour le régler (⏱ caler sur l&apos;audio, saisir un temps, tester, supprimer). Les marqueurs sont <strong>personnels</strong>, et pour les <strong>PDF</strong> ils sont mémorisés <strong>par page</strong>.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── DICTIONNAIRE D'ACCORDS ─── */}
        <section id="accords">
          <SectionTitle icon="🎹" title="Dictionnaire d'accords" color="blue" tutorials={tf('tool_accords')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert ?">
              <p>Le <strong>Dictionnaire d'accords</strong> est un outil de théorie musicale intégré, accessible sans quitter l&apos;application. Il permet à tout musicien de trouver instantanément les notes qui composent n&apos;importe quel accord.</p>
              <p className="mt-2">Exemples :</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { chord: 'F',   notes: 'F – A – C',           solfege: 'Fa – La – Do' },
                  { chord: 'Am7', notes: 'A – C – E – G',        solfege: 'La – Do – Mi – Sol' },
                  { chord: 'B♭maj7', notes: 'B♭ – D – F – A',   solfege: 'Si♭ – Ré – Fa – La' },
                ].map((ex) => (
                  <div key={ex.chord} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-sm font-black text-blue-700 font-mono">{ex.chord}</p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">{ex.notes}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ex.solfege}</p>
                  </div>
                ))}
              </div>
              <Tip>Accessible via <strong>Accords</strong> dans la barre de navigation latérale — aucune connexion requise.</Tip>
            </HelpCard>

            <HelpCard title="Comment utiliser le dictionnaire">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Cliquez sur une <strong>fondamentale</strong> (note racine) parmi les 12 touches : C, C♯, D, E♭, E, F, F♯, G, A♭, A, B♭, B.</Step>
                <Step n={2}>Choisissez la <strong>qualité de l&apos;accord</strong> dans l&apos;un des 5 groupes disponibles.</Step>
                <Step n={3}>Le résultat s&apos;affiche instantanément :
                  <ul className="mt-1 ml-4 space-y-0.5">
                    <li>Le <span className="font-medium">nom de l&apos;accord</span> en grand (ex : Fm7)</li>
                    <li>Les <span className="font-medium">notes en lettres</span> (F – A♭ – C – E♭)</li>
                    <li>Les <span className="font-medium">notes en solfège</span> (Fa – La♭ – Do – Mi♭)</li>
                    <li>La <span className="font-medium">formule harmonique</span> (1 – ♭3 – 5 – ♭7)</li>
                    <li>Le <span className="font-medium">clavier de piano</span> avec les touches colorées</li>
                  </ul>
                </Step>
              </ol>
            </HelpCard>

            <HelpCard title="Types d'accords disponibles (35)">
              <p>Les accords sont regroupés en 5 catégories :</p>
              <div className="mt-3 space-y-2">
                {[
                  { name: 'Triades (3 notes)',       types: ['Majeur', 'Mineur', 'Diminué', 'Augmenté'] },
                  { name: 'Suspendus & Power',        types: ['Sus2', 'Sus4', 'Power chord (5)'] },
                  { name: 'Septièmes (4 notes)',      types: ['Dominante 7', 'Majeur 7', 'Mineur 7', 'Mineur/Maj 7', 'Diminué 7', 'Semi-diminué (m7♭5)', 'Augmenté 7'] },
                  { name: 'Sixtes & Add',             types: ['Majeur 6', 'Mineur 6', 'Add9'] },
                  { name: 'Extensions (5–7 notes)',   types: ['9', 'Maj9', 'Min9', '11', '13'] },
                ].map((group) => (
                  <div key={group.name} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-40 flex-shrink-0 pt-0.5">{group.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {group.types.map((t) => (
                        <span key={t} className="rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Tableau de référence">
              <p>En bas de la page, un <strong>tableau de référence complet</strong> liste tous les accords de la fondamentale sélectionnée en une seule vue :</p>
              <ul className="mt-2 space-y-1">
                <li>Nom de l&apos;accord (notation symbolique)</li>
                <li>Notes en lettres et en solfège</li>
                <li>Formule harmonique</li>
              </ul>
              <p className="mt-2 text-gray-600">Cliquez sur n&apos;importe quelle ligne pour afficher cet accord dans la vue principale avec le clavier de piano.</p>
              <Tip>Les dièses (♯) et bémols (♭) sont automatiquement appliqués selon la convention musicale de la fondamentale — par exemple F utilise des bémols (A♭, E♭…), D utilise des dièses (F♯, C♯…).</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── ACCORDEUR ─── */}
        <section id="accordeur">
          <SectionTitle icon="🎙️" title="Accordeur" color="green" tutorials={tf('tool_accordeur')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert ?">
              <p>L&apos;accordeur intégré utilise le <strong>microphone de votre appareil</strong> pour détecter la note que vous jouez en temps réel — sans installation, directement dans le navigateur.</p>
              <p className="mt-2">Il est compatible <strong>guitare</strong> (6 cordes), <strong>basse 4 cordes</strong> et <strong>basse 5 cordes</strong>.</p>
              <Tip>Accessible via <strong>Accordeur</strong> dans la barre de navigation — aucune connexion réseau requise après le chargement de la page.</Tip>
            </HelpCard>

            <HelpCard title="Comment utiliser l'accordeur">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Sélectionnez votre instrument en haut de la page : <strong>Guitare</strong>, <strong>Basse 4</strong> ou <strong>Basse 5</strong>.</Step>
                <Step n={2}>Cliquez sur <strong>Démarrer l&apos;accordeur</strong> — votre navigateur vous demandera d&apos;autoriser l&apos;accès au microphone.</Step>
                <Step n={3}>Jouez une note et maintenez-la. La note détectée s&apos;affiche en grand avec la déviation en centièmes.</Step>
                <Step n={4}>Accordez jusqu&apos;à ce que l&apos;aiguille soit <strong>au centre</strong> et le badge <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>✓ Accordé</span> apparaisse.</Step>
              </ol>
              <Tip>Pour une meilleure précision, jouez dans un endroit calme et tenez la note. L&apos;accordeur lisse les mesures sur 6 échantillons pour éviter les fluctuations parasites.</Tip>
            </HelpCard>

            <HelpCard title="Lire l'affichage">
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                  <p className="text-2xl font-black text-green-600 mb-1">±5¢</p>
                  <p className="text-xs font-semibold text-green-700">Vert — Accordé</p>
                  <p className="text-xs text-gray-500 mt-0.5">Déviation ≤ 5 centièmes</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-black text-amber-600 mb-1">±15¢</p>
                  <p className="text-xs font-semibold text-amber-700">Ambre — Proche</p>
                  <p className="text-xs text-gray-500 mt-0.5">Déviation entre 5 et 15¢</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                  <p className="text-2xl font-black text-red-600 mb-1">&gt;15¢</p>
                  <p className="text-xs font-semibold text-red-700">Rouge — Désaccordé</p>
                  <p className="text-xs text-gray-500 mt-0.5">Déviation supérieure à 15¢</p>
                </div>
              </div>
              <p className="mt-3 text-gray-600">La valeur affichée (<strong>+12¢</strong>, <strong>−8¢</strong>…) indique si la note est trop haute (♯) ou trop basse (♭). Un centième = 1/100e de demi-ton.</p>
            </HelpCard>

            <HelpCard title="Cordes de référence">
              <p>Le panneau du bas affiche toutes les cordes de l&apos;instrument sélectionné avec leur fréquence. La corde la plus proche de la note jouée est <strong>mise en surbrillance</strong> avec la couleur correspondant à votre déviation.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { name: 'Guitare', strings: 'E4 B3 G3 D3 A2 E2' },
                  { name: 'Basse 4', strings: 'G2 D2 A1 E1' },
                  { name: 'Basse 5', strings: 'G2 D2 A1 E1 B0' },
                ].map((i) => (
                  <div key={i.name} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-bold text-gray-700 mb-1">{i.name}</p>
                    <p className="text-xs font-mono text-gray-500">{i.strings}</p>
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Problème de microphone ?">
              <p>Si votre navigateur refuse l&apos;accès au microphone :</p>
              <ol className="space-y-1 mt-2">
                <Step n={1}>Cliquez sur l&apos;icône 🔒 dans la barre d&apos;adresse du navigateur.</Step>
                <Step n={2}>Allez dans <strong>Paramètres du site</strong> → <strong>Microphone</strong> → sélectionnez <strong>Autoriser</strong>.</Step>
                <Step n={3}>Rechargez la page.</Step>
              </ol>
              <Note>L&apos;accordeur nécessite une connexion HTTPS sécurisée (ce qui est le cas sur solaupiano.fr) et un microphone connecté à votre appareil.</Note>
            </HelpCard>

          </div>
        </section>

        {/* ─── MÉTRONOME ─── */}
        <section id="metronome">
          <SectionTitle icon="🥁" title="Métronome" color="indigo" tutorials={tf('tool_metronome')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert ?">
              <p>Le métronome intégré vous aide à travailler votre tempo pendant les répétitions ou l&apos;entraînement individuel — de <strong>20 à 300 BPM</strong>, sans installation.</p>
              <p className="mt-2">Il utilise la <strong>Web Audio API</strong> avec un algorithme de scheduling avancé pour une précision maximale, immune aux variations du moteur JavaScript.</p>
            </HelpCard>

            <HelpCard title="Régler le tempo">
              <p>Plusieurs façons de définir le BPM :</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">±</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Boutons − / +</p>
                    <p className="text-xs text-gray-500">Cliquez pour ±1 BPM. <strong>Maintenez appuyé</strong> pour une variation continue et rapide.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">⟵⟶</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Slider</p>
                    <p className="text-xs text-gray-500">Faites glisser la barre sous l&apos;affichage BPM pour régler le tempo d&apos;un geste.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">👆</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tap Tempo</p>
                    <p className="text-xs text-gray-500">Tapez plusieurs fois au rythme de la musique — le BPM est calculé automatiquement sur les 8 derniers taps (fenêtre de 3 secondes).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">⚡</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Presets de tempo</p>
                    <p className="text-xs text-gray-500">Cliquez sur un preset pour l&apos;appliquer instantanément.</p>
                  </div>
                </div>
              </div>
            </HelpCard>

            <HelpCard title="Presets de tempo">
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { name: 'Largo', bpm: '50', desc: 'Très lent' },
                  { name: 'Andante', bpm: '80', desc: 'Allant' },
                  { name: 'Moderato', bpm: '108', desc: 'Modéré' },
                  { name: 'Allegro', bpm: '132', desc: 'Vif' },
                  { name: 'Presto', bpm: '180', desc: 'Très vite' },
                ].map((p) => (
                  <div key={p.name} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-indigo-700">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.bpm} BPM</p>
                    <p className="text-[10px] text-gray-400">{p.desc}</p>
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Mesure et indicateurs visuels">
              <p>Choisissez votre <strong>signature rythmique</strong> dans le panneau Mesure :</p>
              <div className="mt-2 grid grid-cols-4 gap-2 mb-3">
                {['2/4', '3/4', '4/4', '6/8'].map((s) => (
                  <div key={s} className="rounded-xl bg-indigo-50 border border-indigo-200 px-2 py-2 text-center text-sm font-bold text-indigo-700">{s}</div>
                ))}
              </div>
              <p>Les <strong>indicateurs de temps</strong> s&apos;allument en rythme :</p>
              <ul className="mt-2 space-y-1">
                <li><span className="inline-block w-3 h-3 rounded-full mr-1 align-middle" style={{ background: '#f59e0b' }} /> <strong>Ambre</strong> — premier temps (accent)</li>
                <li><span className="inline-block w-3 h-3 rounded-full mr-1 align-middle" style={{ background: '#6366f1' }} /> <strong>Indigo</strong> — temps normaux</li>
              </ul>
              <Tip>Activez les <strong>Sous-divisions (croches)</strong> pour entendre les 8<sup>es</sup> notes intercalées à volume réduit — utile pour travailler les passages rapides.</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── PORTÉE MUSICALE ─── */}
        <section id="portee">
          <SectionTitle icon="🎼" title="Portée musicale" color="violet" tutorials={tf('tool_portee')} />
          <div className="space-y-4">

            <HelpCard title="À quoi ça sert ?">
              <p>L&apos;outil <strong>Portée musicale</strong> est un éditeur SVG interactif qui permet de placer des notes sur une portée et d&apos;obtenir instantanément leur nom en solfège français — avec toutes les altérations possibles — ainsi que la <strong>reconnaissance automatique d&apos;accords</strong>.</p>
              <p className="mt-2">Deux modes sont disponibles :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                  <p className="text-sm font-bold text-violet-700 mb-1">🎵 Mode Note</p>
                  <p className="text-xs text-gray-600">Placez une note à la fois sur la portée. Son nom en solfège, son octave et ses équivalents enharmoniques s&apos;affichent instantanément.</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-sm font-bold text-indigo-700 mb-1">🎸 Mode Accord</p>
                  <p className="text-xs text-gray-600">Placez 2 notes ou plus. L&apos;outil identifie automatiquement l&apos;accord (nom, renversement) parmi 23 types d&apos;accords reconnus.</p>
                </div>
              </div>
              <Tip>Accessible via <strong>Portée</strong> dans la barre de navigation — fonctionne entièrement dans le navigateur, sans connexion réseau.</Tip>
            </HelpCard>

            <HelpCard title="Comment utiliser la portée">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Choisissez le <strong>mode</strong> : 🎵 Note unique ou 🎸 Accord (boutons en haut à gauche).</Step>
                <Step n={2}>Choisissez la <strong>clef</strong> : Sol (clef de sol — tréble) ou Fa (clef de fa — basse) via le bouton dédié.</Step>
                <Step n={3}><strong>Cliquez sur la portée</strong> à la hauteur souhaitée pour placer une note. Les lignes supplémentaires apparaissent automatiquement pour les notes hors portée.</Step>
                <Step n={4}>En mode Note, le <strong>nom solfège + octave</strong> s&apos;affiche immédiatement. En mode Accord, posez plusieurs notes puis lisez le résultat en bas.</Step>
                <Step n={5}>Cliquez sur la note pour <strong>cycler ses altérations</strong> : ♮ naturel → ♯ dièse → 𝄪 double dièse → ♭ bémol → 𝄫 double bémol → ♮…</Step>
                <Step n={6}>Cliquez sur <strong>Effacer</strong> (icône poubelle) pour remettre la portée à zéro.</Step>
              </ol>
            </HelpCard>

            <HelpCard title="Altérations disponibles">
              <p>Chaque note peut porter cinq niveaux d&apos;altération. Cliquez sur la note pour passer à l&apos;altération suivante :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                {[
                  { sym: '♮', name: 'Naturel',      color: 'bg-gray-50 border-gray-200 text-gray-700' },
                  { sym: '♯', name: 'Dièse',         color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { sym: '𝄪', name: 'Double dièse', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                  { sym: '♭', name: 'Bémol',         color: 'bg-rose-50 border-rose-200 text-rose-700' },
                  { sym: '𝄫', name: 'Double bémol', color: 'bg-red-50 border-red-200 text-red-700' },
                ].map((a) => (
                  <div key={a.sym} className={`rounded-lg border px-3 py-2 text-center ${a.color}`}>
                    <p className="text-xl font-bold mb-0.5">{a.sym}</p>
                    <p className="text-xs font-medium">{a.name}</p>
                  </div>
                ))}
              </div>
              <Tip>Les équivalents enharmoniques (ex : Ré♯ = Mi♭) sont affichés à côté du nom principal — pratique pour comprendre les deux façons de noter une même hauteur.</Tip>
            </HelpCard>

            <HelpCard title="Changer de clef">
              <p>Le bouton <strong>Clef de Sol / Clef de Fa</strong> permet de basculer entre les deux registres :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-700 mb-1">𝄞 Clef de Sol (Tréble)</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>Ligne du bas = Mi 4</li>
                    <li>Ligne du milieu = Si 4</li>
                    <li>Do central (C4) = ligne supplémentaire sous la portée</li>
                    <li>Idéale pour voix, violon, flûte, main droite piano</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                  <p className="text-sm font-bold text-teal-700 mb-1">𝄢 Clef de Fa (Basse)</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>Ligne du bas = Sol 2</li>
                    <li>Ligne du milieu = Ré 3</li>
                    <li>Do central (C4) = ligne supplémentaire au-dessus</li>
                    <li>Idéale pour basse, tuba, main gauche piano</li>
                  </ul>
                </div>
              </div>
              <Note>Changer de clef efface la note ou les notes en cours — la portée est réinitialisée pour éviter toute confusion.</Note>
            </HelpCard>

            <HelpCard title="Reconnaissance d'accords (23 types)">
              <p>En mode Accord, l&apos;outil identifie automatiquement le type d&apos;accord formé par les notes placées, parmi les 23 types suivants :</p>
              <div className="mt-3 space-y-2">
                {[
                  { cat: 'Triades',         types: ['Majeur', 'Mineur', 'Diminué', 'Augmenté'] },
                  { cat: 'Suspendus',        types: ['Sus2', 'Sus4'] },
                  { cat: 'Septièmes',        types: ['Majeur 7', 'Dominante 7', 'Mineur 7', 'Mineur 7♭5', 'Dim7', 'Mineur maj7', 'Augmenté 7', 'Augmenté maj7'] },
                  { cat: 'Sixtes & Add',     types: ['Majeur 6', 'Mineur 6', 'Add9', 'Mineur add9'] },
                  { cat: 'Extensions & Sus7',types: ['9', 'Majeur 9', 'Mineur 9', '7sus4', '7sus2'] },
                ].map((group) => (
                  <div key={group.cat} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0 pt-0.5">{group.cat}</span>
                    <div className="flex flex-wrap gap-1">
                      {group.types.map((t) => (
                        <span key={t} className="rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs text-violet-700">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-gray-600">Le résultat affiche :</p>
              <ul className="mt-1 space-y-1">
                <li>Le <strong>nom de l&apos;accord</strong> avec la fondamentale en solfège (ex : <span className="font-mono text-sm">Sol mineur 7</span>)</li>
                <li>Le <strong>renversement</strong> s&apos;il est détecté (état fondamental, 1er renversement, 2e renversement…)</li>
                <li>La <strong>notation symbolique</strong> internationale (ex : <span className="font-mono text-sm">Gm7 / B♭</span>)</li>
                <li>La <strong>liste des notes</strong> composant l&apos;accord</li>
              </ul>
            </HelpCard>

            <HelpCard title="Renversements d'accords">
              <p>La note la plus basse sur la portée (la plus descendue visuellement) est considérée comme la <strong>basse</strong> de l&apos;accord. Si elle n&apos;est pas la fondamentale, l&apos;outil détecte le renversement :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                {[
                  { label: 'État fondamental', desc: 'Fondamentale à la basse', ex: 'Do–Mi–Sol' },
                  { label: '1er renversement', desc: 'Tierce à la basse',       ex: 'Mi–Sol–Do' },
                  { label: '2e renversement',  desc: 'Quinte à la basse',       ex: 'Sol–Do–Mi' },
                  { label: '3e renversement',  desc: '7e à la basse (accords 4 notes)', ex: 'Si–Ré–Fa–Sol' },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-bold text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                    <p className="text-[10px] font-mono text-indigo-600 mt-1">{r.ex}</p>
                  </div>
                ))}
              </div>
              <Tip>Pour tester un renversement, placez les notes dans n&apos;importe quel ordre — c&apos;est la hauteur effective (position sur la portée) qui détermine la basse, pas l&apos;ordre de saisie.</Tip>
            </HelpCard>

            <HelpCard title="Notes adjacentes et décalage visuel">
              <p>Lorsque deux notes sont à distance d&apos;un demi-ton ou d&apos;un ton (notes voisines sur la portée), la note inférieure est automatiquement <strong>décalée vers la droite</strong> pour éviter le chevauchement visuel — comme sur une partition classique.</p>
              <Tip>Ce décalage est purement cosmétique : les deux notes sonnent ensemble et sont toutes deux prises en compte dans la reconnaissance d&apos;accord.</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── LECTEUR DE PARTITION ─── */}
        <section id="lecteur-partition">
          <SectionTitle icon="🎼" title="Lecteur de partition (MusicXML)" color="violet" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="Lire et jouer une partition">
              <p>Outil <strong>🎼 Lecteur partition</strong> : importez un fichier <strong>MusicXML</strong> (<code className="bg-gray-100 rounded px-1">.musicxml</code> / <code className="bg-gray-100 rounded px-1">.mxl</code>, export <strong>MuseScore</strong> / Free-scores) et la vraie partition s&apos;affiche.</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Lecture</strong> avec un <strong>curseur qui suit les notes</strong> (▶ / ⏸ / ⏭ note suivante / ⏮ début)</li>
                <li><strong>Vitesse</strong> (ralenti), <strong>transposition</strong> (± demi-tons) et <strong>zoom</strong></li>
                <li>Bouton <strong>« Charger un exemple »</strong> pour tester sans fichier</li>
              </ul>
              <Note>Le <strong>MIDI</strong> ne contient pas de partition gravée : pour la vue partition, utilisez un MusicXML. Tout se passe dans votre navigateur.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── VIDÉO → MP3 / WAV ─── */}
        <section id="video-audio">
          <SectionTitle icon="🎬" title="Vidéo → MP3 / WAV" color="indigo" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="Extraire l'audio d'une vidéo">
              <p>Outil <strong>🎬 Vidéo → MP3</strong> : déposez un fichier vidéo (MP4, MOV, WEBM…) et récupérez sa <strong>piste audio</strong> en <strong>MP3</strong> (qualité réglable) ou <strong>WAV</strong>.</p>
              <ul className="mt-2 space-y-1">
                <li><strong>100 % dans le navigateur</strong> : aucun fichier n&apos;est envoyé sur Internet</li>
                <li>Idéal pour transformer une vidéo en backing track à importer dans <strong>🎚 Séquences</strong></li>
              </ul>
              <Note>À n&apos;utiliser que pour des vidéos dont vous détenez les droits.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── PHOTOS → PDF ─── */}
        <section id="images-pdf">
          <SectionTitle icon="🖼️" title="Photos → PDF" color="teal" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="Transformer des photos en PDF">
              <p>Lors de l&apos;ajout d&apos;une <strong>ressource</strong> à un morceau, vous pouvez convertir des <strong>photos</strong> (JPG, PNG, BMP, TIFF…) en <strong>PDF</strong> — pratique pour scanner une partition prise en photo. La conversion est <strong>locale</strong> (dans le navigateur).</p>
              <Note>Ce module peut être inclus ou non selon l&apos;offre du groupe.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── STATISTIQUES ─── */}
        <section id="stats">
          <SectionTitle icon="📊" title="Statistiques" color="violet" tutorials={tf('feature_stats')} />
          <div className="space-y-4">

            <HelpCard title="À quoi servent les statistiques ?">
              <p>Le module <strong>Statistiques</strong> donne aux chefs d&apos;orchestre une vue analytique complète de leur groupe : assiduité des membres, maîtrise du répertoire, fréquence des répétitions et utilisation des ressources.</p>
              <p className="mt-2">Toutes les données sont calculées en temps réel à partir des informations existantes — présences, niveaux de maîtrise, répétitions passées.</p>
              <Note>Le module statistiques est disponible sur les <strong>plans payants</strong>. Sur le plan Gratuit, un message vous invite à upgrader.</Note>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Accéder aux statistiques" badge={{ label: "Chef seulement", color: "indigo" }}>
                <ol className="space-y-2 mt-1">
                  <Step n={1}>Depuis la page de votre groupe, cliquez sur le bouton <strong>📊 Statistiques</strong> dans la barre de navigation.</Step>
                  <Step n={2}>La page affiche les indicateurs clés (KPIs) en haut, puis les graphiques détaillés.</Step>
                </ol>
                <Tip>Si votre forfait n&apos;inclut pas les statistiques, le bouton affiche un badge <strong>&quot;Plan supérieur&quot;</strong> — vous pouvez quand même cliquer pour voir le message d&apos;upgrade.</Tip>
              </HelpCard>
            )}

            <HelpCard title="Indicateurs clés (KPIs)">
              <p>En haut de la page, 4 chiffres résument l&apos;activité du groupe :</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '🎵', label: 'Répétitions', desc: 'Nombre de répétitions passées depuis la création du groupe' },
                  { icon: '✅', label: 'Taux de présence', desc: 'Pourcentage global de présences sur toutes les répétitions' },
                  { icon: '🎼', label: 'Morceaux', desc: 'Total des morceaux au répertoire actif du groupe' },
                  { icon: '👥', label: 'Membres', desc: 'Nombre de membres actuellement dans le groupe' },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-base mb-1">{k.icon}</p>
                    <p className="text-xs font-bold text-gray-800">{k.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{k.desc}</p>
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Présence par répétition">
              <p>Un graphique à <strong>barres empilées</strong> affiche les 12 dernières répétitions passées. Pour chacune, trois couleurs indiquent :</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border-green-200"><span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" /> Présents</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" /> Incertains</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border-red-200"><span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" /> Absents</span>
              </div>
              <p className="mt-2 text-gray-600">Survolez une barre pour voir le détail exact (nombre de membres dans chaque catégorie).</p>
              <Tip>Seules les répétitions <strong>passées</strong> sont comptabilisées. Les répétitions futures n&apos;apparaissent pas dans les statistiques.</Tip>
            </HelpCard>

            <HelpCard title="Répertoire par niveau de maîtrise">
              <p>Un <strong>camembert</strong> classe les morceaux du répertoire selon leur niveau de maîtrise moyen au sein du groupe :</p>
              <div className="mt-3 space-y-2">
                {[
                  { color: '#22c55e', label: 'Maîtrisé', desc: 'Tous les membres ont marqué ce morceau comme maîtrisé' },
                  { color: '#f59e0b', label: 'En cours', desc: 'Au moins un membre est en cours ou a maîtrisé ce morceau' },
                  { color: '#ef4444', label: 'À travailler', desc: 'Tous les membres l\'ont marqué à travailler' },
                  { color: '#d1d5db', label: 'Non évalué', desc: 'Aucun membre n\'a encore indiqué son niveau' },
                ].map((s) => (
                  <div key={s.label} className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: s.color }} />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">{s.label}</span>
                      <span className="text-xs text-gray-500"> — {s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Tip>Les niveaux de maîtrise sont mis à jour par chaque membre depuis la <strong>fiche de répétition</strong> (bouton de progression sur chaque morceau).</Tip>
            </HelpCard>

            <HelpCard title="Fréquence des répétitions (6 derniers mois)">
              <p>Une <strong>courbe linéaire</strong> affiche le nombre de répétitions passées chaque mois sur les 6 derniers mois. Elle permet d&apos;identifier facilement les périodes d&apos;activité intense ou les creux (vacances, pauses…).</p>
            </HelpCard>

            <HelpCard title="Présence par membre">
              <p>Un tableau classe chaque membre selon son taux de présence, avec une <strong>barre colorée</strong> :</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                  <div className="h-2 w-16 rounded-full bg-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-medium">≥ 75 % — Excellent</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="h-2 w-10 rounded-full bg-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">50–74 % — Correct</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <div className="h-2 w-6 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">&lt; 50 % — À améliorer</p>
                </div>
              </div>
              <p className="mt-2 text-gray-600">Le détail (✓ présences, ✕ absences, ? incertains) est affiché sur la droite pour chaque membre.</p>
            </HelpCard>

            <HelpCard title="Ressources par type">
              <p>Cette section affiche la répartition des ressources attachées aux morceaux du répertoire, par type :</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['PDF', 'Audio', 'Vidéo', 'Image', 'YouTube', 'Lien', 'Autre'].map((t) => (
                  <span key={t} className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">{t}</span>
                ))}
              </div>
              <p className="mt-2 text-gray-600">Pour les fichiers hébergés (PDF, Audio, Image…), la taille totale occupée est indiquée pour aider à gérer l&apos;espace de stockage.</p>
            </HelpCard>

            {isCreateur && (
              <HelpCard title="Permissions co-chefs pour les statistiques" badge={{ label: "Fondateur seulement", color: "indigo" }}>
                <p>Par défaut, tous les <strong>co-chefs</strong> (chefs que vous avez nommés) ont accès aux statistiques. Vous pouvez restreindre cet accès depuis les paramètres de permissions en bas de la page du groupe :</p>
                <ol className="space-y-2 mt-2">
                  <Step n={1}>Accédez à la page du groupe.</Step>
                  <Step n={2}>Faites défiler jusqu&apos;à <strong>⚙️ Permissions des co-chefs</strong>.</Step>
                  <Step n={3}>Dans le module <strong>📊 Statistiques</strong>, désactivez l&apos;action <em>Consulter</em> pour que les co-chefs ne puissent plus y accéder.</Step>
                </ol>
                <Note>Ces restrictions ne s&apos;appliquent pas à vous en tant que <strong>fondateur</strong> du groupe.</Note>
              </HelpCard>
            )}

          </div>
        </section>

        {/* ─── ANNONCES ─── */}
        <section id="annonces">
          <SectionTitle icon="📢" title="Annonces" color="orange" tutorials={tf('feature_annonces')} />
          <div className="space-y-4">

            <HelpCard title="À quoi servent les annonces ?">
              <p>La section <strong>Annonces</strong> est un espace de petites annonces musicales ouvert à toute la communauté Sol au piano. Elle permet de :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: '🎵', label: 'Musicien cherche groupe', desc: 'Présentez votre profil et les styles recherchés' },
                  { icon: '🎸', label: 'Groupe cherche musicien', desc: 'Décrivez le poste à pourvoir dans votre formation' },
                  { icon: '🎹', label: 'Cours et leçons', desc: 'Proposez ou recherchez des cours de musique' },
                  { icon: '📦', label: 'Matériel', desc: 'Vendez ou échangez du matériel musical' },
                ].map((c) => (
                  <div key={c.label} className="flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <span className="text-xl leading-none mt-0.5 flex-shrink-0">{c.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-orange-800">{c.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Tip>Les catégories disponibles sont configurées par l&apos;administrateur et peuvent évoluer.</Tip>
            </HelpCard>

            <HelpCard title="Consulter les annonces">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Cliquez sur <strong>Annonces</strong> dans la barre de navigation latérale.</Step>
                <Step n={2}>Parcourez toutes les annonces ou <strong>filtrez par catégorie</strong> en cliquant sur les onglets en haut de la liste.</Step>
                <Step n={3}>Cliquez sur une annonce pour voir sa description complète, les coordonnées de contact et les éventuelles photos.</Step>
              </ol>
              <Tip>Les annonces les plus récentes apparaissent en premier. La localisation est indiquée quand l&apos;auteur l&apos;a renseignée — pratique pour trouver des musiciens proches de chez vous.</Tip>
            </HelpCard>

            <HelpCard title="Publier une annonce">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Cliquez sur <strong>Annonces</strong> puis sur <strong>+ Nouvelle annonce</strong>.</Step>
                <Step n={2}>Choisissez la <strong>catégorie</strong> correspondant à votre annonce.</Step>
                <Step n={3}>Renseignez le titre, la description détaillée et optionnellement : le prix, la localisation et une photo (max 5 Mo).</Step>
                <Step n={4}>Indiquez au moins un <strong>moyen de contact</strong> : e-mail et/ou numéro de téléphone.</Step>
                <Step n={5}>Cliquez sur <strong>Publier</strong> — votre annonce est envoyée en modération.</Step>
              </ol>
              <Note>Toute annonce est soumise à <strong>validation par l&apos;administrateur</strong> avant d&apos;apparaître publiquement. Vous recevez un e-mail de confirmation à la publication ou en cas de refus.</Note>
            </HelpCard>

            <HelpCard title="Gérer mes annonces">
              <p>La page <strong>Mes annonces</strong> (dans la sidebar) liste toutes vos annonces avec leur statut :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: 'En attente', color: 'bg-amber-50 border-amber-200 text-amber-700', desc: 'Soumise, en attente de validation' },
                  { label: 'Publiée', color: 'bg-green-50 border-green-200 text-green-700', desc: 'Visible par tous dans l\'annuaire' },
                  { label: 'Refusée', color: 'bg-red-50 border-red-200 text-red-700', desc: 'Non conforme aux règles — motif indiqué' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg border px-3 py-2 ${s.color}`}>
                    <p className="text-xs font-bold mb-0.5">{s.label}</p>
                    <p className="text-xs opacity-80">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-gray-600">Vous pouvez <strong>modifier ou supprimer</strong> une annonce à tout moment depuis cette page.</p>
              <Tip>Si une annonce est refusée, le motif est indiqué par l&apos;administrateur — vous pouvez la corriger et la soumettre à nouveau.</Tip>
            </HelpCard>

          </div>
        </section>

        {/* ─── CACHET GUSO ─── */}
        <section id="cachet-guso">
          <SectionTitle icon="💶" title="Estimation de cachet & frais de déplacement" color="green" tutorials={tf('tool_cachet')} />
          <div className="space-y-4">
            {isCreateur && (
              <HelpCard title="Lier une estimation à un concert" badge={{ label: "Chef seulement", color: "indigo" }}>
                <p>L&apos;outil <strong>Estimation de cachet</strong> (accessible depuis la navigation) permet de calculer le coût complet d&apos;un concert. En sauvegardant une simulation, vous pouvez l&apos;associer directement à un concert :</p>
                <ol className="space-y-2 mt-2">
                  <Step n={1}>Créez votre estimation dans l&apos;outil (<strong>cachet, frais de déplacement, péages, hébergement…</strong>).</Step>
                  <Step n={2}>Cliquez sur <strong>💾 Sauvegarder</strong>, nommez la simulation et choisissez le concert à lier dans le menu déroulant.</Step>
                  <Step n={3}>La simulation apparaît sur la carte du concert avec le résumé financier (coût employeur / net musiciens).</Step>
                </ol>
                <Note>La sauvegarde des simulations est réservée aux <strong>forfaits incluant du stockage</strong> (plan personnel ou plan du groupe). Pour les co-chefs, le fondateur contrôle chaque action séparément depuis <em>Permissions des co-chefs</em> : <strong>Créer</strong> (enregistrer une estimation), <strong>Sauvegarder</strong> (la lier à un concert), <strong>Modifier</strong> et <strong>Supprimer</strong>.</Note>
              </HelpCard>
            )}
            <HelpCard title="À quoi sert le simulateur cachet GUSO ?">
              <p>Le <strong>GUSO</strong> (Guichet Unique du Spectacle Occasionnel) est la plateforme obligatoire pour les employeurs occasionnels de spectacle vivant. Le simulateur vous aide à estimer :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <p className="text-sm font-bold text-orange-700 mb-1">🏢 Côté employeur</p>
                  <p className="text-xs text-gray-600">Combien vous coûtera réellement l&apos;artiste (brut + charges patronales + congés spectacles ~10 %).</p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <p className="text-sm font-bold text-green-700 mb-1">🎵 Côté artiste</p>
                  <p className="text-xs text-gray-600">Combien l&apos;artiste percevra réellement (brut − charges salariales ~22 %).</p>
                </div>
              </div>
            </HelpCard>
            <HelpCard title="Comment utiliser le simulateur">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Choisissez votre point de départ : <strong>salaire brut</strong>, <strong>budget employeur</strong> ou <strong>net artiste souhaité</strong>.</Step>
                <Step n={2}>Saisissez le montant — les trois valeurs se calculent automatiquement.</Step>
                <Step n={3}>Activez ou désactivez les <strong>congés spectacles</strong> (10,25 %) selon votre situation (spectacle vivant = activé par défaut).</Step>
                <Step n={4}>Cliquez sur <em>&quot;Voir le détail&quot;</em> pour afficher la ventilation complète des cotisations.</Step>
              </ol>
              <Tip>Le numéro GUSO de l&apos;artiste est à renseigner dans son <Link href="/profil" className="text-indigo-600 hover:underline font-medium">profil Sol au piano</Link> pour le retrouver facilement avant un contrat.</Tip>
              <Note>Les taux affichés sont indicatifs (spectacle vivant, CDU, 2025). Utilisez <a href="https://www.guso.fr" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">guso.fr</a> pour un calcul officiel.</Note>
            </HelpCard>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-indigo-800">Accéder au simulateur</p>
                <p className="text-xs text-indigo-600 mt-0.5">Disponible dans la barre de navigation → Cachet GUSO</p>
              </div>
              <Link href="/outils/cachet" className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                Ouvrir le simulateur →
              </Link>
            </div>
          </div>
        </section>

        {/* ─── BLOG ─── */}
        <section id="blog">
          <SectionTitle icon="📰" title="Blog" color="rose" tutorials={[]} />
          <div className="space-y-4">
            <HelpCard title="Lire, aimer, partager">
              <p>Le <strong>Blog</strong> (accessible depuis la barre latérale, et publiquement sur <strong>/blog</strong>) rassemble actualités, conseils de répétition, tutos et coulisses.</p>
              <ul className="mt-2 space-y-1">
                <li>📖 <strong>Lecture libre</strong> : les articles sont publics, classés par <strong>catégories</strong></li>
                <li>❤️ <strong>J&apos;aime</strong> : en tant que membre connecté, aimez vos articles préférés</li>
                <li>🔗 <strong>Partage</strong> : Facebook, X, WhatsApp, LinkedIn ou copier le lien</li>
              </ul>
            </HelpCard>
            {session?.user?.siteRole === 'ADMIN' && (
              <HelpCard title="Gérer le blog" badge={{ label: 'Admin', color: 'indigo' }}>
                <p>Depuis <strong>Admin → Blog</strong> : rédigez des articles (titre, image de couverture, contenu, résumé), gérez les <strong>catégories</strong> et leurs couleurs, et publiez en un clic (ou enregistrez en brouillon).</p>
              </HelpCard>
            )}
          </div>
        </section>

        {/* ─── PLANS ─── */}
        <section id="plans">
          <SectionTitle icon="📦" title="Plans et stockage" color="purple" />
          <div className="space-y-4">

            <HelpCard title="Plans de groupe">
              <p>Le plan est attaché à <strong>chaque groupe</strong> individuellement. Il détermine les fonctionnalités disponibles. Le quota de stockage, lui, est <strong>partagé entre tous vos groupes</strong> — ce n&apos;est pas un quota par groupe.</p>
              <div className={`mt-4 grid grid-cols-1 gap-3 ${dbPlans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                {dbPlans.map(p => (
                  <PlanDetailCard
                    key={p.key}
                    name={p.label}
                    icon={planIcon(p)}
                    storage={p.hasFileSubmissions ? storageLabel(p.storageGb) : '—'}
                    price={p.priceMonthly ? `${p.priceMonthly.toFixed(2).replace('.', ',')} €/mois` : 'Gratuit'}
                    groups={p.maxGroups === 1 ? '1 groupe' : `${p.maxGroups} groupes`}
                    color={p.color}
                    features={generateFeatureList(p)}
                  />
                ))}
              </div>
              <Note>Les quotas exacts (nombre de membres, morceaux, setlists…) sont visibles directement sur les cartes de plans depuis la page de votre groupe.</Note>
            </HelpCard>

            <HelpCard title="Stockage">
              <p>Le quota de stockage est <strong>partagé entre TOUS vos groupes</strong> — ce n&apos;est pas un quota par groupe. Si votre plan inclut 5 Go, ces 5 Go sont répartis librement entre l&apos;ensemble de vos groupes. Il comptabilise tous les fichiers attachés aux morceaux (partitions PDF, fichiers audio, images…).</p>
              <ul className="mt-3 space-y-1.5">
                {dbPlans.map(p => (
                  <li key={p.key}>
                    {planIcon(p)} <strong>Plan {p.label}</strong> —{' '}
                    {p.hasFileSubmissions ? `${storageLabel(p.storageGb)}${p.maxGroups > 1 ? ' partagés (tous groupes)' : ''}` : 'sans stockage de fichiers'}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-gray-600">Conseils pour économiser de l&apos;espace :</p>
              <ul className="mt-1 space-y-1">
                <li>Préférez les <strong>liens</strong> (YouTube, SoundCloud) aux fichiers audio — ils ne consomment pas de stockage</li>
                <li>Compressez vos PDFs avant de les uploader</li>
                <li>Supprimez les ressources obsolètes depuis la fiche du morceau</li>
              </ul>
              <Note>Quand le quota dépasse 90 %, un avertissement apparaît sur la page du groupe.</Note>
            </HelpCard>
          </div>
        </section>

        {/* ─── ASSISTANCE ─── */}
        <section id="assistance">
          <SectionTitle icon="🆘" title="Assistance & support" color="rose" />
          <div className="space-y-4">

            <HelpCard title="Contacter le support">
              <p>La page <strong>Assistance</strong> (dans la sidebar) vous permet de nous envoyer un message directement depuis l&apos;application — sans quitter Sol au piano.</p>
              <p className="mt-2">Quatre types de demandes sont disponibles :</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: '🐛', label: 'Bug', desc: 'Quelque chose ne fonctionne pas' },
                  { icon: '❓', label: 'Question', desc: 'Besoin d\'aide sur une fonctionnalité' },
                  { icon: '💡', label: 'Suggestion', desc: 'Idée d\'amélioration' },
                  { icon: '📩', label: 'Autre', desc: 'Toute autre demande' },
                ].map((t) => (
                  <div key={t.label} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-center">
                    <p className="text-xl mb-0.5">{t.icon}</p>
                    <p className="text-xs font-bold text-rose-700">{t.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                ))}
              </div>
            </HelpCard>

            <HelpCard title="Comment envoyer une demande">
              <ol className="space-y-2 mt-1">
                <Step n={1}>Cliquez sur <strong>Assistance</strong> dans la barre de navigation puis sur <strong>+ Nouvelle demande</strong>.</Step>
                <Step n={2}>Choisissez le <strong>type</strong> de demande (bug, question, suggestion, autre).</Step>
                <Step n={3}>Renseignez un <strong>sujet</strong> clair (1 phrase) et un <strong>message</strong> détaillé.</Step>
                <Step n={4}>Cliquez sur <strong>Envoyer la demande</strong>.</Step>
              </ol>
              <p className="mt-2 text-gray-600">Deux emails sont envoyés automatiquement : une <strong>notification à l&apos;équipe</strong> et une <strong>confirmation</strong> dans votre boîte mail avec le numéro de ticket.</p>
              <Tip>Pour un bug, précisez : ce que vous faisiez, ce qui s&apos;est passé, et le navigateur / appareil utilisé — cela accélère considérablement le diagnostic.</Tip>
            </HelpCard>

            <HelpCard title="Suivre mes demandes">
              <p>La page Assistance liste l&apos;historique de toutes vos demandes avec leur statut en temps réel :</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Ouvert', color: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500', desc: 'Reçue, en attente de traitement' },
                  { label: 'En cours', color: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500', desc: 'Prise en charge par l\'équipe' },
                  { label: 'Résolu', color: 'bg-green-50 border-green-200 text-green-700', dot: 'bg-green-500', desc: 'Traitement terminé' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg border px-3 py-2 ${s.color}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <p className="text-xs font-bold">{s.label}</p>
                    </div>
                    <p className="text-[10px] opacity-80">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-gray-600">Cliquez sur une demande pour voir son détail et lire la <strong>réponse de l&apos;équipe</strong> si elle a été ajoutée.</p>
            </HelpCard>

            <HelpCard title="Support prioritaire ⭐">
              <p>Si vous êtes chef d&apos;un groupe avec un <strong>plan payant</strong> (Pro ou Premium), vos demandes sont automatiquement marquées comme prioritaires. Cela signifie :</p>
              <ul className="mt-2 space-y-1">
                <li>Un badge <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">⭐ Prioritaire</span> apparaît sur votre ticket</li>
                <li>L&apos;email de notification envoyé à l&apos;équipe est distingué comme prioritaire</li>
                <li>Le délai de réponse est plus court</li>
              </ul>
              <Note>Le statut prioritaire est déterminé automatiquement selon votre plan — aucune action supplémentaire n&apos;est requise de votre part.</Note>
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
                {dbPlans.map((p, i) => (
                  <span key={p.key}>
                    {i > 0 && ', '}
                    Plan <strong>{p.label}</strong> : <strong>{p.maxGroups} groupe{p.maxGroups !== 1 ? 's' : ''}</strong>
                  </span>
                ))}.
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
            <FaqItem question="Comment créer une grille personnalisée par musicien ?">
              Utilisez le bouton <strong>Dupliquer</strong> (visible sur chaque carte de la liste des grilles). Vous obtenez une copie complète que vous pouvez renommer et annoter librement — par exemple une version &quot;Pianiste&quot;, une version &quot;Chanteur&quot;, etc. Chaque copie est totalement indépendante.
            </FaqItem>
            <FaqItem question="Les membres peuvent-ils voir les paroles sans être chef ?">
              Oui. Tous les membres du groupe ont accès à la lecture des paroles (onglet Aperçu) et au mode scène. Seul le chef peut saisir, modifier ou supprimer les paroles.
            </FaqItem>
            <FaqItem question="Le dictionnaire d'accords fonctionne-t-il hors ligne ?">
              Le dictionnaire est entièrement calculé côté navigateur — aucune requête serveur n&apos;est nécessaire. Une fois la page chargée, il fonctionne même sans connexion internet.
            </FaqItem>
            <FaqItem question="Puis-je voir les accords en solfège plutôt qu'en lettres ?">
              Oui, le dictionnaire affiche toujours les deux systèmes simultanément : les lettres anglo-saxonnes (C, D, E, F, G, A, B) et le solfège français (Do, Ré, Mi, Fa, Sol, La, Si) avec leurs altérations.
            </FaqItem>
            <FaqItem question="Quelle différence entre le dictionnaire d'accords et la portée musicale ?">
              Le <strong>dictionnaire d&apos;accords</strong> part du nom de l&apos;accord pour afficher ses notes sur un clavier de piano — utile pour apprendre une harmonie. La <strong>portée musicale</strong> fait l&apos;inverse : vous placez des notes sur une portée et l&apos;outil vous dit quel accord elles forment — utile pour analyser un passage ou vérifier une harmonie jouée.
            </FaqItem>
            <FaqItem question="Combien d'accords la portée peut-elle reconnaître ?">
              La portée reconnaît <strong>23 types d&apos;accords</strong> : triades (majeur, mineur, diminué, augmenté), suspendus (sus2, sus4), septièmes (dom7, maj7, m7, m7♭5, dim7…), sixtes, add9, et extensions (9, maj9, m9, 7sus4, 7sus2). Les renversements jusqu&apos;au 3e (pour les accords de 4 notes) sont également détectés.
            </FaqItem>
            <FaqItem question="Puis-je utiliser des doubles dièses ou doubles bémols sur la portée ?">
              Oui. Chaque note placée sur la portée supporte cinq altérations : ♮ naturel, ♯ dièse, 𝄪 double dièse, ♭ bémol et 𝄫 double bémol. Cliquez plusieurs fois sur la note pour cycler entre les altérations.
            </FaqItem>
            <FaqItem question="La portée musicale gère-t-elle la clef de Fa ?">
              Oui. Un bouton permet de basculer entre la clef de Sol (tréble — registre aigu) et la clef de Fa (basse — registre grave). Attention, changer de clef remet la portée à zéro pour éviter toute confusion de hauteur.
            </FaqItem>
            <FaqItem question="Un morceau peut-il avoir plusieurs tablatures ?">
              Non, chaque morceau dispose d&apos;une seule tablature. En revanche, vous pouvez changer l&apos;instrument (guitare, basse, ukulélé) à tout moment depuis la barre de contrôle. Si vous avez besoin de versions différentes, dupliquez le morceau dans le répertoire.
            </FaqItem>
            <FaqItem question="Les membres peuvent-ils consulter la tablature sans être chef ?">
              Oui. Tous les membres du groupe peuvent consulter la tablature en lecture seule et l&apos;imprimer. Seul le chef peut saisir, modifier ou réinitialiser les notes.
            </FaqItem>
            <FaqItem question="Puis-je saisir des techniques complexes comme les bends ou les slides ?">
              Oui. L&apos;éditeur accepte les notations courantes : <strong>h5</strong> (hammer-on case 5), <strong>p5</strong> (pull-off), <strong>/7</strong> et <strong>\7</strong> (slides montant/descendant), <strong>b9</strong> (bend vers la case 9), et <strong>x</strong> (corde étouffée). Chaque cellule accepte jusqu&apos;à 3 caractères.
            </FaqItem>
            <FaqItem question="Puis-je utiliser le mode scène sur mon téléphone ?">
              Oui, le mode scène est conçu pour fonctionner sur tous les écrans. Sur téléphone ou tablette, le texte est grand, le fond est sombre et le défilement tactile est fluide. Pensez à passer votre appareil en mode ne pas déranger avant de monter sur scène.
            </FaqItem>
            <FaqItem question="Mes ressources sont-elles visibles par tous les membres ?">
              Oui, toutes les ressources attachées à un morceau sont visibles par l&apos;ensemble des membres du groupe. Seul le chef peut en ajouter ou supprimer.
            </FaqItem>
            <FaqItem question="L'accordeur fonctionne-t-il avec tous les instruments ?">
              L&apos;accordeur détecte n&apos;importe quelle note entre 20 Hz et 1 400 Hz, ce qui couvre guitare, basse, voix et la plupart des instruments acoustiques. Les cordes de référence affichées sont celles de la guitare ou basse sélectionnée, mais la note détectée est toujours affichée quelle que soit la source.
            </FaqItem>
            <FaqItem question="Le métronome continue-t-il si je change d'onglet ?">
              Oui, le métronome utilise un scheduler audio avancé qui s&apos;exécute indépendamment de l&apos;affichage. Le son continue même si vous naviguez dans un autre onglet. En revanche, les indicateurs visuels ne s&apos;animent qu&apos;en premier plan.
            </FaqItem>
            <FaqItem question="Le plan de scène est-il spécifique à chaque concert ?">
              Oui. Chaque concert dispose de son propre plan de scène indépendant, ce qui permet d&apos;avoir des configurations différentes selon la salle ou la formation.
            </FaqItem>
            <FaqItem question="Puis-je partager la page publique de mon groupe sur les réseaux sociaux ?">
              Oui, il suffit de copier l&apos;URL (ex : solaupiano.fr/mon-groupe) et de la partager. La page est accessible à tous sans compte. Vous pouvez aussi renseigner vos liens Instagram, Facebook, YouTube, Spotify et site web dans l&apos;onglet Options de votre page.
            </FaqItem>
            <FaqItem question="La fiche technique est-elle la même pour tous les concerts ?">
              Oui, la fiche technique est attachée au groupe et non à un concert particulier — c&apos;est un document de référence réutilisable. Vous pouvez la mettre à jour avant chaque concert si nécessaire, puis regénérer un lien de partage.
            </FaqItem>
            <FaqItem question="Comment quitter un groupe ?">
              Depuis la page du groupe, section Membres, cliquez sur votre nom puis <strong>Quitter le groupe</strong>. Attention, si vous êtes le seul chef, vous devrez d&apos;abord promouvoir un autre membre.
            </FaqItem>
            <FaqItem question="Puis-je désactiver les rappels automatiques de répétition ?">
              Oui. Depuis votre page <strong>Profil</strong>, section <em>Notifications</em>, désactivez le toggle <em>Rappels de répétition automatiques</em>. Vous ne recevrez plus les emails de rappel 5 jours avant chaque répétition. Le chef peut toujours vous envoyer un rappel manuel depuis la fiche d&apos;une répétition.
            </FaqItem>
            <FaqItem question="Peut-on avoir plusieurs chefs dans un groupe ?">
              Oui. Le fondateur du groupe peut nommer autant de co-chefs qu&apos;il le souhaite depuis le panneau <strong>Membres</strong>. Il peut aussi configurer les permissions de chaque co-chef (quels modules il peut modifier) depuis la section <em>Permissions des co-chefs</em> en bas de la page du groupe. Cette fonctionnalité est disponible à partir du plan <strong>Pro</strong>.
            </FaqItem>
            <FaqItem question="Le stockage est-il partagé entre tous mes groupes ?">
              <strong>Oui — le quota de stockage est partagé entre TOUS vos groupes.</strong> Ce n&apos;est pas un quota par groupe : si votre plan inclut 5 Go, ces 5 Go sont communs à l&apos;ensemble de vos groupes. Par exemple, si vous avez 3 groupes et que le premier utilise 3 Go, il ne reste que 2 Go pour les deux autres. La barre de stockage visible sur chaque groupe affiche la consommation globale du compte.
            </FaqItem>
            <FaqItem question="Qui peut accéder aux statistiques du groupe ?">
              Seuls les <strong>chefs</strong> du groupe y ont accès (fondateur et co-chefs). Les membres simples ne voient pas les statistiques. De plus, le module nécessite un <strong>plan payant</strong> (Pro ou Premium). Le fondateur peut restreindre l&apos;accès aux co-chefs depuis les paramètres de permissions.
            </FaqItem>
            <FaqItem question="Les statistiques se mettent-elles à jour automatiquement ?">
              Oui. Les données sont calculées en temps réel à chaque ouverture de la page — aucun rafraîchissement manuel n&apos;est nécessaire.
            </FaqItem>
            <FaqItem question="Pourquoi le taux de présence d'un membre est-il affiché avec un tiret — ?">
              Le tiret signifie qu&apos;aucune présence n&apos;a encore été enregistrée pour ce membre (il n&apos;était invité à aucune répétition passée, ou les répétitions n&apos;ont pas de feuille de présence remplie).
            </FaqItem>
            <FaqItem question="Les répétitions passées sont-elles conservées ?">
              Oui, toutes les répétitions passées restent accessibles. Seules les répétitions futures sont mises en avant sur le tableau de bord et la page du groupe.
            </FaqItem>
            <FaqItem question="J'ai oublié mon mot de passe, que faire ?">
              Sur la page de connexion, cliquez sur <strong>&quot;Mot de passe oublié&quot;</strong>. Un lien de réinitialisation vous sera envoyé par e-mail.
            </FaqItem>
            <FaqItem question="Mon annonce n'apparaît pas dans la liste, pourquoi ?">
              Toute annonce passe par une <strong>validation manuelle</strong> avant d&apos;être publiée. Consultez la page <strong>Mes annonces</strong> pour voir le statut de la vôtre — si elle est &quot;En attente&quot;, elle sera traitée sous peu. En cas de refus, le motif est indiqué.
            </FaqItem>
            <FaqItem question="Comment modifier ou supprimer mon annonce ?">
              Depuis la page <strong>Mes annonces</strong>, cliquez sur votre annonce pour accéder aux boutons Modifier et Supprimer. Une annonce modifiée repasse en modération si elle était déjà publiée.
            </FaqItem>
            <FaqItem question="Comment signaler un bug ou contacter le support ?">
              Utilisez la page <strong>Assistance</strong> (dans la sidebar) pour envoyer une demande directement depuis l&apos;application. Vous recevrez un email de confirmation et pourrez suivre l&apos;état de votre ticket.
            </FaqItem>
            <FaqItem question="Quel est le délai de réponse du support ?">
              Nous traitons généralement les demandes sous <strong>24 à 48 heures</strong>. Les membres de groupes avec un plan <strong>Pro</strong> ou <strong>Premium</strong> bénéficient d&apos;un support prioritaire et d&apos;un délai plus court.
            </FaqItem>
          </div>
        </section>

        {/* Contact */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 text-center" id="contact">
          <p className="text-2xl mb-2">💬</p>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Vous ne trouvez pas votre réponse ?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Signalez un bug, posez une question ou faites une suggestion depuis la page Assistance.
          </p>
          {isLoggedIn ? (
            <Link href="/assistance"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              🆘 Ouvrir une demande →
            </Link>
          ) : (
            <p className="text-sm text-gray-600">
              <Link href="/connexion" className="text-indigo-600 hover:underline font-medium">Connectez-vous</Link>{' '}
              pour accéder à la page Assistance, ou écrivez-nous à{' '}
              <a href="mailto:contact@solaupiano.fr" className="text-indigo-600 hover:underline font-medium">contact@solaupiano.fr</a>.
            </p>
          )}
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

function SectionTitle({ icon, title, color, tutorials }: {
  icon: string; title: string; color: string
  tutorials?: { id: number; title: string; description: string | null; videoPath: string }[]
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    rose:   'border-rose-200 bg-rose-50 text-rose-700',
    teal:   'border-teal-200 bg-teal-50 text-teal-700',
    gray: 'border-gray-200 bg-gray-100 text-gray-700',
  }
  return (
    <>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-4 ${colors[color] || colors.gray}`}>
        <span className="text-2xl">{icon}</span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {tutorials && tutorials.length > 0 && (
        <SectionTutorials tutorials={tutorials} />
      )}
    </>
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
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    green: 'bg-green-100 text-green-700 border-green-200',
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

function ProgressPct({ percent }: { percent: number }) {
  const s =
    percent >= 100 ? { label: 'Maîtrisé', cls: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-500' }
    : percent >= 67 ? { label: 'Presque',   cls: 'bg-lime-50 text-lime-700 border-lime-200',   bar: 'bg-lime-500' }
    : percent >= 34 ? { label: 'En cours',  cls: 'bg-orange-50 text-orange-600 border-orange-200', bar: 'bg-orange-500' }
    : percent > 0   ? { label: 'Débuté',    cls: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' }
    :                 { label: 'À travailler', cls: 'bg-gray-50 text-gray-500 border-gray-200', bar: 'bg-gray-300' }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      <span className="relative inline-block h-1.5 w-12 overflow-hidden rounded-full bg-black/10">
        <span className={`absolute inset-y-0 left-0 rounded-full ${s.bar}`} style={{ width: `${percent}%` }} />
      </span>
      {percent}% · {s.label}
    </span>
  )
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
  const colors: Record<string, string> = {
    gray: 'border-gray-200', indigo: 'border-indigo-200', purple: 'border-purple-200',
    green: 'border-green-200', blue: 'border-blue-200', amber: 'border-amber-200', rose: 'border-rose-200',
  }
  const textColors: Record<string, string> = {
    gray: 'text-gray-700', indigo: 'text-indigo-700', purple: 'text-purple-700',
    green: 'text-green-700', blue: 'text-blue-700', amber: 'text-amber-700', rose: 'text-rose-700',
  }
  return (
    <div className={`rounded-xl border-2 ${colors[color] ?? 'border-gray-200'} bg-white p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-sm font-bold ${textColors[color] ?? 'text-gray-700'}`}>{name}</span>
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
