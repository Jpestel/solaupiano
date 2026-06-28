'use client'

import { useState } from 'react'
import { InvitePanel } from './[id]/InvitePanel'

export function QuickInvite({ groupId, groupName }: { groupId: number; groupName: string }) {
  const [open, setOpen] = useState(false)

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
  const close = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-2 text-xs font-semibold text-indigo-600 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 sm:absolute sm:bottom-3 sm:right-3 sm:z-10 sm:mt-0 sm:w-auto sm:py-1"
        title="Inviter un musicien dans ce groupe"
      >
        ➕ Inviter
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={close}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">➕ Inviter un musicien</h3>
                <p className="text-xs text-gray-500 mt-0.5">Groupe : <strong>{groupName}</strong></p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <InvitePanel groupId={groupId} />
          </div>
        </div>
      )}
    </>
  )
}
