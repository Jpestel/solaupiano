'use client'

import { useState, useEffect, useCallback } from 'react'
import { FichiersTabs } from './FichiersTabs'

interface FileRow { label: string; name: string; type: string; sizeBytes: number; path: string; createdAt: string | null }
interface GroupBlock { groupId: number; groupName: string; files: FileRow[]; totalBytes: number }
interface OtherBlock { category: string; files: FileRow[]; totalBytes: number }
interface Data { groups: GroupBlock[]; others: OtherBlock[]; totals: { groupBytes: number; otherBytes: number; allBytes: number } }

function fmtBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} Mo`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} Go`
}
function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

const TYPE_BADGE: Record<string, string> = {
  PDF: 'bg-red-50 text-red-600 border-red-200',
  AUDIO: 'bg-green-50 text-green-700 border-green-200',
  MIDI: 'bg-purple-50 text-purple-700 border-purple-200',
  VIDEO: 'bg-blue-50 text-blue-700 border-blue-200',
  IMAGE: 'bg-amber-50 text-amber-700 border-amber-200',
}

function FileTable({ files }: { files: FileRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-gray-400">
          <tr>
            <th className="text-left font-medium px-3 py-1.5">Associé à</th>
            <th className="text-left font-medium px-3 py-1.5">Fichier</th>
            <th className="text-left font-medium px-3 py-1.5">Type</th>
            <th className="text-right font-medium px-3 py-1.5">Taille</th>
            <th className="text-right font-medium px-3 py-1.5">Ajouté</th>
            <th className="px-3 py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{f.label}</td>
              <td className="px-3 py-1.5 text-gray-500 truncate max-w-[200px]" title={f.name}>{f.name}</td>
              <td className="px-3 py-1.5">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[f.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{f.type}</span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 whitespace-nowrap">{f.sizeBytes ? fmtBytes(f.sizeBytes) : '—'}</td>
              <td className="px-3 py-1.5 text-right text-gray-400 whitespace-nowrap">{fmtDate(f.createdAt)}</td>
              <td className="px-3 py-1.5 text-right"><a href={f.path} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs">ouvrir ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminAllFilesPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/fichiers/tous')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = (id: number) => setOpenGroups((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div>
      <FichiersTabs />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tous les fichiers</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Vue d&apos;ensemble des fichiers uploadés, classés par groupe, avec le contenu auquel ils sont rattachés
            (morceau, carnet, page…). Pratique pour évaluer l&apos;utilisation de la plateforme.
          </p>
        </div>
        <button onClick={load} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">↻ Actualiser</button>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Chargement…</p>
      ) : !data ? (
        <p className="text-gray-500 py-8">Erreur de chargement.</p>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">{fmtBytes(data.totals.allBytes)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-400">Dans les groupes</p>
              <p className="text-lg font-bold text-gray-900">{fmtBytes(data.totals.groupBytes)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-400">Hors groupe</p>
              <p className="text-lg font-bold text-gray-900">{fmtBytes(data.totals.otherBytes)}</p>
            </div>
          </div>

          {data.groups.length === 0 && data.others.length === 0 && (
            <div className="text-center py-16 text-gray-400 rounded-xl border border-dashed border-gray-200">
              <p className="text-4xl mb-2">📁</p><p className="font-medium text-gray-500">Aucun fichier uploadé pour le moment.</p>
            </div>
          )}

          {/* Par groupe */}
          <div className="space-y-2">
            {data.groups.map((g) => {
              const isOpen = openGroups.has(g.groupId)
              return (
                <div key={g.groupId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button onClick={() => toggle(g.groupId)} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                    <span className="font-semibold text-gray-900">🎵 {g.groupName}</span>
                    <span className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{g.files.length} fichier{g.files.length > 1 ? 's' : ''}</span>
                      <span className="font-medium text-gray-700">{fmtBytes(g.totalBytes)}</span>
                      <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  {isOpen && <div className="border-t border-gray-100 pb-2"><FileTable files={g.files} /></div>}
                </div>
              )
            })}
          </div>

          {/* Hors groupe */}
          {data.others.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Hors groupe</h2>
              <div className="space-y-2">
                {data.others.map((o) => (
                  <div key={o.category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <span className="font-semibold text-gray-700">{o.category}</span>
                      <span className="text-sm text-gray-500">{o.files.length} · {fmtBytes(o.totalBytes)}</span>
                    </div>
                    <div className="pb-2"><FileTable files={o.files} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
