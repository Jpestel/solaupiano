import Link from 'next/link'
import { DemandeAccesForm } from './DemandeAccesForm'

export const metadata = {
  title: 'Demander un accès — Sol au piano',
  description: "Sol au piano est un projet personnel gratuit, accessible sur invitation.",
}

export default function DemanderAccesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l&apos;accueil
          </Link>
        </div>

        <div className="mb-6 text-center">
          <Link href="/" className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg transition-colors hover:bg-indigo-500">
            <span className="text-2xl">🎹</span>
          </Link>
          <h1 className="text-2xl font-bold text-indigo-900">Demander un accès</h1>
          <p className="mt-0.5 text-sm italic text-indigo-400">du solo à l&apos;orchestre</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3.5">
            <p className="text-sm leading-relaxed text-indigo-900">
              Sol au piano est un <strong>projet personnel, gratuit et sans but lucratif</strong>.
              L&apos;accès se fait sur invitation.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-indigo-800">
              Si un chef d&apos;orchestre ou un professeur vous a invité, vous n&apos;avez rien à demander ici :
              ouvrez simplement le lien reçu par email, il vous mènera directement à son groupe.
            </p>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            Sinon, présentez-vous en quelques mots : l&apos;éditeur vous répondra personnellement.
          </p>

          <DemandeAccesForm />
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="text-indigo-600 hover:underline">Se connecter</Link>
          {' · '}
          <Link href="/mentions-legales" className="text-indigo-600 hover:underline">Mentions légales</Link>
        </p>
      </div>
    </div>
  )
}
