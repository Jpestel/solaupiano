import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export const metadata = {
  title: "Centre d'aide — Sol au piano",
  description: "Tout ce qu'il faut savoir pour utiliser Sol au piano : groupes, répétitions, concerts, répertoire, setlists, grilles d'accords.",
}

export default async function AideLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header public */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href={session ? '/tableau-de-bord' : '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">🎹</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-base">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </Link>

          {session ? (
            <Link
              href="/tableau-de-bord"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tableau de bord
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/connexion"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Se connecter
              </Link>
              <Link href="/inscription"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                S&apos;inscrire
              </Link>
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28">
          {children}
        </div>
      </main>
    </div>
  )
}
