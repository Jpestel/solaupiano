import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JoinConfirm } from './JoinConfirm'

export const dynamic = 'force-dynamic'

export default async function RejoindrePage({ params }: { params: { token: string } }) {
  const { token } = params
  const callbackUrl = `/rejoindre/${token}`

  const [group, session] = await Promise.all([
    prisma.group.findUnique({
      where: { inviteToken: token },
      select: { id: true, name: true, type: true, archivedAt: true, _count: { select: { members: true } } },
    }),
    getServerSession(authOptions),
  ])

  const isSchool = group?.type === 'SCHOOL'

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-8">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg hover:bg-indigo-500 transition-colors">
          <span className="text-2xl">🎹</span>
        </Link>
        <h1 className="text-2xl font-bold text-indigo-900">Sol au piano</h1>
        <p className="text-indigo-400 text-sm italic mt-0.5 mb-6">du solo à l&apos;orchestre</p>
        <div className="bg-white rounded-2xl shadow-xl p-8">{children}</div>
      </div>
    </div>
  )

  // Lien invalide / expiré / groupe archivé
  if (!group || group.archivedAt) {
    return (
      <Shell>
        <p className="text-4xl mb-3">🔗</p>
        <h2 className="text-lg font-semibold text-gray-900">Lien d&apos;invitation invalide</h2>
        <p className="text-sm text-gray-500 mt-2">
          Ce lien n&apos;est plus valide ou a été régénéré. Demandez un nouveau lien à la personne qui vous a invité·e.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">← Retour à l&apos;accueil</Link>
      </Shell>
    )
  }

  const intro = (
    <>
      <p className="text-4xl mb-3">{isSchool ? '🎓' : '🎵'}</p>
      <h2 className="text-lg font-semibold text-gray-900">
        Vous êtes invité·e à rejoindre {isSchool ? 'la classe' : 'le groupe'}
      </h2>
      <p className="mt-1 text-xl font-bold text-indigo-700">{group.name}</p>
      <p className="text-xs text-gray-400 mt-1">
        {group._count.members} {isSchool ? 'élève' : 'membre'}{group._count.members > 1 ? 's' : ''}
      </p>
    </>
  )

  // Pas connecté : proposer connexion / inscription en conservant le retour ici
  if (!session) {
    return (
      <Shell>
        {intro}
        <p className="text-sm text-gray-500 mt-4">
          Connectez-vous ou créez votre compte (gratuit) pour rejoindre {isSchool ? 'cette classe' : 'ce groupe'}.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href={`/inscription?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Créer mon compte gratuitement
          </Link>
        </div>
      </Shell>
    )
  }

  // Admin site : ne peut pas être membre
  if (session.user.siteRole === 'ADMIN') {
    return (
      <Shell>
        {intro}
        <p className="text-sm text-gray-500 mt-4">
          Vous êtes connecté·e en tant qu&apos;administrateur du site, qui ne peut pas rejoindre de groupe.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">← Retour à l&apos;accueil</Link>
      </Shell>
    )
  }

  // Déjà membre ?
  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId: group.id } },
    select: { groupId: true },
  })
  if (existing) {
    return (
      <Shell>
        {intro}
        <p className="text-sm text-green-600 mt-4">✅ Vous faites déjà partie de {isSchool ? 'cette classe' : 'ce groupe'}.</p>
        <Link
          href={`/groupes/${group.id}`}
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Ouvrir {isSchool ? 'la classe' : 'le groupe'} →
        </Link>
      </Shell>
    )
  }

  // Connecté, non membre : bouton de confirmation
  return (
    <Shell>
      {intro}
      <JoinConfirm token={token} isSchool={isSchool} />
    </Shell>
  )
}
