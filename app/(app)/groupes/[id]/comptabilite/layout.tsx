import { guardGroupFeature } from '@/lib/group-feature'

export default async function ComptabiliteLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await guardGroupFeature(Number(params.id), 'hasAccounting')
  return <>{children}</>
}
