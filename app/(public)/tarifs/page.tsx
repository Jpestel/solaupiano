import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { DbPlan } from '@/lib/plans'

// Force dynamic so prices always reflect the DB (never pre-rendered at build time)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tarifs — Sol au piano',
  description: 'Découvrez les 4 plans Sol au piano : Musicien gratuit, Chef gratuit, Pro et Premium.',
}

function fmt(price: number | null | undefined) {
  if (!price) return 'Gratuit'
  return `${price.toFixed(2).replace('.', ',')} €`
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-base">🎹</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-base">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/aide" className="hidden md:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/connexion" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Se connecter</Link>
            <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Choisissez votre <span className="text-indigo-600">plan</span>
          </h1>
          <p className="mt-3 text-gray-500 text-sm sm:text-lg leading-relaxed">
            Musicien ou chef d&apos;orchestre, gratuit ou payant — commencez gratuitement, évoluez quand vous en avez besoin.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── 4 plans ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* 1 — Musicien */}
            <PlanCard
              emoji="🎵"
              title="Musicien"
              badge="Gratuit · Toujours"
              badgeColor="gray"
              description="Je rejoins les groupes dont je fais partie. Je n'ai pas besoin de créer un groupe."
              price="Gratuit"
              features={[
                { ok: true,  label: 'Rejoindre des groupes' },
                { ok: true,  label: 'Répétitions, répertoire, concerts' },
                { ok: true,  label: 'Suivi des présences' },
                { ok: true,  label: 'Consulter les ressources du groupe' },
                { ok: false, label: 'Créer un groupe' },
                { ok: false, label: 'Uploader des fichiers' },
              ]}
              cta="S'inscrire comme Musicien"
              href="/inscription?role=MUSICIEN"
              variant="default"
            />

            {/* 2 — Chef gratuit */}
            <PlanCard
              emoji="🎼"
              title="Chef gratuit"
              badge="Gratuit · Limité"
              badgeColor="gray"
              description="Je crée mon groupe, j'organise mes répétitions et mon répertoire. Sans partage de fichiers."
              price="Gratuit"
              features={[
                { ok: true,  label: 'Tout du plan Musicien' },
                { ok: true,  label: '1 groupe à créer et gérer' },
                { ok: true,  label: 'Jusqu\'à 8 membres' },
                { ok: true,  label: 'Jusqu\'à 15 morceaux' },
                { ok: false, label: 'Upload de fichiers / partitions' },
                { ok: false, label: 'Grilles, setlists, fiche technique…' },
              ]}
              cta="Démarrer gratuitement"
              href="/inscription?role=CREATEUR"
              variant="default"
            />

            {/* 3 — Chef Pro */}
            {proPlan && (
              <PlanCard
                emoji="🚀"
                title="Chef Pro"
                badge="Tout débloqué"
                badgeColor="indigo"
                description="Je veux partager partitions et ressources avec mon groupe, sans limitation de membres."
                price={proPlan.priceMonthly ? `${fmt(proPlan.priceMonthly)} / mois` : 'Gratuit'}
                features={[
                  { ok: true, label: 'Tout du plan Musicien' },
                  { ok: true, label: `Jusqu'à ${proPlan.maxGroups} groupes` },
                  { ok: true, label: 'Membres et morceaux illimités' },
                  { ok: true, label: `Upload fichiers — ${proPlan.storageGb} Go` },
                  { ok: true, label: 'Grilles, setlists, fiche technique' },
                  { ok: true, label: 'Page publique, co-chefs, support prioritaire' },
                ]}
                cta="Démarrer avec Pro"
                href="/inscription?role=CREATEUR"
                variant="indigo"
                highlight
              />
            )}

            {/* 4 — Chef Premium */}
            {premPlan && (
              <PlanCard
                emoji="👑"
                title="Chef Premium"
                badge="Puissance maximale"
                badgeColor="purple"
                description="Je gère plusieurs groupes et veux les statistiques avancées avec plus de stockage."
                price={premPlan.priceMonthly ? `${fmt(premPlan.priceMonthly)} / mois` : 'Gratuit'}
                features={[
                  { ok: true, label: 'Tout du plan Pro' },
                  { ok: true, label: `Jusqu'à ${premPlan.maxGroups} groupes` },
                  { ok: true, label: `${premPlan.storageGb} Go de stockage` },
                  { ok: true, label: 'Statistiques avancées' },
                  { ok: true, label: 'Support prioritaire' },
                ]}
                cta="Démarrer avec Premium"
                href="/inscription?role=CREATEUR"
                variant="purple"
              />
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Pas d&apos;engagement. Plans payants résiliables à tout moment depuis votre profil.
          </p>
        </section>

        {/* ── Tableau comparatif (mobile: scroll horizontal) ── */}
        <section>
          <div className="mb-5 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Comparatif complet</h2>
            <p className="text-sm text-gray-500 mt-1">Toutes les fonctionnalités en un coup d&apos;œil</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <div className="min-w-[560px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[38%]">Fonctionnalité</th>
                    <th className="text-center px-2 py-3 font-semibold text-gray-500 text-xs">
                      🎵 Musicien<span className="block font-normal text-gray-400">Gratuit</span>
                    </th>
                    <th className="text-center px-2 py-3 font-semibold text-gray-500 text-xs">
                      🎼 Chef gratuit<span className="block font-normal text-gray-400">Gratuit</span>
                    </th>
                    <th className="text-center px-2 py-3 font-semibold text-indigo-600 text-xs">
                      🚀 Chef Pro<span className="block font-normal text-gray-400">{fmt(proPlan?.priceMonthly)}/mois</span>
                    </th>
                    <th className="text-center px-2 py-3 font-semibold text-purple-600 text-xs">
                      👑 Chef Premium<span className="block font-normal text-gray-400">{fmt(premPlan?.priceMonthly)}/mois</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <CompRow label="Rejoindre des groupes"    values={['✓','✓','✓','✓']} />
                  <CompRow label="Créer des groupes"        values={['—','1','3','5']} />
                  <CompRow label="Membres / groupe"         values={['—','8 max','Illimité','Illimité']} />
                  <CompRow label="Morceaux / groupe"        values={['—','15 max','Illimité','Illimité']} />
                  <CompRow label="Répétitions"              values={['—','Illimitées','Illimitées','Illimitées']} />
                  <CompRow label="Upload de fichiers"       values={['—','—','✓','✓']} />
                  <CompRow label="Stockage"                 values={['—','—',`${proPlan?.storageGb} Go`,`${premPlan?.storageGb} Go`]} />
                  <CompRow label="Grilles d'accords"        values={['—','—','✓','✓']} />
                  <CompRow label="Concerts"                 values={['✓','✓','✓','✓']} />
                  <CompRow label="Setlists"                 values={['—','—','✓','✓']} />
                  <CompRow label="Fiche technique"          values={['—','—','✓','✓']} />
                  <CompRow label="Page publique"            values={['—','—','✓','✓']} />
                  <CompRow label="Co-chefs"                 values={['—','—','✓','✓']} />
                  <CompRow label="Support prioritaire"      values={['—','—','✓','✓']} />
                  <CompRow label="Statistiques avancées"    values={['—','—','—','✓']} />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto">
          <div className="mb-5 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            <FaqItem q="Quelle différence entre Musicien et Chef gratuit ?" a="Un Musicien peut uniquement rejoindre des groupes existants. Un Chef d'orchestre (même gratuit) peut créer et gérer son propre groupe. Dans les deux cas c'est gratuit, mais les usages sont différents." />
            <FaqItem q="Le plan Chef gratuit est-il vraiment limité ?" a="Oui. Sans abonnement payant, un groupe est limité à 8 membres, 15 morceaux, et sans upload de fichiers (partitions, tablatures…). C'est suffisant pour tester la plateforme, mais vite limité pour une utilisation réelle." />
            <FaqItem q="Pourquoi passer au plan Pro ?" a="Dès que vous voulez partager des fichiers avec votre groupe, le plan Pro est indispensable. Il débloque aussi les membres illimités, les grilles d'accords, setlists, fiche technique et la page publique." />
            <FaqItem q="Le stockage est-il par groupe ou partagé ?" a="Le stockage est partagé entre tous vos groupes. Avec le plan Pro, ce quota est réparti entre vos 3 groupes. Avec Premium pour vos 5 groupes." />
            <FaqItem q="Puis-je changer de plan à tout moment ?" a="Oui, depuis votre profil. Passage en Pro ou Premium immédiat. Résiliation sans frais ni pénalité." />
            <FaqItem q="Faut-il une carte bancaire pour s'inscrire ?" a="Non. L'inscription est 100% gratuite. Vous ne renseignez une carte bancaire que si vous choisissez un plan payant." />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl bg-indigo-600 px-5 py-8 sm:py-10 text-center text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Prêt à commencer ?</h2>
          <p className="text-indigo-100 text-sm mb-5">
            L&apos;inscription est gratuite. Évoluez vers Pro ou Premium quand vous en avez besoin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/inscription" className="rounded-xl bg-white text-indigo-700 font-semibold px-6 py-3 text-sm hover:bg-indigo-50 transition-colors shadow-sm">
              Créer mon compte gratuitement
            </Link>
            <Link href="/connexion" className="rounded-xl border border-indigo-400 text-white font-semibold px-6 py-3 text-sm hover:bg-indigo-500 transition-colors">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-xs">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-indigo-900">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic">du solo à l&apos;orchestre</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <Link href="/connexion" className="hover:text-indigo-600 transition-colors">Connexion</Link>
            <Link href="/inscription" className="hover:text-indigo-600 transition-colors">Inscription</Link>
            <Link href="/tarifs" className="font-medium text-indigo-600">Tarifs</Link>
            <Link href="/aide" className="hover:text-indigo-600 transition-colors">Aide</Link>
            <Link href="/mentions-legales" className="hover:text-indigo-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Composants ──────────────────────────────────────────────────────────────

interface Feature { ok: boolean; label: string }

function PlanCard({
  emoji, title, badge, badgeColor, description, price, features, cta, href, variant, highlight,
}: {
  emoji: string; title: string; badge: string; badgeColor: 'gray'|'indigo'|'purple'
  description: string; price: string; features: Feature[]; cta: string; href: string
  variant: 'default'|'indigo'|'purple'; highlight?: boolean
}) {
  const border = variant === 'indigo' ? 'border-indigo-300' : variant === 'purple' ? 'border-purple-300' : 'border-gray-200'
  const bg     = variant === 'indigo' ? 'bg-indigo-50'     : variant === 'purple' ? 'bg-purple-50'     : 'bg-white'
  const ring   = highlight ? 'ring-2 ring-indigo-300 ring-offset-1' : ''
  const badgeCls =
    badgeColor === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
    badgeColor === 'purple' ? 'bg-purple-100 text-purple-700' :
    'bg-gray-100 text-gray-600'
  const titleCls = variant === 'indigo' ? 'text-indigo-900' : variant === 'purple' ? 'text-purple-900' : 'text-gray-900'
  const priceCls = variant === 'indigo' ? 'text-indigo-700' : variant === 'purple' ? 'text-purple-700' : 'text-gray-700'
  const btnCls   =
    variant === 'indigo' ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm' :
    variant === 'purple' ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-sm' :
    'border border-gray-300 text-gray-700 hover:bg-gray-50'

  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} ${ring} p-5 flex flex-col gap-3 relative overflow-hidden`}>
      {highlight && (
        <div className="absolute top-3 right-3">
          <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">Recommandé</span>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{emoji}</span>
          <p className={`font-bold text-base ${titleCls}`}>{title}</p>
        </div>
        <span className={`inline-block rounded-full text-xs font-semibold px-2.5 py-0.5 ${badgeCls}`}>{badge}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      <p className={`text-2xl font-extrabold ${priceCls}`}>{price}</p>
      <ul className="space-y-1.5 text-xs text-gray-600 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className={`mt-0.5 flex-shrink-0 ${f.ok ? 'text-green-500' : 'text-red-400'}`}>{f.ok ? '✓' : '✗'}</span>
            <span className={f.ok ? '' : 'text-gray-400'}>{f.label}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-center transition-colors ${btnCls}`}>
        {cta}
      </Link>
    </div>
  )
}

function CompRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-gray-600 text-xs">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-center px-2 py-2.5 text-xs font-medium ${
          v === '✓' ? 'text-green-600' : v === '—' ? 'text-gray-300' : 'text-gray-700'
        }`}>{v}</td>
      ))}
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900 text-sm mb-1.5">{q}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
    </div>
  )
}
