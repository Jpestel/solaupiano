import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Désinscription — Sol au piano' }

export default async function DesinscriptionPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token || ''
  let done = false
  let alreadyOut = false

  if (token) {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { token } })
    if (sub) {
      if (sub.active) {
        await prisma.newsletterSubscriber.update({
          where: { token },
          data: { active: false, unsubscribedAt: new Date() },
        })
        done = true
      } else {
        alreadyOut = true
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">{done || alreadyOut ? '👋' : '⚠️'}</div>
        {done && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Vous êtes désinscrit·e</h1>
            <p className="mt-2 text-sm text-gray-500">Vous ne recevrez plus la newsletter de Sol au piano. Vous pouvez vous réinscrire à tout moment.</p>
          </>
        )}
        {alreadyOut && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Déjà désinscrit·e</h1>
            <p className="mt-2 text-sm text-gray-500">Cette adresse ne reçoit déjà plus la newsletter.</p>
          </>
        )}
        {!done && !alreadyOut && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Lien invalide</h1>
            <p className="mt-2 text-sm text-gray-500">Ce lien de désinscription n&apos;est plus valide. Utilisez le lien en bas d&apos;un email récent.</p>
          </>
        )}
        <Link href="/" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
