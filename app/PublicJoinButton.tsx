'use client'

import { useRouter } from 'next/navigation'

interface Props {
  groupId: number
  groupName: string
}

export function PublicJoinButton({ groupId, groupName }: Props) {
  const router = useRouter()

  const handleClick = () => {
    // Visiteur non connecté : on l'amène à s'inscrire (choix de l'instrument),
    // puis il pourra demander à rejoindre un groupe public depuis « Mes groupes ».
    router.push(`/inscription?callbackUrl=%2Fgroupes`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
    >
      Demander à rejoindre
    </button>
  )
}
