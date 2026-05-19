'use client'

import { useRouter } from 'next/navigation'

interface Props {
  groupId: number
  groupName: string
}

export function PublicJoinButton({ groupId, groupName }: Props) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/connexion?callbackUrl=%2Fgroupes`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
    >
      Rejoindre ce groupe
    </button>
  )
}
