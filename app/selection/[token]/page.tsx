import type { Metadata } from 'next'
import { sharedSelection } from '@/lib/reprises-partage'
import { Selection } from './Selection'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Partitions partagées', robots: { index: false, follow: false } }

export default async function SelectionPartagee({ params }: { params: { token: string } }) {
  const sel = await sharedSelection(params.token)
  if (!sel || sel.scores.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">Ce lien n&apos;est plus valide</p>
          <p className="mt-1 text-sm text-gray-500">Le partage a été arrêté ou le lien est incorrect. Demandez-en un nouveau à la personne qui vous l&apos;a envoyé.</p>
        </div>
      </main>
    )
  }
  return <Selection token={params.token} name={sel.name} scores={sel.scores} />
}
