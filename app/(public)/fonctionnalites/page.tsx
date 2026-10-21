import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GROUP_FEATURES } from '@/lib/features'
import { MODULES } from '@/lib/modules'

export const metadata = {
  title: 'Fonctionnalités — Sol au piano',
  description: 'Tout ce que Sol au piano offre aux groupes et aux musiciens, gratuitement.',
}

// Les outils autonomes (accordeur, métronome, transposition…) : tout ce qui n'est pas
// une fonctionnalité de groupe du registre. Lu depuis le registre pour ne jamais diverger.
const OUTILS = MODULES.filter((m) => m.category === 'outil')

function Carte({ icon, label, description }: { icon: string; label: string; description: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
    </div>
  )
}

export default async function FonctionnalitesPage() {
  const session = await getServerSession(authOptions)
  const isLoggedIn = !!session

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 flex-shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-base">🎹</span>
            </div>
            <div className="hidden flex-col leading-none sm:flex">
              <span className="text-base font-bold text-indigo-900">Sol au piano</span>
              <span className="text-[10px] font-normal italic text-indigo-400">du solo à l&apos;orchestre</span>
            </div>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link href="/aide" className="hidden text-sm font-medium text-gray-500 transition-colors hover:text-indigo-600 md:block">Aide</Link>
            {isLoggedIn ? (
              <Link href="/tableau-de-bord" className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:px-4">
                ← Tableau de bord
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-indigo-600 sm:block">Se connecter</Link>
                <Link href="/demander-acces" className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:px-4">
                  Demander un accès
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:px-6 sm:py-12">
          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-4xl">
            Tout ce que vous pouvez <span className="text-indigo-600">faire</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500 sm:text-lg">
            Un seul compte pour jouer, organiser son groupe ou enseigner.
          </p>
          <p className="mt-4 inline-block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            <strong>Tout est gratuit.</strong> Sol au piano est un projet personnel sans but lucratif,
            accessible sur invitation.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Pour votre groupe ou votre classe</h2>
            <p className="mt-1 text-sm text-gray-500">
              Répétitions, présences et répertoire sont toujours là ; voici le reste.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Carte icon="🎵" label="Répétitions & présences" description="Planifier les répétitions, suivre qui vient, rappeler la date par e-mail." />
            <Carte icon="🎼" label="Répertoire" description="Tous vos morceaux au même endroit, avec leurs partitions, liens et enregistrements." />
            {GROUP_FEATURES.map((f) => (
              <Carte key={f.key} icon={f.icon} label={f.label} description={f.description} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Des outils pour tous les musiciens</h2>
            <p className="mt-1 text-sm text-gray-500">Utilisables seul, sans groupe.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OUTILS.map((m) => (
              <Carte key={m.key} icon={m.icon} label={m.label} description={m.description} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-indigo-600 px-5 py-8 text-center text-white sm:py-10">
          {isLoggedIn ? (
            <>
              <h2 className="mb-2 text-xl font-bold sm:text-2xl">Une fonctionnalité vous manque ?</h2>
              <p className="mb-5 text-sm text-indigo-100">
                Certaines fonctionnalités peuvent être activées groupe par groupe. Écrivez à l&apos;éditeur si
                vous souhaitez en utiliser une qui n&apos;apparaît pas chez vous.
              </p>
              <Link href="/tableau-de-bord" className="inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50">
                ← Tableau de bord
              </Link>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-xl font-bold sm:text-2xl">Envie de nous rejoindre ?</h2>
              <p className="mb-5 text-sm text-indigo-100">
                L&apos;accès se fait sur invitation. Si personne ne vous a invité, demandez un accès à l&apos;éditeur.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/demander-acces" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50">
                  Demander un accès
                </Link>
                <Link href="/connexion" className="rounded-xl border border-indigo-400 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
                  Déjà inscrit ? Se connecter
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        <Link href="/mentions-legales" className="hover:text-indigo-600">Mentions légales</Link>
      </footer>
    </div>
  )
}
