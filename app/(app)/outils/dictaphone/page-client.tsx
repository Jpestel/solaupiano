'use client'

import { useState } from 'react'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { TutorialButton } from '@/components/ui/TutorialButton'

interface GroupOption {
  id: number
  name: string
}

export function DictaphonePageClient({ groups }: { groups: GroupOption[] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id ? String(groups[0].id) : '')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-rose-600">Outil audio personnel</p>
          <h1 className="text-3xl font-black text-gray-900">Dictaphone</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Enregistrez rapidement une idée, un passage travaillé ou une prise de répétition.
            Les enregistrements restent privés et accessibles dans le groupe choisi.
          </p>
        </div>
        <TutorialButton moduleKey="tool_voice_recorder" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">Vous devez appartenir à un groupe pour utiliser le dictaphone.</p>
        ) : (
          <>
            <label className="mb-2 block text-sm font-bold text-gray-700">Groupe</label>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="mb-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>

            {groupId && (
              <div className="relative min-h-44 rounded-xl border border-rose-100 bg-rose-50 p-4">
                <p className="mb-3 text-sm text-rose-800">
                  Cliquez sur le bouton ci-dessous pour ouvrir le panneau d'enregistrement.
                </p>
                <VoiceRecorder groupId={groupId} source="GENERAL" contextTitle="Dictaphone" compact />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
