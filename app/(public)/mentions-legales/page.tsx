import Link from 'next/link'

export const metadata = {
  title: 'Mentions légales — Sol au piano',
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-lg">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mentions légales</h1>
        <p className="text-sm text-gray-400 mb-8">Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).</p>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3.5 mb-10">
          <p className="text-sm text-indigo-900 leading-relaxed">
            <strong>Sol au piano est un projet personnel, gratuit et sans but lucratif.</strong> Il est développé et
            mis à disposition par un particulier, sur son temps libre, pour ses connaissances et les musiciens
            qu&apos;elles invitent. L&apos;accès se fait uniquement sur invitation : aucun service n&apos;est vendu,
            aucun paiement n&apos;est demandé, et aucune publicité n&apos;est diffusée.
          </p>
        </div>

        <div className="space-y-10">

          {/* Éditeur */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">1. Éditeur du site</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Nom :</span> Jérôme Pestel</p>
              <p><span className="font-medium text-gray-800">Qualité :</span> Particulier, agissant à titre personnel et non professionnel</p>
              <p><span className="font-medium text-gray-800">Email :</span>{' '}
                <a href="mailto:jerompestel@gmail.com" className="text-indigo-600 hover:underline">jerompestel@gmail.com</a>
              </p>
              <p className="pt-1 text-gray-500 leading-relaxed">
                Le site n&apos;exerce aucune activité commerciale : il n&apos;est à ce titre immatriculé à aucun
                registre du commerce et n&apos;est assujetti à aucune TVA.
              </p>
            </div>
          </section>

          {/* Directeur de publication */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">2. Directeur de la publication</h2>
            <p className="text-sm text-gray-600">M. Jérôme Pestel</p>
          </section>

          {/* Hébergeur */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">3. Hébergement</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Hébergeur :</span> IONOS SE</p>
              <p><span className="font-medium text-gray-800">Adresse :</span> Elgendorfer Str. 57, 56410 Montabaur, Allemagne</p>
              <p><span className="font-medium text-gray-800">Site web :</span>{' '}
                <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.ionos.fr</a>
              </p>
            </div>
          </section>

          {/* Nature du service */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">4. Nature du service et gratuité</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sol au piano est mis à disposition <strong>gratuitement et sans contrepartie d&apos;aucune sorte</strong>.
              Aucun abonnement n&apos;est vendu, aucun moyen de paiement n&apos;est collecté, et l&apos;ensemble des
              fonctionnalités est ouvert aux personnes disposant d&apos;un accès.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Il s&apos;agit d&apos;un projet personnel, développé sur le temps libre de l&apos;éditeur et sans but
              lucratif. Il ne constitue pas un service professionnel : son fonctionnement est assuré au mieux des
              possibilités de l&apos;éditeur, sans engagement de disponibilité, de délai d&apos;intervention ni de
              pérennité. L&apos;éditeur se réserve la possibilité de faire évoluer, suspendre ou arrêter le service
              à tout moment, en informant raisonnablement les utilisateurs lorsque cela est possible.
            </p>
          </section>

          {/* Accès sur invitation */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">5. Conditions d&apos;accès</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              L&apos;accès à Sol au piano est <strong>réservé aux personnes invitées</strong>. La création d&apos;un
              compte n&apos;est pas ouverte au public et n&apos;est possible que dans l&apos;un des deux cas suivants :
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span>
                <span>
                  la personne a reçu une invitation d&apos;un chef d&apos;orchestre ou d&apos;un professeur
                  possédant déjà un groupe ou une classe sur la plateforme ; elle rejoint alors ce groupe ;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span>
                <span>
                  la personne a reçu une invitation directe de l&apos;éditeur.
                </span>
              </li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Toute autre personne souhaitant accéder au service doit en faire la demande auprès de l&apos;éditeur,
              depuis la page <Link href="/demander-acces" className="text-indigo-600 hover:underline">Demander un accès</Link>{' '}
              ou par email. L&apos;éditeur reste libre d&apos;accepter ou de refuser une demande, sans avoir à motiver
              sa décision, et de retirer un accès en cas d&apos;usage contraire aux présentes mentions.
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">6. Propriété intellectuelle</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              L&apos;ensemble des éléments constituant le site Sol au piano (textes, images, graphismes, logo, icônes,
              sons, logiciels…) est la propriété exclusive de Jérôme Pestel, à l&apos;exception des marques, logos ou
              contenus appartenant à des tiers.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Toute reproduction, distribution, modification, adaptation, retransmission ou publication, même
              partielle, de ces éléments est strictement interdite sans l&apos;accord exprès et écrit de Jérôme Pestel.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Les contenus déposés par les utilisateurs (morceaux, grilles d&apos;accords, partitions, fichiers audio,
              photographies…) restent la propriété de leurs auteurs ou ayants droit. Chaque utilisateur est seul
              responsable des contenus qu&apos;il dépose et s&apos;engage à ne mettre en ligne que des éléments dont il
              détient les droits ou dont l&apos;usage lui est autorisé. L&apos;éditeur peut retirer sans préavis tout
              contenu qui lui serait signalé comme illicite.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">7. Protection des données personnelles</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et
              Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression, de limitation et
              d&apos;opposition aux données personnelles vous concernant, ainsi que d&apos;un droit à la portabilité.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Les données collectées (nom, adresse email, et les informations que vous saisissez vous-même dans la
              plateforme) sont utilisées uniquement pour faire fonctionner le service. Elles ne sont ni vendues, ni
              louées, ni transmises à des tiers à des fins commerciales, et ne font l&apos;objet d&apos;aucun profilage
              ni d&apos;aucune décision automatisée.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Le traitement repose sur votre consentement, donné lors de la création de votre compte. Les données sont
              conservées tant que votre compte existe, et supprimées à sa fermeture. Les emails de service (invitations,
              rappels de répétition, résumés) sont envoyés via le prestataire Resend ; l&apos;hébergement des données
              est assuré par IONOS, au sein de l&apos;Union européenne.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Les actions effectuées dans un groupe (création, modification ou suppression d&apos;un élément, réponse à
              une répétition, arrivée ou départ d&apos;un membre…) sont enregistrées dans un journal d&apos;activité :
              auteur, nature de l&apos;action et date. Ce journal est consultable par les chefs du groupe concerné, afin
              de pouvoir s&apos;y retrouver en cas d&apos;erreur ou de modification inattendue. Il est conservé 12 mois,
              puis supprimé automatiquement.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Pour exercer vos droits, obtenir la suppression de votre compte ou poser toute question relative à vos
              données, écrivez à{' '}
              <a href="mailto:jerompestel@gmail.com" className="text-indigo-600 hover:underline">jerompestel@gmail.com</a>.
              Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">8. Cookies</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le site Sol au piano utilise des cookies de session strictement nécessaires au fonctionnement de
              l&apos;authentification. Ces cookies ne collectent aucune donnée à des fins publicitaires ou de traçage
              et ne nécessitent pas de consentement préalable, conformément aux recommandations de la CNIL.
            </p>
          </section>

          {/* Liens hypertextes */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">9. Liens hypertextes</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le site Sol au piano peut contenir des liens vers d&apos;autres sites. Jérôme Pestel n&apos;est pas
              responsable du contenu de ces sites tiers et décline toute responsabilité en cas de dommage résultant de
              leur consultation ou de leur utilisation.
            </p>
          </section>

          {/* Limitation de responsabilité */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">10. Limitation de responsabilité</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le service étant fourni gratuitement et à titre personnel, il est mis à disposition « en l&apos;état ».
              Jérôme Pestel s&apos;efforce d&apos;en assurer le bon fonctionnement et l&apos;exactitude des informations
              diffusées, sans pouvoir garantir leur exhaustivité ni leur actualité, ni l&apos;absence d&apos;interruption
              ou d&apos;erreur.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Il est recommandé à chaque utilisateur de conserver une copie personnelle des documents importants
              qu&apos;il dépose sur la plateforme. La responsabilité de l&apos;éditeur ne saurait être engagée en cas de
              perte de données, d&apos;indisponibilité du service ou de dommage résultant de son utilisation.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">11. Droit applicable</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Les présentes mentions légales sont soumises au droit français. En cas de litige, et à défaut de
              résolution amiable, les tribunaux français seront seuls compétents.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Dernière mise à jour : octobre 2026</p>
          <Link href="/" className="text-xs text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
        </div>
      </main>
    </div>
  )
}
