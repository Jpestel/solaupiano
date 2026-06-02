import { guardGroupFeature } from '@/lib/group-feature'

export default async function FeatureLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasUnavailabilities')
  return <>{children}</>
}
