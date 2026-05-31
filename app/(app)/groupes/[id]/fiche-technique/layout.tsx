import { guardGroupFeature } from '@/lib/group-feature'

export default async function FicheTechniqueLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasFicheTechnique')
  return <>{children}</>
}
