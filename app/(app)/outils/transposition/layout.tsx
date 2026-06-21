import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'

export default async function TranspositionLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')

  const ok = await hasModuleAccess(Number(session.user.id), 'tool_transposition')
  if (!ok) redirect('/tableau-de-bord?module_bloque=Transposition')

  return <>{children}</>
}
