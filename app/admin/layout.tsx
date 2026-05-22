import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminLayoutClient } from './AdminLayoutClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.siteRole !== 'ADMIN') {
    redirect('/tableau-de-bord')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
