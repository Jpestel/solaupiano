import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { DbPlan } from '@/lib/plans'
import {
  buildCardFeatures,
  planIcon,
  storageLabel,
  COMP_ROWS,
  COLOR_MAP,
  type PlanFeatureRow,
} from '@/lib/plans'
import { MODULES } from '@/lib/modules'

// Force dynamic so prices always reflect the DB (never pre-rendered at build time)
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tarifs — Sol au piano',
  description: 'Découvrez les plans Sol au piano et choisissez celui qui vous convient.',
}

function fmtPrice(price: number | null | undefined) {
  if (!price) return 'Gratuit'
  return `${price.toFixed(2).replace('.', ',')} €`
}

function fmtPriceLabel(price: number | null | undefined) {
  if (!price) return 'Gratuit'
  return `${price.toFixed(2).replace('.', ',')} €/mois`
}

export default async function TarifsPage() {
  const [groupPlans, allModuleAccess, session] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }) as Promise<DbPlan[]>,
    prisma.moduleAccess.findMany(),
    getServerSession(authOptions),
  ])
  const isLoggedIn = !!session

  // Helper — default: enabled if no explicit record
  const isModEnabled = (planKey: string, moduleKey: string): boolean => {
    const rec = allModuleAccess.find(r => r.planKey === planKey && r.moduleKey === moduleKey)
    return rec !== undefined ? rec.enabled : true
  }

  // Build module data for a plan card
  const planModules = (planKey: string) =>
    MODULES.map(m => ({ key: m.key, label: m.label, icon: m.icon, enabled: isModEnabled(planKey, m.key) }))

  // Find the free plan for FAQ dynamic text
  const freePlan = groupPlans.find(p => p.key === 'FREE') ?? groupPlans[0]

  // First paid plan gets the "Recommandé" badge
  const firstPaidIdx = groupPlans.findIndex(p => p.priceMonthly !== null)

  // FAQ dynamic helpers
  const freeMaxMembers = freePlan?.maxMembersPerGroup
  const freeMaxSongs   = freePlan?.maxSongsPerGroup
  const freeHasFiles   = freePlan?.hasFileSubmissions ?? false

  const freeDesc = [
    freeMaxMembers ? `${freeMaxMembers} membres max` : null,
    freeMaxSongs   ? `${freeMaxSongs} morceaux max` : null,
    !freeHasFiles  ? 'sans upload de fichiers' : null,
  ].filter(Boolean).join(', ')

  const paidPlans = groupPlans.filter(p => p.priceMonthly !== null)
  const proWorthText = paidPlans[0]
    ? `Le plan ${paidPlans[0].label} débloque ${[
        paidPlans[0].hasFileSubmissions ? `l'upload de fichiers (${storageLabel(paidPlans[0].storageGb)})` : null,
        paidPlans[0].maxMembersPerGroup === null ? 'les membres illimités' : null,
        paidPlans[0].hasGrilles ? "les grilles d'accords" : null,
        paidPlans[0].hasSetlists ? 'les setlists' : null,
        paidPlans[0].hasFicheTechnique ? 'la fiche technique' : null,
      ].filter(Boolean).join(', ')}.`
    : 'Le plan payant débloque toutes les fonctionnalités avancées.'

  const storagePerGroup = groupPlans.some(p => p.hasFileSubmissions)
  const storageText = storagePerGroup
    ? `Le quota de stockage est partagé entre TOUS vos groupes — ce n'est pas un quota par groupe. ${paidPlans.map(p => `Plan ${p.label} : ${storageLabel(p.storageGb)} au total pour l'ensemble de vos groupes`).join('. ')}.`
    : 'Le stockage de fichiers est disponible sur les plans payants.'

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
            {isLoggedIn ? (
              <Link href="/tableau-de-bord" className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                ← Tableau de bord
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Se connecter</Link>
                <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap">
                  S&apos;inscrire
                </Link>
              </>
            )}
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
            Un seul compte qui fait tout. Les plans changent seulement les limites (groupes, stockage) — commencez gratuitement, évoluez quand vous en avez besoin.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── Plan cards ── */}
        <section>
          <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-${Math.min(groupPlans.length, 4)} gap-4`}>

            {/* Un compte unique : une carte par plan (les limites varient, pas le type de compte). */}
            {groupPlans.map((plan, idx) => {
              const isFree = plan.priceMonthly === null
              const isHighlighted = idx === firstPaidIdx
              const color = plan.color as keyof typeof COLOR_MAP
              const variant: 'default' | 'indigo' | 'purple' | string =
                color === 'indigo' ? 'indigo' :
                color === 'purple' ? 'purple' :
                isFree ? 'default' : 'indigo'

              return (
                <PlanCard
                  key={plan.id}
                  emoji={planIcon(plan)}
                  title={plan.label}
                  badge={isFree ? 'Gratuit · Limité' : plan.label === 'Pro' ? 'Tout débloqué' : plan.description ?? plan.label}
                  badgeColor={isFree ? 'gray' : color === 'purple' ? 'purple' : 'indigo'}
                  description={plan.description ?? `Plan ${plan.label}.`}
                  price={isFree ? 'Gratuit' : `${fmtPrice(plan.priceMonthly)} / mois`}
                  features={buildCardFeatures(plan, isFree)}
                  modulesData={planModules(plan.key)}
                  cta={isFree ? 'Démarrer gratuitement' : `Démarrer avec ${plan.label}`}
                  href="/inscription"
                  variant={variant as 'default' | 'indigo' | 'purple'}
                  highlight={isHighlighted}
                  planColor={color}
                />
              )
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Pas d&apos;engagement. Plans payants résiliables à tout moment depuis votre profil.
          </p>
        </section>

        {/* ── Tableau comparatif (entièrement dynamique) ── */}
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
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[35%]">Fonctionnalité</th>
                    {/* Une colonne par plan */}
                    {groupPlans.map((plan) => {
                      const c = COLOR_MAP[plan.color] ?? COLOR_MAP.gray
                      return (
                        <th key={plan.id} className={`text-center px-2 py-3 font-semibold text-xs ${c.text}`}>
                          {planIcon(plan)} {plan.label}
                          <span className="block font-normal text-gray-400">{fmtPriceLabel(plan.priceMonthly)}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMP_ROWS.map(row => (
                    <CompRow
                      key={row.label}
                      label={row.label}
                      values={[...groupPlans.map(p => row.get(p))]}
                    />
                  ))}
                  {/* ─── Outils & modules ─── */}
                  <tr>
                    <td colSpan={groupPlans.length + 1} className="px-4 pt-3 pb-1.5 bg-indigo-50 border-t-2 border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">🛠 Outils &amp; modules</span>
                    </td>
                  </tr>
                  {MODULES.map(m => (
                    <CompRow
                      key={m.key}
                      label={`${m.icon} ${m.label}`}
                      values={[...groupPlans.map(p => isModEnabled(p.key, m.key) ? '✓' : '—')]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ (textes clés dynamiques) ── */}
        <section className="max-w-2xl mx-auto">
          <div className="mb-5 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            <FaqItem
              q="Y a-t-il plusieurs types de compte ?"
              a="Non. Il n'existe qu'un seul type de compte, qui sait tout faire : jouer en solo, rejoindre des groupes, créer et gérer son propre groupe, enseigner ou suivre des cours. Les plans (Gratuit, Pro, Premium) ne changent que les limites — nombre de groupes/classes gérables et espace de stockage."
            />
            <FaqItem
              q="Le plan gratuit est-il vraiment limité ?"
              a={freeDesc
                ? `Oui. Sans abonnement payant, un groupe est limité (${freeDesc}). C'est suffisant pour tester la plateforme, mais vite limité pour une utilisation réelle.`
                : "Le plan gratuit vous permet de tester la plateforme avec votre groupe. Passez à un plan payant pour débloquer toutes les fonctionnalités."}
            />
            <FaqItem
              q={paidPlans[0] ? `Pourquoi passer au plan ${paidPlans[0].label} ?` : 'Pourquoi passer à un plan payant ?'}
              a={proWorthText}
            />
            <FaqItem
              q="Le stockage est-il par groupe ou partagé ?"
              a={storageText}
            />
            <FaqItem
              q="Puis-je changer de plan à tout moment ?"
              a="Oui, depuis votre profil. Passage en plan payant immédiat. Résiliation sans frais ni pénalité."
            />
            <FaqItem
              q="Faut-il une carte bancaire pour s'inscrire ?"
              a="Non. L'inscription est 100% gratuite. Vous ne renseignez une carte bancaire que si vous choisissez un plan payant."
            />
            {groupPlans.length > 1 && (
              <FaqItem
                q="Comment choisir entre les différents plans payants ?"
                a={groupPlans
                  .filter(p => p.priceMonthly !== null)
                  .map(p => `${p.label} (${fmtPriceLabel(p.priceMonthly)}) — ${p.description ?? p.label}`)
                  .join('. ')}
              />
            )}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl bg-indigo-600 px-5 py-8 sm:py-10 text-center text-white">
          {isLoggedIn ? (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Besoin de plus ?</h2>
              <p className="text-indigo-100 text-sm mb-5">
                Pour changer le plan d&apos;un groupe, ouvrez-le et choisissez votre formule dans la section « Plans &amp; tarifs ».
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/groupes" className="rounded-xl bg-white text-indigo-700 font-semibold px-6 py-3 text-sm hover:bg-indigo-50 transition-colors shadow-sm">
                  Mes groupes
                </Link>
                <Link href="/tableau-de-bord" className="rounded-xl border border-indigo-400 text-white font-semibold px-6 py-3 text-sm hover:bg-indigo-500 transition-colors">
                  ← Tableau de bord
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Prêt à commencer ?</h2>
              <p className="text-indigo-100 text-sm mb-5">
                L&apos;inscription est gratuite. Évoluez vers un plan payant quand vous en avez besoin.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/inscription" className="rounded-xl bg-white text-indigo-700 font-semibold px-6 py-3 text-sm hover:bg-indigo-50 transition-colors shadow-sm">
                  Créer mon compte gratuitement
                </Link>
                <Link href="/connexion" className="rounded-xl border border-indigo-400 text-white font-semibold px-6 py-3 text-sm hover:bg-indigo-500 transition-colors">
                  Déjà inscrit ? Se connecter
                </Link>
              </div>
            </>
          )}
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

