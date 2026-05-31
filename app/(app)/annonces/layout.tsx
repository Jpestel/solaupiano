import { guardAnnonces } from '@/lib/guard-annonces'

export const dynamic = 'force-dynamic'

export default async function AppAnnoncesLayout({ children }: { children: React.ReactNode }) {
  await guardAnnonces()
  return <>{children}</>
}
