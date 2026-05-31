import { guardGroupFeature } from '@/lib/group-feature'

export default async function GrillesLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasGrilles')
  return <>{children}</>
}
