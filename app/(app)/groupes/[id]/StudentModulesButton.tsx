'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { GROUP_MODULES } from '@/lib/group-modules'

// Bouton réservé au professeur (école) : choisir les modules visibles par les élèves.
export function StudentModulesButton({ groupId, initial }: { groupId: number; initial: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(initial)
  const [saving, setSaving] = useState(false)

  const toggle = (href: string) => {
    setSelected((prev) => prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href])
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/groupes/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentModules: selected }),
    })
    setSaving(false)
    if (res.ok) { setOpen(false); router.refresh() }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
        title="Choisir les modules visibles par les élèves"
      >
        👁 Modules élèves
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Modules visibles par les élèves">
        <p className="text-sm text-gray-500 mb-4">
          Cochez les modules accessibles à vos élèves. Les autres ne leur apparaîtront pas.
          <span className="block text-xs text-gray-400 mt-1">Vous (professeur) gardez toujours accès à tout.</span>
        </p>
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
          {GROUP_MODULES.map((m) => {
            const on = selected.includes(m.href)
            return (
              <label key={m.href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(m.href)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-800">{m.label}</span>
              </label>
            )
          })}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </Modal>
    </>
  )
}
