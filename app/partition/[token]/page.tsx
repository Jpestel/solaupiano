import type { Metadata } from 'next'
import { sharedScore } from '@/lib/reprises-partage'
import { Viewer } from '../Viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Partition partagée', robots: { index: false, follow: false } }

export default async function PartitionPartagee({ params }: { params: { token: string } }) {
  const score = await sharedScore(params.token)
  if (!score) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">Ce lien n&apos;est plus valide</p>
          <p className="mt-1 text-sm text-gray-500">Le partage a été arrêté ou le lien est incorrect. Demandez-en un nouveau à la personne qui vous l&apos;a envoyé.</p>
        </div>
      </main>
    )
  }
  return <Viewer token={params.token} scores={[score]} />
}
