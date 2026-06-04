import Link from 'next/link'
import { NewsletterSignup } from '@/components/NewsletterSignup'

export const metadata = { title: 'Newsletter — Sol au piano' }

export default function NewsletterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">📬</div>
          <h1 className="text-2xl font-bold text-gray-900">La newsletter Sol au piano</h1>
          <p className="mt-2 text-sm text-gray-500">
            Nouveautés de la plateforme, astuces pour les groupes, conseils musicaux… directement dans votre boîte mail.
            <br />Ouverte à tous, aucun compte nécessaire.
          </p>
        </div>
        <div className="flex justify-center">
          <NewsletterSignup />
        </div>
        <p className="mt-5 text-center text-xs text-gray-400">
          Pour vous désinscrire, utilisez le lien en bas de n&apos;importe quel email reçu.
        </p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  )
}
