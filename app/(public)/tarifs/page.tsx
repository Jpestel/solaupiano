import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { generateFeatureList, getColorClasses, type DbPlan } from '@/lib/plans'

export const metadata = {
  title: 'Tarifs — Sol au piano',
  description: 'Découvrez les plans Sol au piano. Gratuit pour rejoindre un groupe, ou devenez chef d\'orchestre et créez votre groupe.',
}

export default async function TarifsPage() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  }) as DbPlan[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-lg">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/aide"
              className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Aide
            </Link>
            <Link
              href="/connexion"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Choisissez votre <span className="text-indigo-600">plan</span>
          </h1>
          <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
            Sol au piano est <strong>gratuit</strong> pour les musiciens qui souhaitent rejoindre un groupe.
            Les chefs d&apos;orchestre peuvent démarrer gratuitement ou opter pour un plan payant pour profiter de plus de fonctionnalités.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ── Section 1 : Profils utilisateur ── */}
        <section>
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 uppercase tracking-wide mb-2">
              Étape 1 — Votre profil
            </span>
            <h2 className="text-xl font-bold text-gray-900">Comment souhaitez-vous utiliser Sol au piano ?</h2>
            <p className="text-sm text-gray-500 mt-1">Choisissez votre rôle lors de l&apos;inscription. Vous pourrez le changer à tout moment.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Musicien */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🎵</span>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Musicien</p>
                  <span className="inline-block rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5 mt-0.5">
                    Gratuit · Toujours
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Rejoignez les groupes dont vous faites partie, consultez le répertoire, les répétitions et les concerts.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Rejoindre un ou plusieurs groupes</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Consulter répétitions, répertoire, concerts</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Suivi des présences</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Accéder aux ressources partagées par le groupe</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> <span className="text-gray-400">Créer ou gérer un groupe</span></li>
              </ul>
              <Link
                href="/inscription?role=MUSICIEN"
                className="mt-auto rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
              >
                S&apos;inscrire comme Musicien
              </Link>
            </div>

            {/* Chef d'orchestre */}
            <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wide">
                  Recommandé
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">🎼</span>
                <div>
                  <p className="font-bold text-indigo-900 text-lg">Chef d&apos;orchestre</p>
                  <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 mt-0.5">
                    Gratuit · Plan de groupe gratuit inclus
                  </span>
                </div>
              </div>
              <p className="text-sm text-indigo-700 leading-relaxed">
                Créez et gérez votre groupe de musique. Invitez vos membres, organisez vos répétitions et gérez votre répertoire.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Tout du plan Musicien</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> <strong>Créer et gérer 1 groupe</strong></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Inviter et gérer les membres <span className="text-gray-400 text-xs">(8 max)</span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Répertoire <span className="text-gray-400 text-xs">(15 morceaux max)</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> <span className="text-gray-400">Partage de fichiers / partitions</span></li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">↑</span> <span className="text-indigo-600 font-medium">Pro : upload de fichiers, 3 groupes, 5 Go</span></li>
              </ul>
              <Link
                href="/inscription?role=CREATEUR"
                className="mt-auto rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors text-center shadow-sm"
              >
                S&apos;inscrire comme Chef d&apos;orchestre
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 2 : Plans de groupe ── */}
        <section>
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 uppercase tracking-wide mb-2">
              Étape 2 (optionnelle) — Plan de votre groupe
            </span>
            <h2 className="text-xl font-bold text-gray-900">Plans pour chefs d&apos;orchestre</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ces plans s&apos;appliquent à votre groupe. Démarrez gratuitement, passez au Pro ou Premium à tout moment depuis votre profil.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const colors = getColorClasses(plan.color)
              const features = generateFeatureList(plan)
              const isPro = plan.key === 'PRO'
              const isPremium = plan.key === 'PREMIUM'
              const isHighlighted = isPremium

              return (
                <div
                  key={plan.key}
                  className={`rounded-2xl border-2 p-6 flex flex-col gap-4 ${colors.border} ${isHighlighted ? 'bg-purple-50 ring-2 ring-purple-300 ring-offset-1' : 'bg-white'} relative overflow-hidden`}
                >
                  {isHighlighted && (
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wide">
                        Populaire
                      </span>
                    </div>
                  )}

                  <div>
                    <p className={`font-bold text-lg ${colors.text}`}>{plan.label}</p>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{plan.description}</p>
                    )}
                  </div>

                  <div>
                    {plan.priceMonthly ? (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-extrabold ${colors.text}`}>
                          {plan.priceMonthly.toFixed(2).replace('.', ',')} €
                        </span>
                        <span className="text-sm text-gray-400">/ mois</span>
                      </div>
                    ) : (
                      <span className={`text-3xl font-extrabold ${colors.text}`}>Gratuit</span>
                    )}
                  </div>

                  {/* Storage highlight */}
                  {plan.storageGb > 0 ? (
                    <div className={`rounded-xl ${colors.bg} border ${colors.border} px-3 py-2 flex items-center gap-2`}>
                      <span className="text-lg">💾</span>
                      <div>
                        <p className={`text-xs font-bold ${colors.text}`}>{plan.storageGb} Go de stockage</p>
                        <p className="text-[11px] text-gray-400">Partagé entre tous vos groupes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 flex items-center gap-2">
                      <span className="text-lg">🚫</span>
                      <div>
                        <p className="text-xs font-bold text-gray-500">Pas d&apos;upload de fichiers</p>
                        <p className="text-[11px] text-gray-400">Disponible dès le plan Pro</p>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-1.5 text-sm text-gray-600 flex-1">
                    {features.filter(f => !f.includes('stockage')).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.priceMonthly ? `/inscription?role=CREATEUR` : `/inscription?role=CREATEUR`}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-center transition-colors mt-auto ${
                      isHighlighted
                        ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-sm'
                        : isPro
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.priceMonthly
                      ? `Démarrer avec ${plan.label}`
                      : 'Commencer gratuitement'}
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Les plans payants s&apos;appliquent au groupe (par le chef d&apos;orchestre). Pas d&apos;engagement — résiliable à tout moment.
          </p>
        </section>

        {/* ── Section 3 : Tableau comparatif ── */}
        <section>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Comparatif détaillé</h2>
            <p className="text-sm text-gray-500 mt-1">Tout ce qui est inclus dans chaque plan de groupe</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-5 py-4 font-semibold text-gray-700 w-1/3">Fonctionnalité</th>
                  {plans.map((plan) => {
                    const colors = getColorClasses(plan.color)
                    return (
                      <th key={plan.key} className={`text-center px-4 py-4 font-bold ${colors.text}`}>
                        {plan.label}
                        {plan.priceMonthly && (
                          <span className="block text-xs font-normal text-gray-400">
                            {plan.priceMonthly.toFixed(2).replace('.', ',')} €/mois
                          </span>
                        )}
                        {!plan.priceMonthly && (
                          <span className="block text-xs font-normal text-gray-400">Gratuit</span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <TableRow label="Groupes créés" values={plans.map(p => p.maxGroups === 1 ? '1 groupe' : `Jusqu'à ${p.maxGroups}`)} />
                <TableRow label="Upload de fichiers" values={plans.map(p => p.hasFileSubmissions ? '✓' : '—')} />
                <TableRow label="Stockage" values={plans.map(p => p.storageGb > 0 ? `${p.storageGb} Go` : '—')} />
                <TableRow label="Membres par groupe" values={plans.map(p => p.maxMembersPerGroup ? `${p.maxMembersPerGroup} max` : 'Illimité')} />
                <TableRow label="Morceaux au répertoire" values={plans.map(p => p.maxSongsPerGroup ? `${p.maxSongsPerGroup} max` : 'Illimité')} />
                <TableRow label="Répétitions" values={plans.map(() => 'Illimitées')} />
                <TableRow label="Grilles d'accords" values={plans.map(p => p.hasGrilles ? '✓' : '—')} />
                <TableRow label="Concerts" values={plans.map(p => p.hasConcerts ? '✓' : '—')} />
                <TableRow label="Setlists" values={plans.map(p => p.hasSetlists ? '✓' : '—')} />
                <TableRow label="Fiche technique" values={plans.map(p => p.hasFicheTechnique ? '✓' : '—')} />
                <TableRow label="Page publique" values={plans.map(p => p.hasMaPage ? '✓' : '—')} />
                <TableRow label="Co-chefs" values={plans.map(p => p.hasCoChefs ? '✓' : '—')} />
                <TableRow label="Support prioritaire" values={plans.map(p => p.hasPrioritySupport ? '✓' : '—')} />
                <TableRow label="Statistiques avancées" values={plans.map(p => p.hasStats ? '✓' : '—')} />
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            <FaqItem
              q="Je suis musicien dans un groupe, combien ça coûte ?"
              a="Rien du tout ! Le plan Musicien est gratuit pour toujours. Vous accédez à tout ce dont vous avez besoin pour participer à votre groupe."
            />
            <FaqItem
              q="Quelle est la différence entre le plan de l'utilisateur et le plan du groupe ?"
              a="Le plan utilisateur (Musicien / Chef d'orchestre) détermine si vous pouvez créer des groupes. Le plan du groupe (Gratuit / Pro / Premium) détermine les fonctionnalités disponibles pour ce groupe et la capacité de stockage. Les plans payants sont souscrits par le chef d'orchestre pour son groupe."
            />
            <FaqItem
              q="Le stockage est-il par groupe ou partagé ?"
              a="Le stockage est partagé entre tous vos groupes. Par exemple avec le plan Pro (5 Go), ce quota est réparti entre les 5 groupes que vous pouvez créer."
            />
            <FaqItem
              q="Puis-je changer de plan à tout moment ?"
              a="Oui. Vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis votre profil. Les changements prennent effet immédiatement."
            />
            <FaqItem
              q="Y a-t-il un engagement ou des frais cachés ?"
              a="Aucun engagement. Les plans payants sont mensuels et résiliables à tout moment. Pas de frais cachés."
            />
            <FaqItem
              q="Puis-je essayer sans carte bancaire ?"
              a="Oui ! Inscrivez-vous gratuitement, créez votre groupe avec le plan gratuit. Vous n'aurez besoin d'une carte bancaire que si vous décidez de passer en Pro ou Premium."
            />
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="rounded-2xl bg-indigo-600 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Prêt à commencer ?</h2>
          <p className="text-indigo-100 text-sm mb-6">
            L&apos;inscription est gratuite. Rejoignez des centaines de musiciens déjà sur la plateforme.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inscription"
              className="rounded-xl bg-white text-indigo-700 font-semibold px-8 py-3 text-sm hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Créer mon compte gratuitement
            </Link>
            <Link
              href="/connexion"
              className="rounded-xl border border-indigo-400 text-white font-semibold px-8 py-3 text-sm hover:bg-indigo-500 transition-colors"
            >
              Déjà inscrit ? Se connecter
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-xs">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-indigo-900">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic">du solo à l&apos;orchestre</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">La plateforme pour les musiciens en groupe</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/connexion" className="hover:text-indigo-600 transition-colors">Connexion</Link>
            <Link href="/inscription" className="hover:text-indigo-600 transition-colors">Inscription</Link>
            <Link href="/tarifs" className="hover:text-indigo-600 transition-colors font-medium text-indigo-600">Tarifs</Link>
            <Link href="/aide" className="hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/mentions-legales" className="hover:text-indigo-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TableRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-5 py-3 text-gray-600">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`text-center px-4 py-3 font-medium ${
            v === '✓' ? 'text-green-600' : v === '—' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="font-semibold text-gray-900 text-sm mb-2">{q}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
    </div>
  )
}