function PlanCard({
  emoji, title, badge, badgeColor, description, price, features, modulesData, cta, href, variant, highlight, planColor,
}: {
  emoji: string; title: string; badge: string; badgeColor: 'gray' | 'indigo' | 'purple'
  description: string; price: string; features: PlanFeatureRow[]
  modulesData?: { key: string; label: string; icon: string; enabled: boolean }[]
  cta: string; href: string
  variant: 'default' | 'indigo' | 'purple'; highlight?: boolean; planColor?: string
}) {
  // Allow any color from COLOR_MAP, fallback to variant
  const c = (planColor && COLOR_MAP[planColor]) ?? null

  const border = c ? c.border : variant === 'indigo' ? 'border-indigo-300' : variant === 'purple' ? 'border-purple-300' : 'border-gray-200'
  const bg     = c ? c.bg     : variant === 'indigo' ? 'bg-indigo-50'     : variant === 'purple' ? 'bg-purple-50'     : 'bg-white'
  const ring   = highlight ? 'ring-2 ring-indigo-300 ring-offset-1' : ''

  const badgeCls =
    badgeColor === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
    badgeColor === 'purple' ? 'bg-purple-100 text-purple-700' :
    'bg-gray-100 text-gray-600'

  const titleCls = c ? c.text : variant === 'indigo' ? 'text-indigo-900' : variant === 'purple' ? 'text-purple-900' : 'text-gray-900'
  const priceCls = c ? c.text : variant === 'indigo' ? 'text-indigo-700' : variant === 'purple' ? 'text-purple-700' : 'text-gray-700'
  const btnCls   =
    variant === 'purple' ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-sm' :
    variant === 'indigo' || (planColor && planColor !== 'gray') ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm' :
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

      {/* Modules section */}
      {modulesData && modulesData.length > 0 && (
        <div className="border-t border-gray-100 pt-2.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Outils inclus</p>
          <div className="flex flex-wrap gap-1">
            {modulesData.map(m => (
              <span
                key={m.key}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  m.enabled
                    ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
                    : 'border-gray-100 bg-white text-gray-300'
                }`}
              >
                <span>{m.icon}</span>
                <span className={m.enabled ? '' : 'line-through'}>{m.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
