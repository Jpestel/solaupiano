import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getColorClasses, type DbPlan } from '@/lib/plans'

export const metadata = {
  title: 'Tarifs — Sol au piano',
  description: 'Découvrez les 4 plans Sol au piano : Musicien gratuit, Chef gratuit, Pro et Premium.',
}

export default async function TarifsPage() {
  const groupPlans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  }) as DbPlan[]

  const freePlan = groupPlans.find(p => p.key === 'FREE')
  const proPlan  = groupPlans.find(p => p.key === 'PRO')
  const premPlan = groupPlans.find(p => p.key === 'PREMIUM')

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
            <Link href="/aide" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/connexion" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Se connecter</Link>
            <Link href="/inscription" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">S&apos;inscrire</Link>
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
            Musicien ou chef d&apos;orchestre, gratuit ou payant — chaque plan répond à un usage précis.
            Commencez gratuitement, évoluez quand vous en avez besoin.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14">

        {/* ── 4 plans ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* 1 — Musicien */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎵</span>
                  <p className="font-bold text-gray-900 text-lg">Musicien</p>
                </div>
                <span className="inline-block rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5">
                  Gratuit · Toujours
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Je rejoins les groupes dont je fais partie. Je n&apos;ai pas besoin de créer ou gérer un groupe.
              </p>
              <div className="text-3xl font-extrabold text-gray-700">Gratuit</div>
              <ul className="space-y-1.5 text-sm text-gray-600 flex-1">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Rejoindre des groupes</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Répétitions, répertoire, concerts</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Suivi des présences</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Consulter les ressources du groupe</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> <span className="text-gray-400">Créer un groupe</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> <span className="text-gray-400">Uploader des fichiers</span></li>
              </ul>
              <Link href="/inscription?role=MUSICIEN" className="mt-auto rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center">
                S&apos;inscrire comme Musicien
              </Link>
            </div>

            {/* 2 — Chef Gratuit */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎼</span>
                  <p className="font-bold text-gray-900 text-lg">Chef gratuit</p>
                </div>
                <span className="inline-block rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5">
                  Gratuit · Fonctionnalités limitées
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Je veux créer et gérer un groupe, organiser mes répétitions et mon répertoire.
              </p>
              <div className="text-3xl font-extrabold text-gray-700">Gratuit</div>
              <ul className="space-y-1.5 text-sm text-gray-600 flex-1">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Tout du plan Musicien</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> <strong>1 groupe</strong> à créer et gérer</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Jusqu&apos;à <strong>8 membres</strong></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Jusqu&apos;à <strong>15 morceaux</strong></li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> <span className="text-gray-400">Upload de fichiers / partitions</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> <span className="text-gray-400">Grilles, setlists, fiche technique…</span></li>
              </ul>
              <Link href="/inscription?role=CREATEUR" className="mt-auto rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center">
                Démarrer gratuitement
              </Link>
            </div>

            {/* 3 — Chef Pro */}
            {proPlan && (
              <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wide">Recommandé</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🚀</span>
                    <p className="font-bold text-indigo-900 text-lg">Chef Pro</p>
                  </div>
                  <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5">
                    Tout débloqué
                  </span>
                </div>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Je veux partager partitions et ressources avec mon groupe, sans limitation de membres.
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-indigo-700">{proPlan.priceMonthly?.toFixed(2).replace('.', ',')} €</span>
                  <span className="text-sm text-gray-400">/ mois</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-700 flex-1">
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Tout du plan Musicien</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Jusqu&apos;à <strong>{proPlan.maxGroups} groupes</strong></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Membres et morceaux <strong>illimités</strong></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> <strong>Upload de fichiers</strong> — {proPlan.storageGb} Go</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Grilles d&apos;accords, setlists, fiche technique</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Page publique, co-chefs</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Support prioritaire</li>
                </ul>
                <Link href="/inscription?role=CREATEUR" className="mt-auto rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors text-center shadow-sm">
                  Démarrer avec Pro
                </Link>
              </div>
            )}

            {/* 4 — Chef Premium */}
            {premPlan && (
              <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-6 flex flex-col gap-4 relative overflow-hidden">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">👑</span>
                    <p className="font-bold text-purple-900 text-lg">Chef Premium</p>
                  </div>
                  <span className="inline-block rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5">
                    Puissance maximale
                  </span>
                </div>
                <p className="text-sm text-purple-700 leading-relaxed">
                  Je gère plusieurs groupes, je veux les statistiques avancées et le stockage étendu.
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-purple-700">{premPlan.priceMonthly?.toFixed(2).replace('.', ',')} €</span>
                  <span className="text-sm text-gray-400">/ mois</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-700 flex-1">
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Tout du plan Pro</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Jusqu&apos;à <strong>{premPlan.maxGroups} groupes</strong></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> <strong>{premPlan.storageGb} Go</strong> de stockage</li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> <strong>Statistiques avancées</strong></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> Support prioritaire</li>
                </ul>
                <Link href="/inscription?role=CREATEUR" className="mt-auto rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors text-center shadow-sm">
                  Démarrer avec Premium
                </Link>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Pas d&apos;engagement. Plans payants résiliables à tout moment depuis votre profil.
          </p>
        </section>

        {/* ── Tableau comparatif ── */}
        <section>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Comparatif complet</h2>
            <p className="text-sm text-gray-500 mt-1">Toutes les fonctionnalités en un coup d&apos;œil</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-4 font-semibold text-gray-600">Fonctionnalité</th>
                  <th className="text-center px-3 py-4 font-bold text-gray-500">Musicien<span className="block text-xs font-normal text-gray-400">Gratuit</span></th>
                  <th className="text-center px-3 py-4 font-bold text-gray-500">Chef gratuit<span className="block text-xs font-normal text-gray-400">Gratuit</span></th>
                  <th className="text-center px-3 py-4 font-bold text-indigo-600">Chef Pro<span className="block text-xs font-normal text-gray-400">{proPlan?.priceMonthly?.toFixed(2).replace('.', ',')} €/mois</span></th>
                  <th className="text-center px-3 py-4 font-bold text-purple-600">Chef Premium<span className="block text-xs font-normal text-gray-400">{premPlan?.priceMonthly?.toFixed(2).replace('.', ',')} €/mois</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <CompRow label="Rejoindre des groupes"         values={['✓','✓','✓','✓']} />
                <CompRow label="Créer des groupes"             values={['—','1','3','5']} />
                <CompRow label="Membres par groupe"            values={['—','8 max','Illimité','Illimité']} />
                <CompRow label="Morceaux au répertoire"        values={['—','15 max','Illimité','Illimité']} />
                <CompRow label="Répétitions"                   values={['—','Illimitées','Illimitées','Illimitées']} />
                <CompRow label="Upload de fichiers"            values={['—','—','✓','✓']} />
                <CompRow label="Stockage"                      values={['—','—',`${proPlan?.storageGb} Go`,`${premPlan?.storageGb} Go`]} />
                <CompRow label="Grilles d'accords"             values={['—','—','✓','✓']} />
                <CompRow label="Concerts"                      values={['✓','✓','✓','✓']} />
                <CompRow label="Setlists"                      values={['—','—','✓','✓']} />
                <CompRow label="Fiche technique"               values={['—','—','✓','✓']} />
                <CompRow label="Page publique du groupe"       values={['—','—','✓','✓']} />
                <CompRow label="Co-chefs"                      values={['—','—','✓','✓']} />
                <CompRow label="Support prioritaire"           values={['—','—','✓','✓']} />
                <CompRow label="Statistiques avancées"         values={['—','—','—','✓']} />
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
              q="Quelle est la différence entre Musicien et Chef gratuit ?"
              a="Un Musicien peut uniquement rejoindre des groupes existants. Un Chef d'orchestre (même gratuit) peut créer et gérer son propre groupe. Dans les deux cas c'est gratuit, mais les usages sont différents."
            />
            <FaqItem
              q="Le plan Chef gratuit est-il vraiment limité ?"
              a="Oui. Sans abonnement payant, un groupe est limité à 8 membres, 15 morceaux, et surtout sans upload de fichiers (partitions, tablatures…). C'est suffisant pour démarrer et tester la plateforme, mais vite limité pour une utilisation réelle."
            />
            <FaqItem
              q="Pourquoi passer au plan Pro ?"
              a="Dès que vous voulez partager des fichiers avec votre groupe (partitions, tablatures, enregistrements), le plan Pro est indispensable. Il débloque aussi les membres illimités, les grilles d'accords, setlists, fiche technique et la page publique."
            />
            <FaqItem
              q="Le stockage est-il par groupe ou partagé ?"
              a="Le stockage est partagé entre tous vos groupes. Avec le plan Pro (5 Go), ce quota est réparti entre vos 3 groupes. Avec Premium (15 Go) pour vos 5 groupes."
            />
            <FaqItem
              q="Puis-je changer de plan à tout moment ?"
              a="Oui, depuis votre profil. Passage en Pro ou Premium immédiat. Résiliation sans frais ni pénalité."
            />
            <FaqItem
              q="Faut-il une carte bancaire pour s'inscrire ?"
              a="Non. L'inscription est 100% gratuite. Vous ne renseignez une carte bancaire que si vous choisissez un plan payant."
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl bg-indigo-600 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Prêt à commencer ?</h2>
          <p className="text-indigo-100 text-sm mb-6">
            L&apos;inscription est gratuite. Évoluez vers Pro ou Premium quand vous en avez besoin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/inscription" className="rounded-xl bg-white text-indigo-700 font-semibold px-8 py-3 text-sm hover:bg-indigo-50 transition-colors shadow-sm">
              Créer mon compte gratuitement
            </Link>
            <Link href="/connexion" className="rounded-xl border border-indigo-400 text-white font-semibold px-8 py-3 text-sm hover:bg-indigo-500 transition-colors">
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

function CompRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-5 py-3 text-gray-600">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-center px-3 py-3 font-medium ${
          v === '✓' ? 'text-green-600' : v === '—' ? 'text-gray-300' : 'text-gray-700'
        }`}>{v}</td>
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
