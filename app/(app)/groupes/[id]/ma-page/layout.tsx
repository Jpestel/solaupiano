import { guardGroupFeature } from '@/lib/group-feature'

export default async function MaPageLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasMaPage')
  return <>{children}</>
}
