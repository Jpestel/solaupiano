'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Bubble {
  id: number
  path: string
  title: string
  content: string
  emoji: string
  color: string
  audience: string
  active: boolean
}

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: 'Tout le monde', MEMBERS: 'Membres', CHEFS: 'Chefs', ADMINS: 'Admins',
}

export default function AdminBullesPage() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/bulles?all=1')
    if (res.ok) setBubbles(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const toggleActive = async (b: Bubble) => {
    await fetch(`/api/bulles/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !b.active }) })
    load()
  }
  const del = async (id: number) => {
    if (!confirm('Supprimer cette bulle ?')) return
    await fetch(`/api/bulles/${id}`, { method: 'DELETE' })
    load()
  }

  const byPath = bubbles.reduce<Record<string, Bubble[]>>((acc, b) => {
    (acc[b.path] ||= []).push(b)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">💡 Bulles d&apos;aide</h1>
      <p className="text-gray-500 text-sm mb-5">Créez et positionnez des astuces directement sur les pages de l&apos;application pour guider vos utilisateurs.</p>

      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold mb-1">Comment ajouter une bulle ?</p>
        <ol className="list-decimal pl-5 space-y-0.5 text-indigo-800">
          <li>Allez sur la page de l&apos;application où vous voulez guider l&apos;utilisateur.</li>
          <li>En bas à gauche, cliquez sur <strong>« 💡 Bulles »</strong> puis <strong>« ＋ Ajouter ici »</strong>.</li>
          <li>Cliquez à l&apos;endroit voulu sur la page : un formulaire s&apos;ouvre (titre, texte, icône, couleur, audience).</li>
          <li>Une fois posée, vous pouvez la <strong>glisser</strong> pour la repositionner, ou cliquer dessus pour la modifier.</li>
        </ol>
        <p className="mt-2 text-indigo-700">Cette page liste toutes les bulles existantes. Le bouton « 💡 Bulles » est disponible partout dans l&apos;espace connecté.</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : bubbles.length === 0 ? (
        <p className="text-gray-400 text-sm rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">Aucune bulle pour l&apos;instant. Rendez-vous sur une page et utilisez « 💡 Bulles » en bas à gauche.</p>
      ) : (
        <div className="space-y-5">
          {Object.entries(byPath).map(([path, list]) => (
            <div key={path} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <code className="text-xs font-semibold text-gray-700">{path}</code>
                <Link href={path} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Aller positionner →</Link>
              </div>
              <ul className="divide-y divide-gray-50">
                {list.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-lg flex-shrink-0">{b.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.title || <span className="text-gray-400">(sans titre)</span>}</p>
                      <p className="text-xs text-gray-500 truncate">{b.content}</p>
                    </div>
                    <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{AUDIENCE_LABEL[b.audience] || b.audience}</span>
                    <button onClick={() => toggleActive(b)} className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => del(b.id)} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Supprimer</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
