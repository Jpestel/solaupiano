import { guardGroupFeature } from '@/lib/group-feature'

export default async function SequencesLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasSequences')
  return <>{children}</>
}
