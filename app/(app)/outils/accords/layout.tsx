import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'

export default async function AccordsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')

  const userId = Number(session.user.id)
  const ok = await hasModuleAccess(userId, 'tool_accords')
  if (!ok) redirect('/tableau-de-bord?module_bloque=Créateur+d%27accords')

  return <>{children}</>
}
