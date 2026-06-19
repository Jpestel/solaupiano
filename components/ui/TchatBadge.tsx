'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = (gid: string) => `tchat_last_read_${gid}`

export function TchatBadge({ groupId }: { groupId: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const lastRead = localStorage.getItem(STORAGE_KEY(groupId))
    if (!lastRead) return // jamais ouvert — pas de badge pour éviter de stresser les nouveaux membres

    fetch(`/api/groupes/${groupId}/messages?limit=1`)
      .then(r => r.json())
      .then((data: { createdAt: string }[]) => {
        if (!data.length) return
        const lastMsg = new Date(data[data.length - 1].createdAt).getTime()
        if (lastMsg > Number(lastRead)) setCount(1) // au moins 1 nouveau
      })
      .catch(() => {})
  }, [groupId])

  if (!count) return null

  return (
    <span className="absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" />
  )
}
