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
            <span className="font-bold text-indigo-900 text-lg">Sol au piano</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mentions légales</h1>
        <p className="text-sm text-gray-400 mb-10">Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).</p>

        <div className="space-y-10">

          {/* Éditeur */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">1. Éditeur du site</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Nom :</span> Pestel Jérôme</p>
              <p><span className="font-medium text-gray-800">Qualité :</span> Particulier</p>
              <p><span className="font-medium text-gray-800">Email :</span>{' '}
                <a href="mailto:jerompestel@gmail.com" className="text-indigo-600 hover:underline">jerompestel@gmail.com</a>
              </p>
            </div>
          </section>

          {/* Directeur de publication */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">2. Directeur de la publication</h2>
            <p className="text-sm text-gray-600">Pestel Jérôme</p>
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

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">4. Propriété intellectuelle</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              L&apos;ensemble des contenus présents sur le site Sol au piano (textes, images, graphismes, logo, icônes, sons, logiciels…) est la propriété exclusive de Jérôme Pestel, à l&apos;exception des marques, logos ou contenus appartenant à d&apos;autres sociétés partenaires ou auteurs.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Toute reproduction, distribution, modification, adaptation, retransmission ou publication, même partielle, de ces différents éléments est strictement interdite sans l&apos;accord exprès par écrit de Jérôme Pestel.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">5. Protection des données personnelles</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et d&apos;opposition aux données personnelles vous concernant.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Les données collectées (nom, adresse email) sont utilisées uniquement dans le cadre du fonctionnement de la plateforme Sol au piano et ne sont pas transmises à des tiers.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Pour exercer vos droits ou pour toute question relative à la protection de vos données, vous pouvez contacter l&apos;éditeur à l&apos;adresse email indiquée ci-dessus.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">6. Cookies</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le site Sol au piano utilise des cookies de session strictement nécessaires au fonctionnement de l&apos;authentification. Ces cookies ne collectent aucune donnée à des fins publicitaires ou de traçage et ne nécessitent pas de consentement préalable conformément aux directives de la CNIL.
            </p>
          </section>

          {/* Liens hypertextes */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">7. Liens hypertextes</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le site Sol au piano peut contenir des liens hypertextes vers d&apos;autres sites. Jérôme Pestel n&apos;est pas responsable du contenu de ces sites tiers et décline toute responsabilité en cas de dommage résultant de l&apos;utilisation de ces liens.
            </p>
          </section>

          {/* Limitation de responsabilité */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">8. Limitation de responsabilité</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Jérôme Pestel s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, il ne peut garantir l&apos;exactitude, la complétude et l&apos;actualité des informations. En conséquence, l&apos;utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">9. Droit applicable</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Dernière mise à jour : mai 2026</p>
          <Link href="/" className="text-xs text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
        </div>
      </main>
    </div>
  )
}
