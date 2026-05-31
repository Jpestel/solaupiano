'use client'

import { useState, useEffect, useCallback } from 'react'

interface OrphanFile {
  path: string
  name: string
  sizeBytes: number
  mtime: string
  category: string
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} Mo`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} Go`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CAT_LABEL: Record<string, string> = {
  ressources: '🎵 Ressources / séquences',
  covers: '🖼 Couvertures',
  avatars: '👤 Avatars',
  'group-pages': '🌐 Pages publiques',
  tutoriels: '🎬 Tutoriels',
}

export default function AdminFichiersPage() {
  const [orphans, setOrphans] = useState<OrphanFile[]>([])
  const [totalBytes, setTotalBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/fichiers')
    if (res.ok) {
      const d = await res.json()
      setOrphans(d.orphans)
      setTotalBytes(d.totalBytes)
      setSelected(new Set())
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = (p: string) => setSelected((s) => {
    const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n
  })
  const allSelected = orphans.length > 0 && selected.size === orphans.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(orphans.map((o) => o.path)))

  const selectedBytes = orphans.filter((o) => selected.has(o.path)).reduce((a, o) => a + o.sizeBytes, 0)

  const purge = async (paths: string[]) => {
    if (paths.length === 0) return
    if (!confirm(`Supprimer définitivement ${paths.length} fichier(s) du serveur ? Cette action est irréversible.`)) return
    setDeleting(true); setMessage('')
    const res = await fetch('/api/admin/fichiers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
    setDeleting(false)
    if (res.ok) {
      const d = await res.json()
      setMessage(`✅ ${d.deleted} fichier(s) supprimé(s) — ${fmtBytes(d.freedBytes)} libérés.`)
      load()
    } else {
      setMessage('❌ Erreur lors de la suppression.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichiers orphelins</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Fichiers présents sur le serveur mais qui ne sont plus rattachés à aucun contenu en base
            (séquelles d'anciennes suppressions). Vous pouvez les supprimer définitivement pour libérer de l'espace.
          </p>
        </div>
        <button onClick={load} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          ↻ Actualiser
        </button>
      </div>

      {message && <div className="my-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2 text-sm text-indigo-700">{message}</div>}

      {loading ? (
        <p className="text-gray-500 py-10">Analyse des fichiers…</p>
      ) : orphans.length === 0 ? (
        <div className="text-center py-16 text-gray-400 rounded-xl border border-dashed border-gray-200 mt-4">
          <p className="text-4xl mb-2">✨</p>
          <p className="font-medium text-gray-500">Aucun fichier orphelin. Le stockage est propre.</p>
        </div>
      ) : (
        <>
          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap my-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              <strong>{orphans.length}</strong> fichier(s) orphelin(s) · <strong>{fmtBytes(totalBytes)}</strong> récupérables
              {selected.size > 0 && <span className="text-indigo-600"> · {selected.size} sélectionné(s) ({fmtBytes(selectedBytes)})</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => purge(Array.from(selected))}
                disabled={deleting || selected.size === 0}
                className="rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-3 py-1.5 disabled:opacity-40"
              >
                Supprimer la sélection
              </button>
              <button
                onClick={() => purge(orphans.map((o) => o.path))}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold px-3 py-1.5 disabled:opacity-40"
              >
                Tout supprimer
              </button>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Fichier</th>
                  <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-3 py-2 text-right font-medium">Taille</th>
                  <th className="px-3 py-2 text-right font-medium">Modifié</th>
                  <th className="px-3 py-2 text-right font-medium">Aperçu</th>
                </tr>
              </thead>
              <tbody>
                {orphans.map((o) => (
                  <tr key={o.path} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(o.path)} onChange={() => toggle(o.path)} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700 truncate max-w-[280px]" title={o.name}>{o.name}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{CAT_LABEL[o.category] || o.category}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600 whitespace-nowrap">{fmtBytes(o.sizeBytes)}</td>
                    <td className="px-3 py-2 text-right text-gray-400 whitespace-nowrap">{fmtDate(o.mtime)}</td>
                    <td className="px-3 py-2 text-right">
                      <a href={o.path} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs">ouvrir ↗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
