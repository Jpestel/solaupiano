import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'

export default async function WavMp3Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/connexion')

  const userId = Number(session.user.id)
  const ok = await hasModuleAccess(userId, 'tool_wav2mp3')
  if (!ok) redirect('/tableau-de-bord?module_bloque=WAV → MP3')

  return <>{children}</>
}
